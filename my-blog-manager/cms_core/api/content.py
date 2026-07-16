from pathlib import Path

import yaml
from fastapi import APIRouter, Body

from cms_core.api.sync import require_active_blog_path
from cms_core.blog_content import CONTENT_FOLDERS, content_path, normalize_document_id


router = APIRouter()


def _read_markdown_item(path: Path, doc_type: str) -> dict:
    raw = path.read_text(encoding="utf-8")
    data: dict = {}
    body = raw
    if raw.lstrip().startswith("---"):
        parts = raw.split("---", 2)
        if len(parts) == 3:
            parsed = yaml.safe_load(parts[1]) or {}
            data = parsed if isinstance(parsed, dict) else {}
            body = parts[2]
    excerpt = " ".join(body.replace("#", " ").split())[:140]
    item = {
        "id": path.stem,
        "type": doc_type,
        "title": str(data.get("title") or (excerpt[:36] if doc_type == "moment" else path.stem)),
        "date": str(data.get("date") or ""),
        "description": str(data.get("description") or excerpt),
        "tags": data.get("tags") if isinstance(data.get("tags"), list) else [],
        "mood": str(data.get("mood") or ""),
    }
    if doc_type == "moment":
        item.update({
            "content": body.strip(),
            "location": str(data.get("location") or ""),
            "images": data.get("images") if isinstance(data.get("images"), list) else [],
        })
    return item


@router.get("/list")
def list_content():
    try:
        blog_root = require_active_blog_path()
        items: list[dict] = []
        for doc_type, folder in CONTENT_FOLDERS.items():
            directory = blog_root / folder
            if not directory.is_dir():
                continue
            for path in directory.glob("*.md"):
                try:
                    items.append(_read_markdown_item(path, doc_type))
                except (OSError, UnicodeDecodeError, yaml.YAMLError):
                    continue
        items.sort(key=lambda item: item.get("date", ""), reverse=True)
        counts = {
            doc_type: sum(1 for item in items if item["type"] == doc_type)
            for doc_type in CONTENT_FOLDERS
        }
        return {
            "success": True,
            "blogPath": str(blog_root),
            "items": items,
            "counts": counts,
        }
    except Exception as exc:
        return {"success": False, "message": f"读取正式博客内容失败: {exc}"}


@router.post("/delete")
def delete_content(payload: dict = Body(...)):
    try:
        doc_type = str(payload.get("type", "")).strip()
        doc_id = normalize_document_id(payload.get("id"), doc_type or "content")
        target = content_path(doc_type, doc_id)
        if not target.is_file():
            return {"success": False, "message": "未找到要删除的正式内容。"}
        target.unlink()
        return {
            "success": True,
            "message": f"已从正式博客删除 {target.name}，发布预览会显示该删除。",
            "deletedFile": target.relative_to(require_active_blog_path()).as_posix(),
        }
    except Exception as exc:
        return {"success": False, "message": f"删除失败: {exc}"}
