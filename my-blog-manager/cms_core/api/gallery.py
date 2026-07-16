import json
from pathlib import Path
from fastapi import APIRouter, Request

from cms_core.api.sync import require_active_blog_path
from cms_core.blog_content import atomic_write_text, read_typescript_array

router = APIRouter()

def get_albums_path() -> Path:
    return require_active_blog_path() / "data" / "albums.ts"


@router.get("/get")
async def get_gallery():
    try:
        return {"success": True, "albums": read_typescript_array(get_albums_path(), "albums")}
    except Exception as exc:
        return {"success": False, "message": f"读取正式博客相册失败: {exc}"}


@router.post("/sync")
async def sync_gallery(request: Request):
    """
    接收前端传来的全量相册数组，并将其物理重写回 data/albums.ts
    """
    try:
        payload = await request.json()
        albums_data = payload.get("albums", [])

        if not isinstance(albums_data, list):
            return {"success": False, "message": "数据格式非法，预期为数组"}

        # 1. 序列化数据（确保中文不乱码，缩进漂亮）
        json_str = json.dumps(albums_data, ensure_ascii=False, indent=2)

        # 2. 构造标准的 TypeScript 导出模板
        # 🛡️ 这种方式不依赖于绝对路径，只要相对位置不变，哪里都能跑
        ts_content = (
            "// 本文件由 LSBlogs 本地管理器自动生成，请勿手动修改\n"
            "export interface Photo { url: string; caption?: string; }\n"
            "export interface Album { id: string; title: string; description: string; cover: string; date: string; photos: Photo[]; }\n\n"
            f"export const albums: Album[] = {json_str};"
        )

        # 3. 确保目录存在并执行覆盖写入
        atomic_write_text(get_albums_path(), ts_content)

        return {
            "success": True,
            "message": f"📸 画廊物理文件已更新！已同步 {len(albums_data)} 个相册。"
        }
    except Exception as e:
        # 这里把具体的报错抛给前端方便排查
        return {"success": False, "message": f"同步失败: {str(e)}"}


@router.get("/debug_path")
async def debug_path():
    """用于检查当前后端锁定的物理路径"""
    return {
        "target_file": str(get_albums_path()),
        "exists": get_albums_path().exists()
    }
