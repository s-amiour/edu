import json
import re
import unicodedata
from pathlib import Path

from bs4 import BeautifulSoup

DATA_DIR = Path(__file__).parent / "DATA"
SANITIZED_DIR = DATA_DIR / "sanitized"


def sanitize(text: str) -> str:
    # Remove unicode control characters (keep newlines/tabs)
    text = "".join(
        ch for ch in text
        if unicodedata.category(ch) not in ("Cc", "Cf") or ch in "\n\t"
    )
    # Normalize unicode (NFC)
    text = unicodedata.normalize("NFC", text)
    # Collapse whitespace
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def walk(node, chunks, current_section="Unknown"):
    if not isinstance(node, dict):
        return

    html = node.get("html")
    page = node.get("page")

    if html:
        soup = BeautifulSoup(html, "html.parser")
        heading = soup.find(["h1", "h2", "h3"])
        if heading:
            current_section = sanitize(heading.get_text(" ", strip=True))

        text = sanitize(soup.get_text(" ", strip=True))
        if len(text) > 100:
            chunks.append({
                "section": current_section,
                "content": text,
                "page": page,
            })

    for child in node.get("children", []):
        walk(child, chunks, current_section)


def process_file(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    chunks = []
    walk(data, chunks)
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
