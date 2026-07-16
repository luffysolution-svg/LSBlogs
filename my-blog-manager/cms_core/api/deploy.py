import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Request

from cms_core.api.sync import (
    MANAGER_ROOT,
    discover_blog_path,
    get_managed_git_paths,
    is_safe_blog_dir,
    preview_sync,
    resolve_blog_path,
    sync_blog_content,
)

router = APIRouter()

DEFAULT_CONFIG_FILE = MANAGER_ROOT / "data" / "deploy_config.json"
LOCAL_CONFIG_FILE = MANAGER_ROOT / "manager_data" / "deploy_config.json"
DEFAULT_CONFIG = {
    "blogPath": "",
    "sourceBranch": "main",
}


class PublishError(RuntimeError):
    pass


def _read_json(path: Path) -> dict:
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _load_config() -> dict:
    config = {**DEFAULT_CONFIG}
    for path in (DEFAULT_CONFIG_FILE, LOCAL_CONFIG_FILE):
        data = _read_json(path)
        for key in DEFAULT_CONFIG:
            if key in data:
                config[key] = data[key]

    configured_path = str(config.get("blogPath", "")).strip()
    auto_detected = False
    path_warning = ""

    if configured_path and is_safe_blog_dir(configured_path):
        resolved_path = resolve_blog_path(configured_path)
    else:
        resolved_path = discover_blog_path()
        auto_detected = resolved_path is not None
        if configured_path:
            path_warning = "原配置路径已失效，已尝试自动识别管理器旁边的博客目录。"

    config["blogPath"] = str(resolved_path) if resolved_path else ""
    config["sourceBranch"] = str(config.get("sourceBranch", "main")).strip() or "main"
    config["autoDetected"] = auto_detected
    config["pathWarning"] = path_warning
    return config


def _save_local_config(blog_path: Path, branch: str) -> None:
    LOCAL_CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    LOCAL_CONFIG_FILE.write_text(
        json.dumps(
            {"blogPath": str(blog_path), "sourceBranch": branch},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def _output_excerpt(result: subprocess.CompletedProcess[str]) -> str:
    output = (result.stderr or result.stdout or "未知错误").strip()
    lines = output.splitlines()
    return "\n".join(lines[-20:])


def _run(command: list[str], cwd: Path, timeout: int = 120) -> subprocess.CompletedProcess[str]:
    try:
        result = subprocess.run(
            command,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
        )
    except FileNotFoundError as exc:
        raise PublishError(f"未找到命令: {command[0]}") from exc
    except subprocess.TimeoutExpired as exc:
        raise PublishError(f"命令执行超时: {' '.join(command[:3])}") from exc

    if result.returncode != 0:
        raise PublishError(_output_excerpt(result))
    return result


def _git(blog_path: Path, *args: str, timeout: int = 120) -> str:
    return _run(["git", *args], blog_path, timeout=timeout).stdout.strip()


def _resolve_request_path(payload: dict) -> Path:
    requested = str(payload.get("blogPath", "")).strip()
    if not requested:
        requested = str(_load_config().get("blogPath", ""))
    target = resolve_blog_path(requested)
    if not target or not is_safe_blog_dir(target):
        raise PublishError("博客目录无效，请在项目仓库设置中重新选择。")
    return target


def _git_info(blog_path: Path, preferred_branch: str = "") -> dict:
    _git(blog_path, "rev-parse", "--is-inside-work-tree")
    remote_url = _git(blog_path, "remote", "get-url", "origin")
    current_branch = _git(blog_path, "branch", "--show-current")
    branch = preferred_branch.strip() or current_branch or "main"
    staged_files = [
        line
        for line in _git(blog_path, "diff", "--cached", "--name-only").splitlines()
        if line
    ]
    return {
        "remoteUrl": remote_url,
        "currentBranch": current_branch,
        "sourceBranch": branch,
        "stagedFiles": staged_files,
    }


def _status_paths(blog_path: Path, managed_only: bool = False) -> list[str]:
    command = ["status", "--short", "--untracked-files=all"]
    if managed_only:
        command.extend(["--", *get_managed_git_paths()])
    output = _run(["git", *command], blog_path).stdout
    return [line[3:] for line in output.splitlines() if len(line) > 3]


def _available_managed_paths(blog_path: Path) -> list[str]:
    available: list[str] = []
    for relative_path in get_managed_git_paths():
        if (blog_path / Path(relative_path)).exists():
            available.append(relative_path)
            continue
        if _git(blog_path, "ls-files", "--", relative_path):
            available.append(relative_path)
    return available


@router.get("/config")
async def get_deploy_config():
    return _load_config()


@router.post("/config")
async def save_deploy_config(request: Request):
    try:
        payload = await request.json()
        target = _resolve_request_path(payload)
        branch = str(payload.get("sourceBranch", "main")).strip() or "main"
        _save_local_config(target, branch)
        return {
            "success": True,
            "message": "发布设置已保存在本机，不会写入模板仓库。",
            "blogPath": str(target),
            "sourceBranch": branch,
        }
    except Exception as exc:
        return {"success": False, "message": f"保存失败: {exc}"}


@router.post("/check")
async def check_git_env(request: Request):
    try:
        payload = await request.json()
        target = _resolve_request_path(payload)
        branch = str(payload.get("sourceBranch", "")).strip()
        info = _git_info(target, branch)
        return {
            "success": True,
            "message": "Git 仓库和 origin 远程地址均已就绪。",
            "blogPath": str(target),
            **info,
        }
    except Exception as exc:
        return {"success": False, "message": f"Git 检查失败: {exc}"}


@router.post("/preview")
async def preview_release(request: Request):
    try:
        payload = await request.json()
        target = _resolve_request_path(payload)
        branch = str(payload.get("sourceBranch", "")).strip()
        info = _git_info(target, branch)

        sync_files = preview_sync(target)
        managed_changes = _status_paths(target, managed_only=True)
        all_changes = _status_paths(target)
        files = list(dict.fromkeys([*sync_files, *managed_changes]))
        unrelated_count = max(0, len(all_changes) - len(managed_changes))
        can_publish = not info["stagedFiles"]

        if not can_publish:
            message = "检测到已经暂存的 Git 文件。为避免混入本次发布，请先处理这些文件。"
        elif files:
            message = f"检查完成，本次将处理 {len(files)} 个博客文件。"
        else:
            message = "检查完成，博客内容与仓库已经一致。"

        return {
            "success": True,
            "message": message,
            "canPublish": can_publish,
            "blogPath": str(target),
            "files": files,
            "syncFiles": sync_files,
            "unrelatedChangesCount": unrelated_count,
            **info,
        }
    except Exception as exc:
        return {"success": False, "message": f"发布检查失败: {exc}"}


@router.post("/release")
async def release_blog(request: Request):
    try:
        payload = await request.json()
        target = _resolve_request_path(payload)
        branch = str(payload.get("sourceBranch", "")).strip()
        info = _git_info(target, branch)

        if info["stagedFiles"]:
            return {
                "success": False,
                "message": "Git 暂存区已有文件，已取消发布，避免把其他改动混入本次提交。",
            }

        synced_files = sync_blog_content(target)

        npm_command = shutil.which("npm.cmd") or shutil.which("npm")
        if not npm_command:
            raise PublishError("未找到 npm，请先安装 Node.js。")
        _run([npm_command, "run", "build"], target, timeout=1200)

        managed_paths = _available_managed_paths(target)
        if managed_paths:
            _git(target, "add", "-A", "--", *managed_paths)
        staged_files = [
            line
            for line in _git(target, "diff", "--cached", "--name-only").splitlines()
            if line
        ]

        if not staged_files:
            _git(target, "push", "origin", f"HEAD:{info['sourceBranch']}", timeout=300)
            return {
                "success": True,
                "status": "up_to_date",
                "message": "生产构建已通过，远程分支已经是最新状态。",
                "blogPath": str(target),
                "changedFiles": synced_files,
            }

        commit_message = str(payload.get("commitMessage", "")).strip()
        if not commit_message:
            commit_message = f"发布博客内容 {datetime.now():%Y-%m-%d %H:%M}"
        commit_message = commit_message[:120]

        try:
            _git(target, "commit", "-m", commit_message)
        except Exception:
            _git(target, "reset", "--", *managed_paths)
            raise
        _git(target, "push", "origin", f"HEAD:{info['sourceBranch']}", timeout=300)

        return {
            "success": True,
            "status": "published",
            "message": f"已提交并推送 {len(staged_files)} 个博客文件，Vercel 将自动部署。",
            "blogPath": str(target),
            "sourceBranch": info["sourceBranch"],
            "remoteUrl": info["remoteUrl"],
            "changedFiles": staged_files,
        }
    except Exception as exc:
        return {"success": False, "message": f"发布失败: {exc}"}
