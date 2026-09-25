"""Combina a camada nativa do PDF com OCR quando o PDF contém texto rasterizado."""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
PDF_DIR = ROOT / "data" / "raw" / "fgv"
OCR_DIR = ROOT / "tmp" / "pdfs" / "fgv-ocr-pages"
OUTPUT_DIR = ROOT / "tmp" / "pdfs" / "fgv-hybrid"


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch)).lower()
    return re.sub(r"\W+", "", value)


def enunciado_payload(value: str) -> int:
    compact = normalize(value)
    start = compact.find("enunciado")
    if start < 0:
        return 0
    ends = [position for token in ("gabaritocomentado", "gabaritojustificado") if (position := compact.find(token, start)) >= 0]
    end = min(ends) if ends else len(compact)
    return max(0, end - start - len("enunciado"))


def should_use_ocr(native: str, ocr: str) -> bool:
    native_norm = normalize(native)
    ocr_norm = normalize(ocr)
    native_distribution = "distribuicaodospontos" in native_norm or "distribuicaodepontos" in native_norm
    ocr_distribution = "distribuicaodospontos" in ocr_norm or "distribuicaodepontos" in ocr_norm
    if ocr_distribution and not native_distribution:
        return True
    if enunciado_payload(native) < 80 and enunciado_payload(ocr) >= 80:
        return True
    return len(native_norm) < len(ocr_norm) * 0.58


def distribution_start(value: str) -> int | None:
    match = re.search(r"Distribui[cç][aäã]o\s+(?:dos|de)?\s*Pontos", value, re.I)
    return match.start() if match else None


def answer_markers(value: str) -> tuple[re.Match[str] | None, re.Match[str] | None]:
    return (
        re.search(r"Enunciado", value, re.I),
        re.search(r"Gabarito\s+Comentado", value, re.I),
    )


def hybrid_page(native: str, ocr: str) -> str:
    if not should_use_ocr(native, ocr):
        return native
    native_statement, native_answer = answer_markers(native)
    ocr_statement, ocr_answer = answer_markers(ocr)
    # O enunciado costuma ser uma imagem, enquanto comentário e tabela têm
    # camada textual oficial. Substituímos somente o miolo ausente para não
    # degradar artigos, símbolos e frações da rubrica com OCR.
    if native_statement and native_answer and ocr_statement and ocr_answer:
        return (
            native[: native_statement.end()]
            + "\n"
            + ocr[ocr_statement.end() : ocr_answer.start()].strip()
            + "\n"
            + native[native_answer.start() :]
        )
    native_distribution = distribution_start(native)
    ocr_distribution = distribution_start(ocr)
    # O OCR recupera o enunciado rasterizado; a camada nativa preserva melhor a
    # tabela oficial. Quando ambos existem, usamos cada fonte no trecho em que é superior.
    if native_distribution is not None and ocr_distribution is not None:
        return ocr[:ocr_distribution] + native[native_distribution:]
    return ocr


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for pdf_path in sorted(PDF_DIR.glob("*.pdf")):
        pages: list[str] = []
        choices: list[str] = []
        for page_number, page in enumerate(PdfReader(str(pdf_path)).pages, start=1):
            native = page.extract_text() or ""
            ocr_path = OCR_DIR / f"{pdf_path.stem}-p{page_number:02d}.txt"
            ocr = ocr_path.read_text(encoding="utf-8") if ocr_path.exists() else ""
            use_ocr = bool(ocr) and should_use_ocr(native, ocr)
            selected = hybrid_page(native, ocr) if ocr else native
            native_markers = answer_markers(native)
            ocr_markers = answer_markers(ocr)
            merged = use_ocr and (
                all(native_markers) and all(ocr_markers)
                or distribution_start(native) is not None and distribution_start(ocr) is not None
            )
            pages.append(f"===== PÁGINA {page_number} =====\n\n{selected}")
            choices.append(f"p{page_number}:{'hybrid' if merged else ('ocr' if use_ocr else 'native')}")
        (OUTPUT_DIR / f"{pdf_path.stem}.txt").write_text("\n\n".join(pages) + "\n", encoding="utf-8")
        print(f"{pdf_path.stem}: {' '.join(choices)}")


if __name__ == "__main__":
    main()
