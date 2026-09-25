"""Aplica OCR apenas aos PDFs cuja camada de texto omite blocos rasterizados."""

from __future__ import annotations

import argparse
import re
import subprocess
from pathlib import Path

import cv2
import numpy as np
from pypdf import PdfReader
from rapidocr_onnxruntime import RapidOCR


ROOT = Path(__file__).resolve().parents[2]
PDF_DIR = ROOT / "data" / "raw" / "fgv"
OUTPUT_DIR = ROOT / "tmp" / "pdfs" / "fgv-ocr-pages"
IMAGE_DIR = ROOT / "tmp" / "pdfs" / "fgv-ocr-images"
MODEL_DIR = ROOT / "tmp" / "pdfs" / "ocr-models"
LATIN_MODEL = MODEL_DIR / "latin_PP-OCRv5_rec_mobile.onnx"
LATIN_DICTIONARY = MODEL_DIR / "ppocrv5_latin_dict.txt"
POPPLER = Path(
    r"C:\Users\vitor\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe"
)


def clean_legal_ocr(value: str) -> str:
    value = re.sub(r"(?<=\d)[oO](?=[\d,.])", "0", value)
    value = re.sub(r"(?<=[\d,.])[oO](?=\d)", "0", value)
    value = re.sub(r"(?<=Valor:\s)[oO](?=,\d{2})", "0", value)
    value = re.sub(r"\binciso\s+[Il1]{2}\b", "inciso II", value, flags=re.I)
    return value


def recognize_lines(engine: RapidOCR, image: np.ndarray, unclip_ratio: float) -> list[tuple[str, float]]:
    result, _ = engine(image, unclip_ratio=unclip_ratio)
    lines: list[tuple[str, float]] = []
    for box, recognized, confidence in result or []:
        # A correção de perspectiva pode distorcer linhas longas. Uma
        # segunda leitura do recorte retangular recupera esses casos.
        if confidence < 0.80:
            points = np.asarray(box, dtype=int)
            x0, y0 = points[:, 0].min(), points[:, 1].min()
            x1, y1 = points[:, 0].max(), points[:, 1].max()
            pad = 8
            crop = image[
                max(0, y0 - pad) : min(image.shape[0], y1 + pad),
                max(0, x0 - pad) : min(image.shape[1], x1 + pad),
            ]
            retry, _ = engine(crop, use_det=False, use_cls=False)
            if retry and retry[0][1] > confidence:
                recognized, confidence = retry[0]
        if confidence >= 0.80:
            lines.append((clean_legal_ocr(recognized), confidence))
    return lines


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("exam_ids", nargs="*", help="Ex.: oab-28-penal")
    parser.add_argument("--dpi", type=int, default=160)
    parser.add_argument("--pages", help="Páginas específicas, separadas por vírgula")
    parser.add_argument("--unclip-ratio", type=float, choices=(1.2, 1.6))
    parser.add_argument("--force", action="store_true", help="Refaz páginas já processadas")
    args = parser.parse_args()
    requested_pages = {int(value) for value in args.pages.split(",")} if args.pages else None
    pdfs = [PDF_DIR / f"{exam_id}.pdf" for exam_id in args.exam_ids]
    if not pdfs:
        pdfs = sorted(PDF_DIR.glob("*.pdf"))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    if not LATIN_MODEL.exists() or not LATIN_DICTIONARY.exists():
        raise FileNotFoundError(
            "Modelo latino ausente em tmp/pdfs/ocr-models. "
            "Baixe latin_PP-OCRv5_rec_mobile.onnx e ppocrv5_latin_dict.txt antes de executar."
        )
    engine = RapidOCR(
        rec_model_path=str(LATIN_MODEL),
        rec_keys_path=str(LATIN_DICTIONARY),
    )
    for pdf_path in pdfs:
        page_count = len(PdfReader(str(pdf_path)).pages)
        for page_number in range(1, page_count + 1):
            if requested_pages is not None and page_number not in requested_pages:
                continue
            output_path = OUTPUT_DIR / f"{pdf_path.stem}-p{page_number:02d}.txt"
            if not args.force and output_path.exists() and output_path.stat().st_size > 20:
                print(f"cached {pdf_path.stem} {page_number}/{page_count}", flush=True)
                continue
            image_base = IMAGE_DIR / f"{pdf_path.stem}-p{page_number:02d}"
            image_path = image_base.with_suffix(".png")
            subprocess.run(
                [
                    str(POPPLER),
                    "-f",
                    str(page_number),
                    "-singlefile",
                    "-png",
                    "-r",
                    str(args.dpi),
                    str(pdf_path),
                    str(image_base),
                ],
                check=True,
                capture_output=True,
            )
            image = cv2.imread(str(image_path))
            ratios = (args.unclip_ratio,) if args.unclip_ratio else (1.2, 1.6)
            candidates = [(ratio, recognize_lines(engine, image, ratio)) for ratio in ratios]
            ratio, selected = max(candidates, key=lambda item: (len(item[1]), sum(row[1] for row in item[1])))
            lines = [row[0] for row in selected]
            output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
            image_path.unlink(missing_ok=True)
            print(f"ocr {pdf_path.stem} {page_number}/{page_count} lines={len(lines)} unclip={ratio}", flush=True)


if __name__ == "__main__":
    main()
