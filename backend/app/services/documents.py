import io
from typing import List

from pypdf import PdfReader


def parse_document(filename: str, raw: bytes) -> str:
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else "txt"
    if suffix == "pdf":
        reader = PdfReader(io.BytesIO(raw))
        return "\n\n".join(page.extract_text() or "" for page in reader.pages).strip()
    if suffix not in {"txt", "md", "markdown"}:
        raise ValueError("Supported file types: PDF, TXT, and Markdown")
    return raw.decode("utf-8", errors="replace").strip()


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 120) -> List[str]:
    normalized = " ".join(text.split())
    if not normalized:
        return []
    chunks: List[str] = []
    start = 0
    while start < len(normalized):
        end = min(len(normalized), start + chunk_size)
        if end < len(normalized):
            boundary = normalized.rfind(". ", start, end)
            if boundary > start + chunk_size // 2:
                end = boundary + 1
        chunks.append(normalized[start:end].strip())
        if end >= len(normalized):
            break
        start = max(start + 1, end - overlap)
    return chunks

