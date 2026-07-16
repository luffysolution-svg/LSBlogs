from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

from cms_core.api.sync import require_active_blog_path
from cms_core.blog_content import atomic_write_text, content_path, normalize_document_id

router = APIRouter()


class MomentPayload(BaseModel):
    id: str
    date: str
    content: str
    location: Optional[str] = ""
    images: List[str] = []


@router.post("/save")
def save_moment(payload: MomentPayload):
    try:
        moment_id = normalize_document_id(payload.id, "moment")
        file_path = content_path("moment", moment_id)

        # 构造 Markdown Front-matter
        frontmatter_lines = ["---"]
        frontmatter_lines.append(f'id: "{payload.id}"')
        frontmatter_lines.append(f'date: "{payload.date}"')

        if payload.location:
            frontmatter_lines.append(f'location: "{payload.location}"')

        if payload.images:
            frontmatter_lines.append("images:")
            for img in payload.images:
                frontmatter_lines.append(f"  - '{img}'")

        frontmatter_lines.append("---")
        frontmatter_lines.append("")  # 留一个空行

        file_content = "\n".join(frontmatter_lines) + "\n" + payload.content

        # 写入 .md 文件
        atomic_write_text(file_path, file_content)

        # 🌟 在 Python 终端里大声喊出文件到底存哪了！
        print(f"\n[成功] 说说已落盘，精准物理路径：{file_path}\n")

        return {"success": True, "message": f"成功保存到: {file_path}"}

    except Exception as e:
        print(f"\n[报错] 写入失败：{str(e)}\n")
        return {"success": False, "message": f"写入物理文件失败: {str(e)}"}


class DeletePayload(BaseModel):
    id: str

@router.post("/delete")
def delete_moment(payload: DeletePayload):
    try:
        moment_id = normalize_document_id(payload.id, "moment")
        file_path = content_path("moment", moment_id)

        if file_path.exists():
            file_path.unlink()
            print(f"\n[删除成功] 物理文件已粉碎：{file_path}\n")
            return {"success": True, "message": "文件已删除"}
        else:
            return {"success": False, "message": "文件不存在，无法删除"}

    except Exception as e:
        print(f"\n[删除报错] {str(e)}\n")
        return {"success": False, "message": f"删除失败: {str(e)}"}
