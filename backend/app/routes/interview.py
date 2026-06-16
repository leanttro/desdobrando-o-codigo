"""
routes/interview.py
POST /interview/generate          → gera perguntas baseadas numa análise existente
POST /interview/evaluate          → avalia a resposta do usuário a uma pergunta
POST /interview/save              → salva a sessão completa ao terminar
GET  /interview/history           → lista TODOS os simulados do usuário (Dashboard)
GET  /interview/history/<id>      → lista sessões salvas de uma análise específica
"""

from __future__ import annotations

import json
import uuid

from flask import Blueprint, g, jsonify, request

from app.extensions import db
from app.models.analysis import Analysis
from app.models.interview_session import InterviewSession
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
    return Analysis.query.filter_by(
        id=analysis_id,
        user_id=user_id,
    ).first()


def _build_analysis_context(analysis: Analysis) -> str:
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

    count = max(1, min(count, 15))

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

    score = parsed.get("score", 0)
    try:
        score = max(0, min(10, int(score)))
    except (TypeError, ValueError):
        score = 0
    parsed["score"] = score

    return jsonify(parsed), 200


# ---------------------------------------------------------------------------
# POST /interview/save
# ---------------------------------------------------------------------------

@interview_bp.route("/save", methods=["POST"])
@jwt_required
def save_session():
    body = request.get_json(silent=True) or {}
    analysis_id = body.get("analysis_id")
    results = body.get("results", [])

    if not analysis_id:
        return jsonify({"error": "Campo 'analysis_id' obrigatório."}), 400
    if not results:
        return jsonify({"error": "Campo 'results' obrigatório."}), 400

    analysis = _get_analysis_or_404(analysis_id, g.current_user_id)
    if not analysis:
        return jsonify({"error": "Análise não encontrada."}), 404

    scores = [r.get("feedback", {}).get("score", 0) for r in results]
    score_avg = round(sum(scores) / len(scores), 1) if scores else None

    session = InterviewSession(
        id=uuid.uuid4(),
        user_id=g.current_user_id,
        analysis_id=analysis_id,
        score_avg=score_avg,
        results=results,
    )
    db.session.add(session)
    db.session.commit()

    return jsonify(session.to_dict()), 201


# ---------------------------------------------------------------------------
# GET /interview/history   ← NOVO: todos os simulados do usuário (pro Dashboard)
# ---------------------------------------------------------------------------

@interview_bp.route("/history", methods=["GET"])
@jwt_required
def get_all_history():
    sessions = (
        InterviewSession.query
        .filter_by(user_id=g.current_user_id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )

    return jsonify({"sessions": [s.to_dict() for s in sessions]}), 200


# ---------------------------------------------------------------------------
# GET /interview/history/<analysis_id>   ← original: simulados de uma análise
# ---------------------------------------------------------------------------

@interview_bp.route("/history/<analysis_id>", methods=["GET"])
@jwt_required
def get_history(analysis_id):
    analysis = _get_analysis_or_404(analysis_id, g.current_user_id)
    if not analysis:
        return jsonify({"error": "Análise não encontrada."}), 404

    sessions = (
        InterviewSession.query
        .filter_by(analysis_id=analysis_id, user_id=g.current_user_id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )

    return jsonify([s.to_dict() for s in sessions]), 200


# ---------------------------------------------------------------------------
# GET /interview/session/<session_id>   ← detalhe de um simulado salvo
# ---------------------------------------------------------------------------

@interview_bp.route("/session/<session_id>", methods=["GET"])
@jwt_required
def get_session(session_id):
    session = InterviewSession.query.filter_by(
        id=session_id,
        user_id=g.current_user_id,
    ).first()

    if not session:
        return jsonify({"error": "Simulado não encontrado."}), 404

    return jsonify(session.to_dict()), 200
