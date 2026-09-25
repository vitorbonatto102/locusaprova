"""Extrai texto paginado dos PDFs oficiais para revisão editorial local."""

from pathlib import Path
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data" / "raw" / "fgv"
DESTINATION = ROOT / "tmp" / "pdfs" / "fgv-text"


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for pdf_path in sorted(SOURCE.glob("oab-*-penal.pdf")):
        reader = PdfReader(pdf_path)
        pages = []
        for page_number, page in enumerate(reader.pages, start=1):
            pages.append(f"\n===== PÁGINA {page_number} =====\n{page.extract_text() or ''}")
        output = DESTINATION / f"{pdf_path.stem}.txt"
        output.write_text("\n".join(pages), encoding="utf-8")
        print(f"{pdf_path.stem}: {len(reader.pages)} páginas -> {output}")


if __name__ == "__main__":
    main()
