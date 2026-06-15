"""
routes/history.py
GET /history → retorna análises e erros do usuário autenticado
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request, g

from app.models.analysis import Analysis
from app.models.error_log import ErrorLog
from app.utils.jwt_helper import jwt_required

history_bp = Blueprint("history", __name__, url_prefix="/history")

_DEFAULT_LIMIT = 20
_MAX_LIMIT = 100


@history_bp.route("", methods=["GET"])
@jwt_required
def get_history():
    try:
        limit = min(int(request.args.get("limit", _DEFAULT_LIMIT)), _MAX_LIMIT)
        offset = max(int(request.args.get("offset", 0)), 0)
    except (ValueError, TypeError):
        limit = _DEFAULT_LIMIT
        offset = 0

    user_id = g.current_user_id

    analyses = (
        Analysis.query
        .filter_by(user_id=user_id)
        .order_by(Analysis.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    errors = (
        ErrorLog.query
        .filter_by(user_id=user_id)
        .order_by(ErrorLog.created_at.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    return jsonify({
        "analyses": [
            {
                "id": str(a.id),
                "type": a.type,
                "title": a.title,
                "result": a.result,
                "created_at": a.created_at.isoformat(),
            }
            for a in analyses
        ],
        "errors": [
            {
                "id": str(e.id),
                "error_input": e.error_input,
                "explanation": e.explanation,
                "fix_prompt": e.fix_prompt,
                "created_at": e.created_at.isoformat(),
            }
            for e in errors
        ],
    }), 200
