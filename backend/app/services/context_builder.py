"""
context_builder.py
Busca o histórico do usuário no banco e monta a string de contexto
que é injetada no system prompt da Groq.
"""

from __future__ import annotations

import json
from datetime import timezone

from app.models.analysis import Analysis
from app.models.error_log import ErrorLog


_MAX_ANALYSES = 5
_MAX_ERRORS = 3
_RESULT_PREVIEW_CHARS = 400  # trunca resumo do JSONB para não explodir o prompt


def _fmt_date(dt) -> str:
    if dt is None:
        return "?"
    local = dt.astimezone(timezone.utc) if dt.tzinfo else dt
    return local.strftime("%d/%m/%Y")


def _summarise_result(result: dict | None) -> str:
    """Extrai um resumo legível do JSONB de uma análise."""
    if not result:
        return "(sem resultado salvo)"

    # Tenta campo "summary" ou "step_3" (o que o projeto faz)
    for key in ("summary", "step_3", "what_it_does", "description"):
        if key in result:
            text = str(result[key])
            return text[:_RESULT_PREVIEW_CHARS]

    # Fallback: dump parcial do JSON
    raw = json.dumps(result, ensure_ascii=False)
    return raw[:_RESULT_PREVIEW_CHARS]


def build_context(user_id: str) -> str:
    """
    Retorna uma string de contexto com o histórico recente do usuário.
    Retorna string vazia se não houver histórico.
    """
    analyses = (
        Analysis.query.filter_by(user_id=user_id)
        .order_by(Analysis.created_at.desc())
        .limit(_MAX_ANALYSES)
        .all()
    )

    errors = (
        ErrorLog.query.filter_by(user_id=user_id)
        .order_by(ErrorLog.created_at.desc())
        .limit(_MAX_ERRORS)
        .all()
    )

    if not analyses and not errors:
        return ""

    lines: list[str] = ["Contexto do usuário (histórico recente):"]

    for a in analyses:
        title = a.title or f"análise #{str(a.id)[:8]}"
        date = _fmt_date(a.created_at)
        summary = _summarise_result(a.result)
        lines.append(f"- Análise '{title}' em {date} (tipo={a.type}): {summary}")

    for e in errors:
        date = _fmt_date(e.created_at)
        explanation = (e.explanation or "(sem explicação)")[:_RESULT_PREVIEW_CHARS]
        lines.append(f"- Erro identificado em {date}: {explanation}")

    return "\n".join(lines)
