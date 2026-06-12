"""
routes/errors.py
POST /errors/identify → identifica causa de um erro, explica e gera fix_prompt
"""

from __future__ import annotations

import uuid

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models.error_log import ErrorLog
from app.services.context_builder import build_context
from app.services.groq_service import GroqError, call_groq
from app.utils.jwt_helper import jwt_required

errors_bp = Blueprint("errors", __name__, url_prefix="/errors")


_ERRORS_SYSTEM = """Você é um especialista em depuração de código que ajuda
desenvolvedores a entender e corrigir erros.

Analise o erro fornecido e responda SOMENTE com um objeto JSON válido contendo
exatamente estas chaves:

{
  "explanation": "Explicação clara da causa do erro em linguagem simples (máx 200 palavras). Diga O QUE causou, POR QUÊ acontece e ONDE costuma ocorrer.",
  "fix_prompt": "Prompt completo e pronto para colar no Cursor, Claude ou ChatGPT e obter a correção. Deve incluir contexto suficiente para que qualquer IA resolva sem informações adicionais."
}

Não inclua texto fora do JSON. Não use markdown ao redor do JSON."""


@errors_bp.route("/identify", methods=["POST"])
@jwt_required
def identify_error(current_user):
    groq_key = request.headers.get("X-Groq-Key", "").strip()
    if not groq_key:
        return jsonify({"error": "Header X-Groq-Key ausente ou vazio."}), 400

    body = request.get_json(silent=True) or {}
    error_input = (body.get("error_input") or "").strip()

    if not error_input:
        return jsonify({"error": "Campo 'error_input' obrigatório no body."}), 400

    if len(error_input) > 20_000:
        return jsonify({"error": "Erro muito longo. Máximo de 20.000 caracteres."}), 400

    # 1. Monta contexto do usuário
    user_context = build_context(str(current_user.id))
    system_prompt = _ERRORS_SYSTEM
    if user_context:
        system_prompt = user_context + "\n\n" + system_prompt

    # 2. Chama a Groq
    try:
        raw_response = call_groq(
            system_prompt=system_prompt,
            user_message=f"Erro para analisar:\n\n{error_input}",
            groq_key=groq_key,
            response_format="json_object",
        )
    except GroqError as exc:
        return jsonify({"error": str(exc)}), exc.status_code

    # 3. Parseia resposta
    import json
    try:
        clean = raw_response.strip()
        if clean.startswith("```"):
            clean = clean.split("```", 2)[1]
            if clean.lower().startswith("json"):
                clean = clean[4:]
            clean = clean.rsplit("```", 1)[0].strip()
        result = json.loads(clean)
    except (json.JSONDecodeError, IndexError):
        result = {"raw_response": raw_response}

    explanation = result.get("explanation", "")
    fix_prompt = result.get("fix_prompt", "")

    # 4. Salva no banco
    log = ErrorLog(
        id=uuid.uuid4(),
        user_id=str(current_user.id),
        error_input=error_input,
        explanation=explanation,
        fix_prompt=fix_prompt,
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        "id": str(log.id),
        "explanation": explanation,
        "fix_prompt": fix_prompt,
        "created_at": log.created_at.isoformat(),
    }), 201
