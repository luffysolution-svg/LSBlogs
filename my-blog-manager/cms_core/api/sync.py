import filecmp
import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Request

router = APIRouter()

MANAGER_ROOT = Path(__file__).resolve().parents[2]

# 这些目录由管理器维护。同步时只增量复制，不再清空目标目录。
SYNC_DIRS = ("posts", "chatters", "moments", "public/images")
SYNC_FILES = (
    "app/about/about.md",
    "data/albums.ts",
    "data/friends.ts",
    "data/projects.ts",
    "siteConfig.ts",
)

BLOG_PATH_ENV = "LSBLOGS_BLOG_PATH"
BLOG_MARKERS = ("package.json", "siteConfig.ts", "app")
SENSITIVE_CONFIG_MARKERS = (
    "picBedName:",
    "picBedUrl:",
    "picBedToken:",
    "图床核心配置",
)
TEXT_SUFFIXES = {".css", ".json", ".md", ".mjs", ".py", ".ts", ".tsx", ".txt"}


def _as_path(value: str | os.PathLike[str]) -> Path:
    return Path(value).expanduser().resolve()


def is_safe_blog_dir(target_path: str | os.PathLike[str] | None) -> bool:
    """仅允许写入结构完整、且不是管理器自身的博客目录。"""
    if not target_path:
        return False

    try:
        target = _as_path(target_path)
    except (OSError, RuntimeError, ValueError):
        return False

    if target == MANAGER_ROOT or not target.is_dir():
        return False

    return all((target / marker).exists() for marker in BLOG_MARKERS)


def discover_blog_path() -> Path | None:
    """优先使用环境变量，否则寻找管理器旁边的正式博客目录。"""
    candidates: list[Path] = []
    env_path = os.environ.get(BLOG_PATH_ENV, "").strip()
    if env_path:
        candidates.append(Path(env_path))

    candidates.extend(
        [
            MANAGER_ROOT.parent / "LSBlogs",
            MANAGER_ROOT.parent / "lsblogs",
        ]
    )

    for candidate in candidates:
        if is_safe_blog_dir(candidate):
            return _as_path(candidate)
    return None


def resolve_blog_path(target_path: str | None = "") -> Path | None:
    if target_path and target_path.strip():
        try:
            return _as_path(target_path.strip())
        except (OSError, RuntimeError, ValueError):
            return None
    return discover_blog_path()


def get_managed_git_paths() -> list[str]:
    return [*SYNC_DIRS, *SYNC_FILES]


def _filtered_site_config() -> bytes:
    source = MANAGER_ROOT / "siteConfig.ts"
    lines = source.read_text(encoding="utf-8").splitlines(keepends=True)
    filtered = [
        line
        for line in lines
        if not any(marker in line for marker in SENSITIVE_CONFIG_MARKERS)
    ]
    return "".join(filtered).encode("utf-8")


def _iter_managed_files():
    for relative_dir in SYNC_DIRS:
        source_dir = MANAGER_ROOT / Path(relative_dir)
        if not source_dir.exists():
            continue
        for source in source_dir.rglob("*"):
            if source.is_file():
                relative_path = source.relative_to(MANAGER_ROOT).as_posix()
                yield relative_path, source, None

    for relative_file in SYNC_FILES:
        source = MANAGER_ROOT / Path(relative_file)
        if not source.is_file():
            continue
        override = _filtered_site_config() if relative_file == "siteConfig.ts" else None
        yield relative_file, source, override


def _files_match(source: Path, destination: Path, override: bytes | None) -> bool:
    if not destination.is_file():
        return False
    if override is not None:
        return destination.read_text(encoding="utf-8") == override.decode("utf-8")
    if source.suffix.lower() in TEXT_SUFFIXES:
        return source.read_text(encoding="utf-8") == destination.read_text(encoding="utf-8")
    return filecmp.cmp(source, destination, shallow=False)


def preview_sync(target_path: str | os.PathLike[str]) -> list[str]:
    target = _as_path(target_path)
    if not is_safe_blog_dir(target):
        raise ValueError("目标目录不是有效的博客项目")

    changed: list[str] = []
    for relative_path, source, override in _iter_managed_files():
        destination = target / Path(relative_path)
        if not _files_match(source, destination, override):
            changed.append(relative_path)
    return changed


def sync_blog_content(target_path: str | os.PathLike[str]) -> list[str]:
    """增量复制管理器内容，不删除目标中已有的文章或图片。"""
    target = _as_path(target_path)
    changed = preview_sync(target)
    changed_set = set(changed)

    for relative_path, source, override in _iter_managed_files():
        if relative_path not in changed_set:
            continue

        destination = target / Path(relative_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        if override is not None:
            destination.write_bytes(override)
        else:
            shutil.copy2(source, destination)

    return changed


@router.post("/check")
async def check_blog_path(request: Request):
    try:
        payload = await request.json()
        raw_path = str(payload.get("blogPath", "")).strip()
        target = resolve_blog_path(raw_path)

        if not target or not target.exists():
            return {
                "success": False,
                "message": "没有找到博客目录，请选择包含 package.json、siteConfig.ts 和 app 的目录。",
            }

        if not is_safe_blog_dir(target):
            return {
                "success": False,
                "message": "安全检查未通过：所选目录不是完整的博客项目，或误选了管理器目录。",
            }

        return {
            "success": True,
            "message": "博客目录校验通过，将使用增量同步，不会清空目标目录。",
            "blogPath": str(target),
            "autoDetected": not bool(raw_path),
        }
    except Exception as exc:
        return {"success": False, "message": f"目录校验失败: {exc}"}


@router.post("/execute")
async def execute_sync(request: Request):
    try:
        payload = await request.json()
        target = resolve_blog_path(str(payload.get("blogPath", "")))
        if not target or not is_safe_blog_dir(target):
            return {"success": False, "message": "安全检查未通过，已取消同步。"}

        changed = sync_blog_content(target)
        if not changed:
            message = "博客内容已经是最新状态，无需同步。"
        else:
            message = f"已安全同步 {len(changed)} 个文件，没有删除目标目录中的现有内容。"

        return {
            "success": True,
            "message": message,
            "blogPath": str(target),
            "changedFiles": changed,
        }
    except Exception as exc:
        return {"success": False, "message": f"同步失败: {exc}"}
