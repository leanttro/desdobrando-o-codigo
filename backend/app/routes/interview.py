"""
routes/interview.py
POST /interview/generate  → gera perguntas de entrevista baseadas numa análise existente
POST /interview/evaluate  → avalia a resposta do usuário a uma pergunta
"""

from __future__ import annotations

import json

from flask import Blueprint, g, jsonify, request

from app.models.analysis import Analysis
from app.services.groq_service import GroqError, call_groq
from app.utils.jwt_helper import jwt_required

interview_bp = Blueprint("interview", __name__, url_prefix="/interview")


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_GENERATE_SYSTEM = """Você é um entrevistador técnico experiente avaliando candidatos
que construíram projetos com ajuda de IA.

Gere perguntas de entrevista realistas sobre o projeto fornecido. As perguntas devem:
- Explorar decisões de arquitetura e tecnologia
- Verificar se o candidato entende o que o projeto faz e por quê
- Incluir perguntas sobre manutenção, escalabilidade e possíveis problemas
- Ser adequadas para alguém que construiu o projeto mas não é desenvolvedor sênior

Responda SOMENTE com um objeto JSON válido:
{
  "questions": ["pergunta 1", "pergunta 2", "pergunta 3"]
}

Não inclua texto fora do JSON. Não use markdown ao redor do JSON."""


_EVALUATE_SYSTEM = """Você é um entrevistador técnico avaliando a resposta de um candidato.

Avalie a resposta considerando:
- Se o candidato demonstra entender o conceito por trás da pergunta
- Clareza e objetividade da explicação
- Se a resposta seria satisfatória numa entrevista real

Responda SOMENTE com um objeto JSON válido:
{
  "score": 7,
  "feedback": "Comentário construtivo sobre a resposta (2-3 frases)",
  "ideal": "Como seria uma resposta ideal para essa pergunta (2-4 frases)"
}

score deve ser um número inteiro de 0 a 10.
Não inclua texto fora do JSON. Não use markdown ao redor do JSON."""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_groq_key() -> str | None:
    return request.headers.get("X-Groq-Key", "").strip() or None


def _parse_groq_json(raw: str) -> dict:
    """Tenta parsear a resposta da Groq como JSON, com fallback gracioso."""
    try:
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```", 2)[1]
            if clean.lower().startswith("json"):
                clean = clean[4:]
            clean = clean.rsplit("```", 1)[0].strip()
        return json.loads(clean)
    except (json.JSONDecodeError, IndexError):
        return {"raw_response": raw}


def _get_analysis_or_404(analysis_id: str, user_id: str):
    """Busca análise do usuário ou retorna None."""
    return Analysis.query.filter_by(
        id=analysis_id,
        user_id=user_id,
    ).first()


def _build_analysis_context(analysis: Analysis) -> str:
    """Monta o contexto do projeto a partir do resultado da análise."""
    result = analysis.result or {}
    parts = [f"Projeto: {analysis.title}"]

    if result.get("step_2"):
        parts.append(f"Stack e estrutura: {result['step_2']}")
    if result.get("step_3"):
        parts.append(f"O que o projeto faz: {result['step_3']}")
    if result.get("step_4"):
        parts.append(f"Bibliotecas e dependências: {result['step_4']}")
    if result.get("step_6"):
        parts.append(f"Deploy: {result['step_6']}")

    risks = result.get("step_5", {})
    if isinstance(risks, dict):
        all_risks = (
            risks.get("alto", []) +
            risks.get("medio", []) +
            risks.get("baixo", [])
        )
        if all_risks:
            parts.append("Riscos identificados: " + "; ".join(all_risks[:5]))

    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# POST /interview/generate
# ---------------------------------------------------------------------------

@interview_bp.route("/generate", methods=["POST"])
@jwt_required
def generate_questions():
    groq_key = _get_groq_key()
    if not groq_key:
        return jsonify({"error": "Header X-Groq-Key ausente ou vazio."}), 400

    body = request.get_json(silent=True) or {}
    analysis_id = body.get("analysis_id")
    count = int(body.get("count", 5))

    if not analysis_id:
        return jsonify({"error": "Campo 'analysis_id' obrigatório."}), 400

    count = max(1, min(count, 15))  # limita entre 1 e 15

    analysis = _get_analysis_or_404(analysis_id, g.current_user_id)
    if not analysis:
        return jsonify({"error": "Análise não encontrada."}), 404

    if analysis.type != "code":
        return jsonify({"error": "Modo entrevista disponível apenas para análises de código."}), 400

    context = _build_analysis_context(analysis)
    user_message = f"Gere exatamente {count} perguntas de entrevista para este projeto:\n\n{context}"

    try:
        raw = call_groq(
            system_prompt=_GENERATE_SYSTEM,
            user_message=user_message,
            groq_key=groq_key,
            response_format="json_object",
        )
    except GroqError as exc:
        return jsonify({"error": str(exc)}), exc.status_code

    parsed = _parse_groq_json(raw)
    questions = parsed.get("questions", [])

    if not questions:
        return jsonify({"error": "Não foi possível gerar perguntas. Tente novamente."}), 502

    return jsonify({"questions": questions[:count]}), 200


# ---------------------------------------------------------------------------
# POST /interview/evaluate
# ---------------------------------------------------------------------------

@interview_bp.route("/evaluate", methods=["POST"])
@jwt_required
def evaluate_answer():
    groq_key = _get_groq_key()
    if not groq_key:
        return jsonify({"error": "Header X-Groq-Key ausente ou vazio."}), 400

    body = request.get_json(silent=True) or {}
    question = body.get("question", "").strip()
    answer = body.get("answer", "").strip()
    analysis_id = body.get("analysis_id")

    if not question:
        return jsonify({"error": "Campo 'question' obrigatório."}), 400
    if not answer:
        return jsonify({"error": "Campo 'answer' obrigatório."}), 400

    # Contexto do projeto é opcional mas melhora a avaliação
    project_context = ""
    if analysis_id:
        analysis = _get_analysis_or_404(analysis_id, g.current_user_id)
        if analysis:
            project_context = f"Contexto do projeto:\n{_build_analysis_context(analysis)}\n\n"

    user_message = (
        f"{project_context}"
        f"Pergunta da entrevista: {question}\n\n"
        f"Resposta do candidato: {answer}"
    )

    try:
        raw = call_groq(
            system_prompt=_EVALUATE_SYSTEM,
            user_message=user_message,
            groq_key=groq_key,
            response_format="json_object",
        )
    except GroqError as exc:
        return jsonify({"error": str(exc)}), exc.status_code

    parsed = _parse_groq_json(raw)

    # Garante que score é inteiro entre 0 e 10
    score = parsed.get("score", 0)
    try:
        score = max(0, min(10, int(score)))
    except (TypeError, ValueError):
        score = 0
    parsed["score"] = score

    return jsonify(parsed), 200
