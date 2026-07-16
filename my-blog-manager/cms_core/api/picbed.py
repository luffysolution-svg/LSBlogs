import base64
import hashlib
import hmac
import json
import mimetypes
import time
import uuid
from copy import deepcopy
from datetime import datetime
from email.utils import formatdate
from pathlib import Path
from urllib.parse import quote, urlencode, urlparse

import httpx
from fastapi import APIRouter, Body, File, UploadFile

from cms_core.api.sync import MANAGER_ROOT


router = APIRouter()

CONFIG_FILE = MANAGER_ROOT / "manager_data" / "picbed_config.json"
PROVIDERS = {"lsky", "tencent", "aliyun", "github"}
SECRET_FIELDS = {
    "lsky": ("token",),
    "tencent": ("secretId", "secretKey"),
    "aliyun": ("accessKeyId", "accessKeySecret"),
    "github": ("token",),
}
DEFAULT_CONFIG = {
    "provider": "lsky",
    "pathPrefix": "uploads",
    "lsky": {"url": "", "token": ""},
    "tencent": {
        "secretId": "",
        "secretKey": "",
        "region": "ap-guangzhou",
        "bucket": "",
        "domain": "",
    },
    "aliyun": {
        "accessKeyId": "",
        "accessKeySecret": "",
        "endpoint": "oss-cn-hangzhou.aliyuncs.com",
        "bucket": "",
        "domain": "",
    },
    "github": {
        "token": "",
        "owner": "",
        "repo": "",
        "branch": "main",
        "domain": "",
    },
}


class PicBedError(RuntimeError):
    pass


def _read_config() -> dict:
    config = deepcopy(DEFAULT_CONFIG)
    if CONFIG_FILE.is_file():
        try:
            saved = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
            if isinstance(saved, dict):
                config = _merge_config(config, saved, preserve_secrets=False)
        except (OSError, json.JSONDecodeError):
            pass
    return config


def _merge_config(base: dict, incoming: dict, preserve_secrets: bool = True) -> dict:
    merged = deepcopy(base)
    provider = str(incoming.get("provider", merged["provider"]))
    if provider in PROVIDERS:
        merged["provider"] = provider
    if "pathPrefix" in incoming:
        merged["pathPrefix"] = str(incoming.get("pathPrefix", "")).strip(" /\\")

    for name in PROVIDERS:
        values = incoming.get(name)
        if not isinstance(values, dict):
            continue
        for key in merged[name]:
            if key not in values:
                continue
            value = str(values.get(key, "")).strip()
            if preserve_secrets and key in SECRET_FIELDS[name] and not value:
                continue
            merged[name][key] = value
    return merged


def _public_config(config: dict) -> dict:
    public = deepcopy(config)
    has_secrets: dict[str, dict[str, bool]] = {}
    for provider, fields in SECRET_FIELDS.items():
        has_secrets[provider] = {}
        for field in fields:
            has_secrets[provider][field] = bool(public[provider].get(field))
            public[provider][field] = ""
    public["hasSecrets"] = has_secrets
    return public


def _save_config(config: dict) -> None:
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")


def _provider_config(config: dict) -> tuple[str, dict]:
    provider = str(config.get("provider", ""))
    if provider not in PROVIDERS:
        raise PicBedError("不支持的图床类型")
    return provider, config[provider]


def _require(values: dict, *fields: str) -> None:
    missing = [field for field in fields if not str(values.get(field, "")).strip()]
    if missing:
        raise PicBedError(f"请填写完整配置：{', '.join(missing)}")


def _object_key(config: dict, filename: str | None, content_type: str | None) -> str:
    suffix = Path(filename or "").suffix.lower()
    if not suffix:
        suffix = mimetypes.guess_extension(content_type or "") or ".bin"
    if len(suffix) > 10 or not suffix.replace(".", "").isalnum():
        suffix = ".bin"
    date_path = datetime.now().strftime("%Y/%m")
    name = f"{uuid.uuid4().hex}{suffix}"
    prefix = str(config.get("pathPrefix", "")).strip(" /\\")
    return "/".join(part for part in (prefix, date_path, name) if part)


def _public_url(domain: str, fallback_base: str, key: str) -> str:
    base = (domain or fallback_base).strip().rstrip("/")
    return f"{base}/{quote(key, safe='/-_.~')}"


async def _test_lsky(values: dict) -> str:
    _require(values, "url", "token")
    token = values["token"]
    if not token.startswith("Bearer "):
        token = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{values['url'].rstrip('/')}/api/v1/profile",
            headers={"Authorization": token, "Accept": "application/json"},
        )
    if response.status_code != 200:
        raise PicBedError(f"Lsky Pro 返回 HTTP {response.status_code}")
    data = response.json()
    if data.get("status") is not True:
        raise PicBedError(str(data.get("message") or "Token 无效"))
    return f"Lsky Pro 连接成功：{data.get('data', {}).get('email', '已认证')}"


async def _upload_lsky(values: dict, content: bytes, filename: str, content_type: str) -> str:
    _require(values, "url", "token")
    token = values["token"]
    if not token.startswith("Bearer "):
        token = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{values['url'].rstrip('/')}/api/v1/upload",
            headers={"Authorization": token, "Accept": "application/json"},
            files={"file": (filename, content, content_type)},
        )
    if response.status_code != 200:
        raise PicBedError(f"Lsky Pro 上传失败：HTTP {response.status_code}")
    data = response.json()
    url = data.get("data", {}).get("links", {}).get("url")
    if data.get("status") is not True or not url:
        raise PicBedError(str(data.get("message") or "Lsky Pro 未返回图片地址"))
    return str(url)


def _cos_request_parts(method: str, values: dict, key: str = "", query: dict | None = None) -> tuple[str, dict]:
    _require(values, "secretId", "secretKey", "region", "bucket")
    host = f"{values['bucket']}.cos.{values['region']}.myqcloud.com"
    path = f"/{quote(key, safe='/-_.~')}" if key else "/"
    query = query or {}
    canonical_query = "&".join(
        f"{quote(str(k).lower(), safe='-_.~')}={quote(str(v), safe='-_.~')}"
        for k, v in sorted(query.items())
    )
    parameter_names = ";".join(sorted(str(key).lower() for key in query))
    key_time = f"{int(time.time())};{int(time.time()) + 900}"
    http_string = f"{method.lower()}\n{path}\n{canonical_query}\nhost={host}\n"
    string_to_sign = f"sha1\n{key_time}\n{hashlib.sha1(http_string.encode()).hexdigest()}\n"
    sign_key = hmac.new(values["secretKey"].encode(), key_time.encode(), hashlib.sha1).hexdigest()
    signature = hmac.new(sign_key.encode(), string_to_sign.encode(), hashlib.sha1).hexdigest()
    authorization = (
        f"q-sign-algorithm=sha1&q-ak={values['secretId']}&q-sign-time={key_time}"
        f"&q-key-time={key_time}&q-header-list=host&q-url-param-list={parameter_names}"
        f"&q-signature={signature}"
    )
    query_string = f"?{urlencode(query)}" if query else ""
    return f"https://{host}{path}{query_string}", {"Authorization": authorization, "Host": host}


async def _test_tencent(values: dict) -> str:
    url, headers = _cos_request_parts("GET", values, query={"max-keys": "0"})
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, headers=headers)
    if response.status_code not in {200, 206}:
        raise PicBedError(f"腾讯云 COS 返回 HTTP {response.status_code}：{response.text[:160]}")
    return "腾讯云 COS 连接成功"


async def _upload_tencent(values: dict, key: str, content: bytes, content_type: str) -> str:
    url, headers = _cos_request_parts("PUT", values, key=key)
    headers["Content-Type"] = content_type
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.put(url, headers=headers, content=content)
    if response.status_code not in {200, 201}:
        raise PicBedError(f"腾讯云 COS 上传失败：HTTP {response.status_code} {response.text[:160]}")
    parsed = urlparse(url)
    fallback = f"{parsed.scheme}://{parsed.netloc}"
    return _public_url(values.get("domain", ""), fallback, key)


def _oss_host(values: dict) -> str:
    endpoint = str(values.get("endpoint", "")).strip().rstrip("/")
    if "://" in endpoint:
        endpoint = urlparse(endpoint).netloc
    bucket = str(values.get("bucket", "")).strip()
    return endpoint if endpoint.startswith(f"{bucket}.") else f"{bucket}.{endpoint}"


def _oss_headers(method: str, values: dict, key: str = "", content: bytes = b"", content_type: str = "") -> dict:
    _require(values, "accessKeyId", "accessKeySecret", "endpoint", "bucket")
    content_md5 = base64.b64encode(hashlib.md5(content).digest()).decode() if content else ""
    date_value = formatdate(usegmt=True)
    resource = f"/{values['bucket']}/{key}" if key else f"/{values['bucket']}/"
    string_to_sign = f"{method}\n{content_md5}\n{content_type}\n{date_value}\n{resource}"
    signature = base64.b64encode(
        hmac.new(values["accessKeySecret"].encode(), string_to_sign.encode(), hashlib.sha1).digest()
    ).decode()
    headers = {
        "Authorization": f"OSS {values['accessKeyId']}:{signature}",
        "Date": date_value,
    }
    if content_md5:
        headers["Content-MD5"] = content_md5
    if content_type:
        headers["Content-Type"] = content_type
    return headers


async def _test_aliyun(values: dict) -> str:
    host = _oss_host(values)
    headers = _oss_headers("GET", values)
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(f"https://{host}/?max-keys=0", headers=headers)
    if response.status_code not in {200, 206}:
        raise PicBedError(f"阿里云 OSS 返回 HTTP {response.status_code}：{response.text[:160]}")
    return "阿里云 OSS 连接成功"


async def _upload_aliyun(values: dict, key: str, content: bytes, content_type: str) -> str:
    host = _oss_host(values)
    headers = _oss_headers("PUT", values, key=key, content=content, content_type=content_type)
    url = f"https://{host}/{quote(key, safe='/-_.~')}"
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.put(url, headers=headers, content=content)
    if response.status_code not in {200, 201}:
        raise PicBedError(f"阿里云 OSS 上传失败：HTTP {response.status_code} {response.text[:160]}")
    return _public_url(values.get("domain", ""), f"https://{host}", key)


def _github_headers(values: dict) -> dict:
    _require(values, "token", "owner", "repo", "branch")
    return {
        "Authorization": f"Bearer {values['token']}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "LSBlogs-Local-Manager",
    }


async def _test_github(values: dict) -> str:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"https://api.github.com/repos/{values.get('owner')}/{values.get('repo')}",
            headers=_github_headers(values),
        )
    if response.status_code != 200:
        raise PicBedError(f"GitHub 返回 HTTP {response.status_code}：{response.text[:160]}")
    return f"GitHub 仓库连接成功：{values['owner']}/{values['repo']}"


async def _upload_github(values: dict, key: str, content: bytes) -> str:
    headers = _github_headers(values)
    api_url = f"https://api.github.com/repos/{values['owner']}/{values['repo']}/contents/{quote(key, safe='/-_.~')}"
    body = {
        "message": f"Upload image {key}",
        "content": base64.b64encode(content).decode(),
        "branch": values["branch"],
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.put(api_url, headers=headers, json=body)
    if response.status_code not in {200, 201}:
        raise PicBedError(f"GitHub 上传失败：HTTP {response.status_code} {response.text[:160]}")
    if values.get("domain"):
        return _public_url(values["domain"], values["domain"], key)
    return f"https://raw.githubusercontent.com/{values['owner']}/{values['repo']}/{values['branch']}/{quote(key, safe='/-_.~')}"


@router.get("/config")
def get_picbed_config():
    return {"success": True, "data": _public_config(_read_config())}


@router.post("/config")
def save_picbed_config(payload: dict = Body(...)):
    try:
        config = _merge_config(_read_config(), payload)
        _provider_config(config)
        _save_config(config)
        return {"success": True, "message": "图床配置已仅保存在本机。", "data": _public_config(config)}
    except Exception as exc:
        return {"success": False, "message": f"保存失败: {exc}"}


@router.post("/test")
async def test_picbed_connection(payload: dict = Body(default={})):
    try:
        config = _merge_config(_read_config(), payload)
        provider, values = _provider_config(config)
        testers = {
            "lsky": _test_lsky,
            "tencent": _test_tencent,
            "aliyun": _test_aliyun,
            "github": _test_github,
        }
        message = await testers[provider](values)
        return {"success": True, "message": message}
    except Exception as exc:
        return {"success": False, "message": f"连接失败: {exc}"}


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        content = await file.read()
        if not content:
            raise PicBedError("图片文件为空")
        if len(content) > 25 * 1024 * 1024:
            raise PicBedError("单张图片不能超过 25 MB")
        content_type = file.content_type or "application/octet-stream"
        if not content_type.startswith("image/"):
            raise PicBedError("只允许上传图片文件")

        config = _read_config()
        provider, values = _provider_config(config)
        key = _object_key(config, file.filename, content_type)
        if provider == "lsky":
            url = await _upload_lsky(values, content, file.filename or "image", content_type)
        elif provider == "tencent":
            url = await _upload_tencent(values, key, content, content_type)
        elif provider == "aliyun":
            url = await _upload_aliyun(values, key, content, content_type)
        else:
            url = await _upload_github(values, key, content)
        return {"success": True, "message": "上传成功", "provider": provider, "url": url}
    except Exception as exc:
        return {"success": False, "message": f"上传失败: {exc}"}
