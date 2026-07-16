import json
from pathlib import Path
from fastapi import APIRouter, Request

from cms_core.api.sync import require_active_blog_path
from cms_core.blog_content import atomic_write_text, read_typescript_array

router = APIRouter()

def get_projects_path() -> Path:
    return require_active_blog_path() / "data" / "projects.ts"


@router.get("/get")
async def get_projects():
    try:
        return {"success": True, "projects": read_typescript_array(get_projects_path(), "projectsData")}
    except Exception as exc:
        return {"success": False, "message": f"读取正式博客项目失败: {exc}"}


@router.post("/sync")
async def sync_projects(request: Request):
    try:
        payload = await request.json()
        projects_list = payload.get("projects", [])

        target_file = get_projects_path()
        print(f"🚀 尝试物理写入项目矩阵: {target_file}")

        # 序列化
        json_str = json.dumps(projects_list, ensure_ascii=False, indent=2)

        # 构造格式
        ts_content = (
            "// 🛡️ 本文件由控制台自动生成，请勿手动修改\n\n"
            "export type Project = {\n"
            "  id: string;\n"
            "  name: string;\n"
            "  description: string;\n"
            "  icon: string;\n"
            "  githubUrl: string;\n"
            "  tags: string[];\n"
            "};\n\n"
            f"export const projectsData: Project[] = {json_str};"
        )

        # 执行覆盖写入
        atomic_write_text(target_file, ts_content)

        print("✅ 项目矩阵物理落盘成功！")
        return {"success": True, "message": "写入成功"}
    except Exception as e:
        print(f"❌ 写入失败: {str(e)}")
        return {"success": False, "message": str(e)}
