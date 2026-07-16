import json
import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Request

router = APIRouter()

MANAGER_ROOT = Path(__file__).resolve().parents[2]

# 仅用于从旧版管理器一次性迁移尚不存在的内容文件。
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
LOCAL_DEPLOY_CONFIG = MANAGER_ROOT / "manager_data" / "deploy_config.json"
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


def get_active_blog_path() -> Path | None:
    """返回管理器当前选中的正式博客目录。"""
    if LOCAL_DEPLOY_CONFIG.is_file():
        try:
            data = json.loads(LOCAL_DEPLOY_CONFIG.read_text(encoding="utf-8"))
            configured = str(data.get("blogPath", "")).strip()
            if configured and is_safe_blog_dir(configured):
                return _as_path(configured)
        except (OSError, ValueError, json.JSONDecodeError):
            pass
    return discover_blog_path()


def require_active_blog_path() -> Path:
    target = get_active_blog_path()
    if not target or not is_safe_blog_dir(target):
        raise ValueError("没有找到有效的 LSBlogs 目录，请先在项目仓库设置中选择。")
    return target


def get_managed_git_paths() -> list[str]:
    return [*SYNC_DIRS, *SYNC_FILES]


def _iter_managed_files():
    for relative_dir in SYNC_DIRS:
        source_dir = MANAGER_ROOT / Path(relative_dir)
        if not source_dir.exists():
            continue
        for source in source_dir.rglob("*"):
            if source.is_file():
                relative_path = source.relative_to(MANAGER_ROOT).as_posix()
                yield relative_path, source


def preview_legacy_import(target_path: str | os.PathLike[str]) -> list[str]:
    target = _as_path(target_path)
    if not is_safe_blog_dir(target):
        raise ValueError("目标目录不是有效的博客项目")

    changed: list[str] = []
    for relative_path, source in _iter_managed_files():
        destination = target / Path(relative_path)
        if not destination.exists():
            changed.append(relative_path)
    return changed


def import_legacy_manager_content(target_path: str | os.PathLike[str]) -> list[str]:
    """一次性导入旧管理器内容；日常编辑不再调用这个函数。"""
    target = _as_path(target_path)
    changed = preview_legacy_import(target)
    changed_set = set(changed)

    for relative_path, source in _iter_managed_files():
        if relative_path not in changed_set:
            continue

        destination = target / Path(relative_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    return changed


def preview_sync(target_path: str | os.PathLike[str]) -> list[str]:
    """兼容旧发布器：正式博客已是唯一数据源，不再隐式同步副本。"""
    target = _as_path(target_path)
    if not is_safe_blog_dir(target):
        raise ValueError("目标目录不是有效的博客项目")
    return []


def sync_blog_content(target_path: str | os.PathLike[str]) -> list[str]:
    """兼容旧发布器：内容已经直接写入正式博客，无需复制。"""
    return preview_sync(target_path)


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
            "message": "博客目录校验通过，管理器将直接读写这份正式博客。",
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

        return {
            "success": True,
            "message": "正式博客已经是唯一内容源，无需执行副本同步。",
            "blogPath": str(target),
            "changedFiles": [],
        }
    except Exception as exc:
        return {"success": False, "message": f"同步失败: {exc}"}


@router.post("/legacy_preview")
async def legacy_preview(request: Request):
    try:
        payload = await request.json()
        target = resolve_blog_path(str(payload.get("blogPath", ""))) or get_active_blog_path()
        if not target or not is_safe_blog_dir(target):
            return {"success": False, "message": "没有找到有效的正式博客目录。"}
        files = preview_legacy_import(target)
        return {
            "success": True,
            "message": f"发现 {len(files)} 个尚未迁移的旧管理器文件。" if files else "没有需要迁移的旧数据。",
            "blogPath": str(target),
            "files": files,
        }
    except Exception as exc:
        return {"success": False, "message": f"旧数据检查失败: {exc}"}


@router.post("/legacy_import")
async def legacy_import(request: Request):
    try:
        payload = await request.json()
        target = resolve_blog_path(str(payload.get("blogPath", ""))) or get_active_blog_path()
        if not target or not is_safe_blog_dir(target):
            return {"success": False, "message": "没有找到有效的正式博客目录。"}
        files = import_legacy_manager_content(target)
        return {
            "success": True,
            "message": f"已将 {len(files)} 个旧管理器文件迁移到正式博客。" if files else "没有需要迁移的旧数据。",
            "blogPath": str(target),
            "changedFiles": files,
        }
    except Exception as exc:
        return {"success": False, "message": f"旧数据迁移失败: {exc}"}
