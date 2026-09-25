"""Converte o texto extraído dos padrões definitivos da FGV em 100 unidades rastreáveis.

O texto oficial e a grade de pontuação permanecem canônicos. Classificações de
habilidade e componentes pedagógicos são derivados e explicitamente rotulados.
"""

from __future__ import annotations

import json
import re
import unicodedata
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
HYBRID_DIR = ROOT / "tmp" / "pdfs" / "fgv-hybrid"
TEXT_DIR = HYBRID_DIR if HYBRID_DIR.exists() else ROOT / "tmp" / "pdfs" / "fgv-text"
EXAMS_PATH = ROOT / "data" / "fgv-penal-exams.json"
OUTPUT_PATH = ROOT / "data" / "exam-units.json"
REPORT_PATH = ROOT / "data" / "exam-units-validation.json"
MANUAL_VERIFIED = {
    "oab-46-penal-piece",
    "oab-46-penal-question-1",
    "oab-45-penal-piece",
    "oab-44-penal-piece",
    "oab-42-penal-piece",
    "oab-40-penal-question-3",
    "oab-39-penal-question-3",
    "oab-37-penal-piece",
    "oab-35-penal-question-4",
    "oab-27-penal-question-4",
}


def plain(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in value if not unicodedata.combining(ch)).lower()


def compact(value: str) -> str:
    value = value.replace("\u00a0", " ").replace("\r", "")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r" *\n *", "\n", value)
    return value.strip()


def clean_body(value: str) -> str:
    lines: list[str] = []
    for line in compact(value).splitlines():
        normalized = plain(line)
        if re.match(r"^===== pagina \d+ =====$", normalized):
            continue
        if normalized.startswith("ordem dos advogados do brasil"):
            continue
        if "prova pratico-profissional" in normalized and "pagina" in normalized:
            continue
        if normalized in {"area: direito penal", "area: direito penal"}:
            continue
        if normalized.startswith("o gabarito preliminar da prova"):
            continue
        if normalized.startswith("podendo ser alterado ate"):
            continue
        if normalized.startswith("qualquer semelhanca nominal"):
            continue
        lines.append(line)
    return compact("\n".join(lines))


def page_for_offset(text: str, offset: int) -> int:
    matches = list(re.finditer(r"===== PÁGINA (\d+) =====", text[:offset], re.I))
    return int(matches[-1].group(1)) if matches else 1


def heading_matches(text: str) -> list[re.Match[str]]:
    return list(
        re.finditer(
            r"(?mi)^\s*(?:PADR[ÃA]O\s*DE\s*RESPOSTA\s*[–—-]\s*)?(PE[CÇ]A\s*(?:PR[ÁA]TICO\s*[–—-]\s*)?PROFISSIONAL|QUEST[ÃA]O\s*0?[1-4])(?:\s*[–—-]\s*[A-Z0-9]+)?\s*$",
            text,
            re.I | re.M,
        )
    )


def split_sections(text: str) -> list[dict]:
    candidates = heading_matches(text)
    matches: list[re.Match[str]] = []
    previous_key: tuple[str, int, int] | None = None
    for match in candidates:
        label = plain(re.sub(r"\s+", " ", match.group(1)))
        number_match = re.search(r"([1-4])", label)
        kind = "piece" if "peca" in label else "question"
        number = 0 if kind == "piece" else int(number_match.group(1))
        key = (kind, number, page_for_offset(text, match.start()))
        # O OCR costuma ler tanto o cabeçalho quanto o título interno da mesma unidade.
        if key == previous_key:
            continue
        matches.append(match)
        previous_key = key
    sections: list[dict] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        label = plain(re.sub(r"\s+", " ", match.group(1)))
        number_match = re.search(r"([1-4])", label)
        kind = "piece" if "peca" in label else "question"
        number = 0 if kind == "piece" else int(number_match.group(1))
        sections.append(
            {
                "kind": kind,
                "number": number,
                "start": match.start(),
                "content_start": match.end(),
                "page": page_for_offset(text, match.start()),
                "raw": text[match.end() : end],
            }
        )
    return sections


def split_content(raw: str) -> tuple[str, str, str]:
    body = re.split(r"\bENUNCIADO\b", raw, maxsplit=1, flags=re.I)[-1]
    answer_parts = re.split(
        r"\bGABARITO\s*(?:COMENTADO|JUSTIFICADO)\b",
        body,
        maxsplit=1,
        flags=re.I,
    )
    if len(answer_parts) == 1:
        answer_parts = re.split(r"\bGABARITO\b", body, maxsplit=1, flags=re.I)
    statement = answer_parts[0]
    rest = answer_parts[1] if len(answer_parts) > 1 else ""
    distribution_parts = re.split(
        r"\bDISTRIBUI[CÇ][ÃA]O\s*(?:DOS|DE)?\s*PONTOS\b",
        rest,
        maxsplit=1,
        flags=re.I,
    )
    commentary = distribution_parts[0]
    distribution = distribution_parts[1] if len(distribution_parts) > 1 else ""
    return clean_body(statement), clean_body(commentary), clean_body(distribution)


ITEM_START = re.compile(
    r"(?m)^\s*(?:"
    r"([AB]\s*\.\s*\d+)\s*[.)]?\s+|"
    r"([AB]\d*)\s*[.)]\s*|"
    r"(\d+\s*\.\s*\d+)\s*[.)]?\s+(?=\S)|"
    r"(\d+)\s*[.)]\s+(?=\S)"
    r")"
)
SCORE_GRID = re.compile(r"0,00(?:\s*/\s*[0-5],\d{2})+")
DECIMAL = re.compile(r"(?<!\d)([0-5],\d{2})(?!\d)")


def score(value: str) -> float:
    return float(value.replace(",", "."))


def parse_rubric(distribution: str, unit_id: str) -> list[dict]:
    distribution = re.sub(r"^.*?ITEM\s+PONTUA[CÇ][ÃA]O", "", distribution, count=1, flags=re.I | re.S)
    distribution = re.sub(
        r"(?mi)^(\s*\d{1,2})\s+(?=(?:Aplica[cç][aã]o|Reconhecimento|Afastamento|Pedido|Prazo|Fechamento|Local|Endere[cç]amento|Fundamento|Tempestividade|Subsidiariamente))",
        r"\1. ",
        distribution,
    )
    matches = list(ITEM_START.finditer(distribution))
    items: list[dict] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(distribution)
        raw = clean_body(distribution[match.start() : end])
        # Rodapés após o último item não integram o espelho.
        raw = re.split(r"\n\s*===== PÁGINA", raw, maxsplit=1, flags=re.I)[0].strip()
        scoreable = re.sub(r"(?<!\w)[Oo],(?=\d{2})", "0,", raw)
        scoreable = re.sub(r"(?<=\d),\s+(?=\d)", ",", scoreable)
        scoreable = re.sub(r"(?<=,\d)\s+(?=\d)", "", scoreable)
        grids = [re.sub(r"\s+", "", value) for value in SCORE_GRID.findall(scoreable)]
        decimals = [score(value) for value in DECIMAL.findall(scoreable)]
        maximum = max(decimals) if decimals else 0.0
        official_label = re.sub(
            r"\s+",
            "",
            next((group for group in match.groups() if group), ""),
        )
        description = re.sub(r"^\s*[^\s]+\s+", "", raw, count=1)
        description = SCORE_GRID.sub("", description)
        description = compact(description)
        items.append(
            {
                "id": f"{unit_id}-rubric-{index + 1:02d}",
                "official_label": official_label,
                "official_text": description,
                "official_score_max": round(maximum, 2),
                "official_score_options": grids,
                "source_extraction_status": "machine_checked",
            }
        )
    return items


def skills_for(text: str, kind: str) -> list[str]:
    value = plain(text)
    skills = {"identify_thesis", "apply_rule_to_facts", "derive_legal_consequence", "structure_argument", "write_concisely"}
    if kind == "piece":
        skills.update({"identify_piece", "identify_procedural_stage", "formulate_request"})
    if re.search(r"art\.|sumula|lei n|crfb|codigo penal|cpp|lep", value):
        skills.add("recall_legal_basis")
    if any(term in value for term in ["prazo", "tempestiv", "dias"]):
        skills.add("calculate_deadline")
    if any(term in value for term in ["enderecamento", "vara", "tribunal", "competencia"]):
        skills.add("identify_competence")
    if any(term in value for term in ["nulidade", "cerceamento", "violacao", "ilicita"]):
        skills.add("recognize_nullity")
    if any(term in value for term in ["pena", "regime", "reincid", "atenuante", "agravante", "remi", "execucao"]):
        skills.add("perform_sentencing_analysis")
    if any(term in value for term in ["pedido", "requer", "absolv", "extincao", "desprovimento"]):
        skills.add("formulate_request")
    return sorted(skills)


def pedagogical_components(item: dict) -> list[dict]:
    text = item["official_text"]
    found: list[dict] = []
    labels = [
        ("thesis", "Tese ou resposta central", "identify_thesis"),
        ("legal_basis", "Base legal ou jurisprudencial", "recall_legal_basis"),
        ("application", "Aplicação da regra aos fatos", "apply_rule_to_facts"),
        ("consequence", "Consequência jurídica ou pedido", "derive_legal_consequence"),
    ]
    normalized = plain(text)
    for component_id, label, skill_id in labels:
        include = component_id == "thesis"
        include = include or (component_id == "legal_basis" and re.search(r"art\.|sumula|lei n|crfb|codigo penal|cpp|lep", normalized) is not None)
        include = include or (component_id == "application" and any(word in normalized for word in ["porque", "pois", "tendo em vista", "diante", "uma vez"]))
        include = include or (component_id == "consequence" and any(word in normalized for word in ["requer", "absolv", "afast", "rejei", "extinc", "desprov"]))
        if include:
            found.append(
                {
                    "id": f"{item['id']}-{component_id}",
                    "label": label,
                    "skill_id": skill_id,
                    "scoring": "unscored_pedagogical_decomposition",
                }
            )
    return found


def unit_total(statement: str, kind: str) -> float:
    if kind == "piece":
        return 5.0
    # As quatro questões da prova prático-profissional valem 1,25 cada. Em páginas
    # rasterizadas o OCR às vezes lê o zero como letra O; não derivamos o total do OCR.
    return 1.25


def question_fallback_rubric(commentary: str, unit_id: str) -> list[dict]:
    starts = list(re.finditer(r"(?mi)^\s*([AB])\s*[.)]\s*", commentary))
    components: list[dict] = []
    if starts:
        for index, match in enumerate(starts):
            end = starts[index + 1].start() if index + 1 < len(starts) else len(commentary)
            expected = compact(commentary[match.end() : end])
            if expected:
                components.append(
                    {
                        "id": f"{unit_id}-pedagogical-{match.group(1).lower()}",
                        "label": f"Resposta {match.group(1).upper()}",
                        "expected": expected,
                        "skill_ids": skills_for(expected, "question"),
                        "scoring": "unscored_pedagogical_decomposition",
                        "source_basis": "official_commentary_without_fractional_score_table",
                    }
                )
    if components:
        return components
    sentences = [compact(value) for value in re.split(r"(?<=[.!?])\s+", commentary) if len(compact(value)) >= 45]
    return [
        {
            "id": f"{unit_id}-pedagogical-{index + 1:02d}",
            "label": f"Componente {index + 1}",
            "expected": sentence,
            "skill_ids": skills_for(sentence, "question"),
            "scoring": "unscored_pedagogical_decomposition",
            "source_basis": "official_commentary_without_fractional_score_table",
        }
        for index, sentence in enumerate(sentences[:8])
    ]


def piece_fallback_rubric(exam: dict, unit_id: str) -> list[dict]:
    entries = [
        ("Peça cabível", exam["piece_type"], ["identify_piece"]),
        ("Fase processual", exam["procedural_stage"], ["identify_procedural_stage"]),
        ("Fundamento da peça", "; ".join(exam["piece_legal_basis"]), ["recall_legal_basis"]),
        ("Prazo", exam["deadline"], ["calculate_deadline"]),
    ]
    entries.extend(
        ("Tese defensiva", thesis.replace("-", " "), ["identify_thesis", "apply_rule_to_facts", "derive_legal_consequence"])
        for thesis in exam["theses"]
    )
    entries.extend(("Pedido", request, ["formulate_request"]) for request in exam["requests"])
    return [
        {
            "id": f"{unit_id}-pedagogical-{index + 1:02d}",
            "label": label,
            "expected": expected,
            "skill_ids": skill_ids,
            "scoring": "unscored_pedagogical_decomposition",
            "source_basis": "editorial_metadata_derived_from_official_standard",
        }
        for index, (label, expected, skill_ids) in enumerate(entries)
    ]


def topic_ids(text: str) -> list[str]:
    value = plain(text)
    mapping = {
        "tipicidade": ["atipic", "tentativa", "crime impossivel", "desistencia", "arrependimento eficaz"],
        "ilicitude-culpabilidade": ["legitima defesa", "estado de necessidade", "culpabilidade", "embriaguez", "erro de tipo"],
        "concurso-crimes": ["concurso", "consuncao", "crime unico"],
        "pena": ["pena", "dosimetria", "regime", "substituicao", "reincid"],
        "punibilidade": ["prescricao", "punibilidade", "decadencia", "perempcao"],
        "acao-penal": ["acao penal", "representacao", "denuncia", "queixa"],
        "provas": ["prova", "busca", "intercept", "corpo de delito"],
        "nulidades": ["nulidade", "cerceamento", "contraditorio", "ampla defesa"],
        "procedimentos": ["resposta a acusacao", "memoriais", "procedimento", "competencia"],
        "recursos": ["apelacao", "recurso", "embargos", "agravo", "carta testemunhavel"],
        "beneficios-negociais": ["anpp", "acordo", "suspensao condicional do processo"],
        "cumprimento-pena": ["execucao", "remicao", "falta grave", "livramento", "indulto"],
        "garantias-fundamentais": ["inconstitucional", "crfb", "reserva de jurisdicao"],
    }
    found = [topic for topic, terms in mapping.items() if any(term in value for term in terms)]
    return found or (["procedimentos"] if "peca" in value else ["tipicidade"])


def build() -> tuple[list[dict], dict]:
    exams = json.loads(EXAMS_PATH.read_text(encoding="utf-8"))
    corpus: list[dict] = []
    issues: list[dict] = []
    for exam in sorted(exams, key=lambda item: item["exam_number"]):
        text_path = TEXT_DIR / f"{exam['exam_id']}.txt"
        text = text_path.read_text(encoding="utf-8")
        sections = split_sections(text)
        if len(sections) != 5:
            issues.append({"exam_id": exam["exam_id"], "code": "section_count", "actual": len(sections)})
        for section in sections:
            suffix = "piece" if section["kind"] == "piece" else f"question-{section['number']}"
            unit_id = f"{exam['exam_id']}-{suffix}"
            statement, commentary, distribution = split_content(section["raw"])
            distribution_match = re.search(r"DISTRIBUI[CÇ][ÃA]O\s*(?:DOS|DE)?\s*PONTOS", section["raw"], re.I)
            rubric_page = page_for_offset(text, section["content_start"] + distribution_match.start()) if distribution_match else None
            rubric = parse_rubric(distribution, unit_id)
            total = unit_total(statement, section["kind"])
            rubric_sum = round(sum(item["official_score_max"] for item in rubric), 2)
            for item in rubric:
                item["pedagogical_components"] = pedagogical_components(item)
                item["skill_ids"] = skills_for(item["official_text"], section["kind"])
                item["source_page"] = rubric_page
                if unit_id in MANUAL_VERIFIED:
                    item["source_extraction_status"] = "manual_verified"
            pedagogical_rubric = [
                {
                    "id": f"{item['id']}-practice",
                    "label": f"Critério {item['official_label']}",
                    "expected": item["official_text"],
                    "official_rubric_item_id": item["id"],
                    "official_score_max": item["official_score_max"],
                    "skill_ids": item["skill_ids"],
                    "scoring": "official",
                    "source_basis": "official_score_table",
                }
                for item in rubric
            ]
            if not pedagogical_rubric:
                pedagogical_rubric = (
                    piece_fallback_rubric(exam, unit_id)
                    if section["kind"] == "piece"
                    else question_fallback_rubric(commentary, unit_id)
                )
            combined = "\n".join([statement, commentary, distribution])
            if statement and commentary and rubric and abs(rubric_sum - total) <= 0.01:
                validation = "manual_verified" if unit_id in MANUAL_VERIFIED else "machine_checked"
            elif statement and commentary and not rubric and pedagogical_rubric:
                validation = "machine_checked_no_fractional_table"
            else:
                validation = "needs_review"
            if validation == "needs_review":
                issues.append(
                    {
                        "unit_id": unit_id,
                        "code": "unit_validation",
                        "statement": bool(statement),
                        "commentary": bool(commentary),
                        "rubric_items": len(rubric),
                        "pedagogical_items": len(pedagogical_rubric),
                        "expected_score": total,
                        "rubric_score": rubric_sum,
                    }
                )
            corpus.append(
                {
                    "id": unit_id,
                    "exam_id": exam["exam_id"],
                    "exam_number": exam["exam_number"],
                    "exam_label": exam["exam_label"],
                    "exam_date": exam["exam_date"],
                    "kind": section["kind"],
                    "question_number": section["number"] or None,
                    "title": exam["piece_type"] if section["kind"] == "piece" else f"Questão {section['number']}",
                    "statement": statement,
                    "official_commentary": commentary,
                    "official_total_score": total,
                    "official_rubric_score_sum": rubric_sum if rubric else None,
                    "rubric_items": rubric,
                    "pedagogical_rubric": pedagogical_rubric,
                    "skill_ids": skills_for(combined, section["kind"]),
                    "topic_ids": topic_ids(combined),
                    "thesis_ids": exam["theses"],
                    "source": {
                        "publisher": "FGV/OAB",
                        "url": exam["source_url"],
                        "document_type": exam["document_type"],
                        "page_start": section["page"],
                        "rubric_page": rubric_page,
                        "local_pdf": f"data/raw/fgv/{exam['exam_id']}.pdf",
                    },
                    "review": {
                        "status": validation,
                        "method": "Deterministic text extraction from the definitive official answer standard",
                        "checked_at": str(date.today()),
                    },
                }
            )
    report = {
        "generated_at": str(date.today()),
        "exam_count": len({item["exam_id"] for item in corpus}),
        "piece_count": sum(item["kind"] == "piece" for item in corpus),
        "question_count": sum(item["kind"] == "question" for item in corpus),
        "unit_count": len(corpus),
        "rubric_item_count": sum(len(item["rubric_items"]) for item in corpus),
        "machine_checked_units": sum(item["review"]["status"] == "machine_checked" for item in corpus),
        "manual_verified_units": sum(item["review"]["status"] == "manual_verified" for item in corpus),
        "machine_checked_without_fractional_table": sum(
            item["review"]["status"] == "machine_checked_no_fractional_table" for item in corpus
        ),
        "needs_review_units": sum(item["review"]["status"] == "needs_review" for item in corpus),
        "issues": issues,
    }
    return corpus, report


if __name__ == "__main__":
    units, validation_report = build()
    OUTPUT_PATH.write_text(json.dumps(units, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT_PATH.write_text(json.dumps(validation_report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(validation_report, ensure_ascii=False, indent=2))
