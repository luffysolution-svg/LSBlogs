import ast
import os
import re
import time
from pathlib import Path

from cms_core.api.sync import require_active_blog_path


INVALID_FILE_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
CONTENT_FOLDERS = {
    "post": "posts",
    "chatter": "chatters",
    "moment": "moments",
}


def normalize_document_id(raw_id: object, prefix: str = "post") -> str:
    value = str(raw_id or "").strip()
    if value.endswith(".md"):
        value = value[:-3]
    if not value or value == "new":
        value = f"{prefix}_{int(time.time() * 1000)}"
    if value in {".", ".."} or INVALID_FILE_CHARS.search(value):
        raise ValueError("内容 ID 包含非法字符")
    if Path(value).name != value:
        raise ValueError("内容 ID 不能包含目录路径")
    return value


def content_path(doc_type: str, raw_id: object) -> Path:
    if doc_type == "about":
        return require_active_blog_path() / "app" / "about" / "about.md"
    folder = CONTENT_FOLDERS.get(doc_type)
    if not folder:
        raise ValueError("不支持的内容类型")
    doc_id = normalize_document_id(raw_id, doc_type)
    return require_active_blog_path() / folder / f"{doc_id}.md"


def atomic_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    temporary.write_text(content, encoding="utf-8")
    os.replace(temporary, path)


def read_typescript_array(path: Path, export_name: str) -> list[object]:
    """读取博客 data/*.ts 中导出的纯数据数组，不执行 TypeScript。"""
    text = path.read_text(encoding="utf-8")
    assignment = re.search(rf"\b{re.escape(export_name)}\b[^=]*=\s*", text)
    if not assignment:
        raise ValueError(f"没有找到 {export_name} 数据导出")

    start = text.find("[", assignment.end())
    if start < 0:
        raise ValueError(f"{export_name} 不是数组")

    depth = 0
    quote = ""
    escaped = False
    end = -1
    for index in range(start, len(text)):
        char = text[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = ""
            continue
        if char in {'"', "'"}:
            quote = char
        elif char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                end = index + 1
                break

    if end < 0:
        raise ValueError(f"{export_name} 数组没有闭合")

    literal = text[start:end]
    # TypeScript 对象键通常不带引号；补齐后可由 literal_eval 安全读取。
    literal = re.sub(r"([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)", r'\1"\2"\3', literal)
    result = ast.literal_eval(literal)
    if not isinstance(result, list):
        raise ValueError(f"{export_name} 不是数组")
    return result
