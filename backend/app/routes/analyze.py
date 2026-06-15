"""
routes/analyze.py
POST /analyze/code  → analisa arquivos de código enviados pelo usuário
POST /analyze/n8n   → analisa JSON de workflow n8n
"""

from __future__ import annotations

import json
import uuid

from flask import Blueprint, g, jsonify, request

from app.extensions import db
from app.models.analysis import Analysis
from app.models.user import User
from app.services.context_builder import build_context
from app.services.file_parser import FileParserError, parse_uploaded_files
from app.services.groq_service import GroqError, call_groq
from app.services.n8n_parser import N8nParserError, parse_n8n_json
from app.utils.jwt_helper import jwt_required

analyze_bp = Blueprint("analyze", __name__)


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_CODE_SYSTEM = """Você é um especialista em engenharia de software que explica projetos
de código em linguagem simples para pessoas que não são desenvolvedores experientes.

Analise o projeto fornecido e responda SOMENTE com um objeto JSON válido contendo
exatamente estas chaves:

{
  "step_2": "Linguagens, frameworks e estrutura de pastas do projeto",
  "step_3": "O que o projeto faz, em linguagem simples (máx 200 palavras)",
  "step_4": "Bibliotecas, APIs, rotas principais e dependências entre arquivos",
  "step_5": {
    "alto": ["lista de riscos de nível alto"],
    "medio": ["lista de riscos de nível médio"],
    "baixo": ["lista de riscos de nível baixo"]
  },
  "step_6": "Passo a passo de deploy inferido dos arquivos do projeto",
  "step_7": "3 a 5 perguntas de entrevista sobre o projeto com respostas sugeridas"
}

Não inclua texto fora do JSON. Não use markdown ao redor do JSON."""

_N8N_SYSTEM = """Você é um especialista em automações n8n que explica workflows
em linguagem simples.

Analise o workflow fornecido e responda SOMENTE com um objeto JSON válido contendo
exatamente estas chaves:

{
  "what_it_does": "O que o workflow faz em linguagem simples (máx 150 palavras)",
  "nodes_explained": "Quais nodes estão sendo usados e para quê (um parágrafo)",
  "risks": {
    "alto": ["riscos críticos: credenciais hardcoded, ausência de tratamento de erro, loops"],
    "medio": ["riscos médios: dependências frágeis, sem retry"],
    "baixo": ["riscos baixos: melhorias de organização"]
  },
  "improvements": "Como melhorar o fluxo (máx 150 palavras)",
  "fix_prompts": ["prompt de correção 1", "prompt de correção 2"]
}

Não inclua texto fora do JSON. Não use markdown ao redor do JSON."""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_groq_key() -> str | None:
    return request.headers.get("X-Groq-Key", "").strip() or None


def _parse_groq_json(raw: str) -> dict:
    """Tenta parsear a resposta da Groq como JSON, com fallback gracioso."""
    try:
        # Remove possível bloco ```json ... ```
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```", 2)[1]
            if clean.lower().startswith("json"):
                clean = clean[4:]
            clean = clean.rsplit("```", 1)[0].strip()
        return json.loads(clean)
    except (json.JSONDecodeError, IndexError):
        return {"raw_response": raw}


def _save_analysis(user_id: str, analysis_type: str, title: str,
                   input_data: str, result: dict) -> Analysis:
    """Persiste a análise no banco e retorna o objeto."""
    analysis = Analysis(
        id=uuid.uuid4(),
        user_id=user_id,
        type=analysis_type,
        title=title,
        input_data=input_data[:10_000],  # limita input salvo no banco
        result=result,
    )
    db.session.add(analysis)
    db.session.commit()
    return analysis


# ---------------------------------------------------------------------------
# POST /analyze/code
# ---------------------------------------------------------------------------

@analyze_bp.route("/code", methods=["POST"])
@jwt_required
def analyze_code():
    current_user = User.query.get(g.current_user_id)
    groq_key = _get_groq_key()
    if not groq_key:
        return jsonify({"error": "Header X-Groq-Key ausente ou vazio."}), 400

    files = request.files.getlist("files")
    if not files or all(f.filename == "" for f in files):
        return jsonify({"error": "Nenhum arquivo enviado. Use o campo 'files'."}), 400

    # 1. Extrai conteúdo dos arquivos
    try:
        code_content = parse_uploaded_files(files)
    except FileParserError as exc:
        return jsonify({"error": str(exc)}), exc.status_code

    # 2. Monta contexto do usuário
    user_context = build_context(str(current_user.id))

    system_prompt = _CODE_SYSTEM
    if user_context:
        system_prompt = user_context + "\n\n" + system_prompt

    # 3. Chama a Groq
    try:
        raw_response = call_groq(
            system_prompt=system_prompt,
            user_message=code_content,
            groq_key=groq_key,
            response_format="json_object",
        )
    except GroqError as exc:
        return jsonify({"error": str(exc)}), exc.status_code

    # 4. Parseia resposta
    result = _parse_groq_json(raw_response)

    # 5. Define título a partir do conteúdo (primeiro arquivo ou fallback)
    first_filename = next(
        (f.filename for f in files if f.filename), "projeto"
    )
    title = first_filename[:255]

    # 6. Salva no banco
    analysis = _save_analysis(
        user_id=str(current_user.id),
        analysis_type="code",
        title=title,
        input_data=code_content,
        result=result,
    )

    return jsonify({
        "id": str(analysis.id),
        "title": analysis.title,
        "type": analysis.type,
        "result": result,
        "created_at": analysis.created_at.isoformat(),
    }), 201


# ---------------------------------------------------------------------------
# POST /analyze/n8n
# ---------------------------------------------------------------------------

@analyze_bp.route("/n8n", methods=["POST"])
@jwt_required
def analyze_n8n():
    current_user = User.query.get(g.current_user_id)
    groq_key = _get_groq_key()
    if not groq_key:
        return jsonify({"error": "Header X-Groq-Key ausente ou vazio."}), 400

    body = request.get_json(silent=True) or {}
    json_input = body.get("json_input")

    if not json_input:
        return jsonify({"error": "Campo 'json_input' obrigatório no body."}), 400

    # 1. Parseia e valida o JSON do n8n
    try:
        workflow_text, metadata = parse_n8n_json(json_input)
    except N8nParserError as exc:
        return jsonify({"error": str(exc)}), exc.status_code

    # 2. Monta contexto do usuário
    user_context = build_context(str(current_user.id))

    system_prompt = _N8N_SYSTEM
    if user_context:
        system_prompt = user_context + "\n\n" + system_prompt

    # 3. Chama a Groq
    try:
        raw_response = call_groq(
            system_prompt=system_prompt,
            user_message=workflow_text,
            groq_key=groq_key,
            response_format="json_object",
        )
    except GroqError as exc:
        return jsonify({"error": str(exc)}), exc.status_code

    # 4. Parseia resposta
    result = _parse_groq_json(raw_response)

    # Enriquece o result com metadata do parser
    result["_metadata"] = metadata

    # 5. Título baseado no nome do workflow
    title = metadata.get("workflow_name", "Workflow n8n")[:255]

    # 6. Salva no banco
    raw_str = json_input if isinstance(json_input, str) else json.dumps(json_input)
    analysis = _save_analysis(
        user_id=str(current_user.id),
        analysis_type="n8n",
        title=title,
        input_data=raw_str,
        result=result,
    )

    return jsonify({
        "id": str(analysis.id),
        "title": analysis.title,
        "type": analysis.type,
        "result": result,
        "created_at": analysis.created_at.isoformat(),
    }), 201
