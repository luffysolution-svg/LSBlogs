import json
from pathlib import Path
from fastapi import APIRouter, Request

from cms_core.api.sync import require_active_blog_path
from cms_core.blog_content import atomic_write_text, read_typescript_array

router = APIRouter()

def get_friends_path() -> Path:
    return require_active_blog_path() / "data" / "friends.ts"


@router.get("/get")
async def get_friends():
    try:
        return {"success": True, "friends": read_typescript_array(get_friends_path(), "friendsData")}
    except Exception as exc:
        return {"success": False, "message": f"读取正式博客友链失败: {exc}"}


@router.post("/sync")
async def sync_friends(request: Request):
    try:
        payload = await request.json()
        friends_list = payload.get("friends", [])

        # 1. 序列化
        json_str = json.dumps(friends_list, ensure_ascii=False, indent=2)

        # 2. 构造 TS 模板
        ts_content = (
            "// 本文件由 LSBlogs 本地管理器自动生成\n"
            "export interface Friend { id: string; name: string; url: string; description: string; avatar: string; themeColor: string; }\n\n"
            f"export const friendsData: Friend[] = {json_str};"
        )

        # 3. 物理落盘
        atomic_write_text(get_friends_path(), ts_content)

        return {"success": True, "message": f"✨ 友链物理文件已更新！共同步 {len(friends_list)} 位好友。"}
    except Exception as e:
        return {"success": False, "message": f"后端同步崩溃: {str(e)}"}
