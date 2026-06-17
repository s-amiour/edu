import hashlib
import json
import re
import unicodedata
from pathlib import Path

from bs4 import BeautifulSoup

DATA_DIR = Path(__file__).parent / "DATA"
SANITIZED_DIR = DATA_DIR / "sanitized"

SKIP_BLOCK_TYPES = {
    "Image", "Figure", "FigureCaption", "Picture",
    "Caption", "ImageCaption", "Footnote",
}

# Patterns that indicate image alt-text / visual descriptions
_IMAGE_DESC = re.compile(
    r"^(A|An|The)\s+(glowing|stylized|decorative|diagram|graphic|photograph|"
    r"chart|illustration|icon|image|screenshot|logo|banner|slide|figure|photo|"
    r"drawing|picture|visual|render|rendering|depicted|shown)\b",
    re.IGNORECASE,
)

# Mermaid / code-like content
_MERMAID = re.compile(r"^graph\s+(TD|LR|TB|BT|RL)\b", re.IGNORECASE)


def sanitize(text: str) -> str:
    text = "".join(
        ch for ch in text
        if unicodedata.category(ch) not in ("Cc", "Cf") or ch in "\n\t"
    )
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def is_noise(text: str) -> bool:
    if _MERMAID.match(text):
        return True
    # Pure image description sentences (no alphanumeric "content" words)
    sentences = [s.strip() for s in text.split(".") if s.strip()]
    if sentences and all(_IMAGE_DESC.match(s) for s in sentences if s):
        return True
    return False


def walk(node, chunks, seen, current_section="Unknown"):
    if not isinstance(node, dict):
        return

    block_type = node.get("block_type", "")
    if block_type in SKIP_BLOCK_TYPES:
        return

    children = node.get("children", [])
    html = node.get("html")
    page = node.get("page")

    if html:
        soup = BeautifulSoup(html, "html.parser")
        heading = soup.find(["h1", "h2", "h3"])
        if heading:
            current_section = sanitize(heading.get_text(" ", strip=True))

        # Only emit content from nodes with no HTML-bearing children
        # to avoid parent-child duplication
        html_children = [c for c in children if isinstance(c, dict) and c.get("html")]
        if not html_children:
            text = sanitize(soup.get_text(" ", strip=True))
            if len(text) > 100 and not is_noise(text):
                key = hashlib.md5(text.encode()).hexdigest()
                if key not in seen:
                    seen.add(key)
                    chunks.append({
                        "section": current_section,
                        "content": text,
                        "page": page,
                    })

    for child in children:
        walk(child, chunks, seen, current_section)


def process_file(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    chunks: list[dict] = []
    seen: set[str] = set()
    walk(data, chunks, seen)
    return chunks


def main():
    SANITIZED_DIR.mkdir(exist_ok=True)
    json_files = sorted(DATA_DIR.glob("*.json"))
    if not json_files:
        print("No JSON files found in DATA/")
        return

    for json_path in json_files:
        chunks = process_file(json_path)
        out_path = SANITIZED_DIR / (json_path.stem + ".chunks.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, indent=2, ensure_ascii=False)
        print(f"{json_path.name}: {len(chunks)} chunks -> sanitized/{out_path.name}")


if __name__ == "__main__":
    main()
