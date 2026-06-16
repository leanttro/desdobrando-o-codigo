"""
routes/admin.py
Rotas do painel admin — todas protegidas por admin_required.

Endpoints:
  GET  /admin/metrics          → métricas gerais
  GET  /admin/users            → lista todos os usuários
  GET  /admin/users/<id>       → detalhes de um usuário + análises
  DELETE /admin/users/<id>     → deleta usuário
  PATCH  /admin/users/<id>/block → bloqueia/desbloqueia usuário
"""

from flask import Blueprint, jsonify, request, g
from sqlalchemy import func

from app import db
from app.models.user import User
from app.models.analysis import Analysis
from app.utils.jwt_helper import admin_required

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


@admin_bp.get("/metrics")
@admin_required
def metrics():
    """Métricas gerais do painel."""
    total_users = db.session.query(func.count(User.id)).scalar()
    total_analyses = db.session.query(func.count(Analysis.id)).scalar()

    # Novos usuários nos últimos 7 dias
    from datetime import datetime, timedelta, timezone
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_users_week = db.session.query(func.count(User.id)).filter(
        User.created_at >= week_ago
    ).scalar()

    # Análises por tipo
    analyses_by_type = db.session.query(
        Analysis.type, func.count(Analysis.id)
    ).group_by(Analysis.type).all()

    return jsonify({
        "total_users": total_users,
        "total_analyses": total_analyses,
        "new_users_last_7_days": new_users_week,
        "analyses_by_type": {t: c for t, c in analyses_by_type},
    }), 200


@admin_bp.get("/users")
@admin_required
def list_users():
    """Lista todos os usuários com paginação."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)  # limite máximo

    pagination = User.query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "users": [u.to_dict_admin() for u in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages,
    }), 200


@admin_bp.get("/users/<uuid:user_id>")
@admin_required
def get_user(user_id):
    """Detalhes de um usuário + suas análises."""
    user = User.query.get_or_404(user_id)

    analyses = Analysis.query.filter_by(user_id=user_id).order_by(
        Analysis.created_at.desc()
    ).limit(50).all()

    return jsonify({
        "user": user.to_dict_admin(),
        "analyses": [
            {
                "id": str(a.id),
                "type": a.type,
                "title": a.title,
                "created_at": a.created_at.isoformat(),
            }
            for a in analyses
        ],
        "total_analyses": Analysis.query.filter_by(user_id=user_id).count(),
    }), 200


@admin_bp.delete("/users/<uuid:user_id>")
@admin_required
def delete_user(user_id):
    """Deleta um usuário e todos os seus dados."""
    if str(user_id) == str(g.current_user.id):
        return jsonify({"error": "Você não pode deletar sua própria conta pelo painel."}), 400

    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": f"Usuário {user.email} deletado com sucesso."}), 200


@admin_bp.patch("/users/<uuid:user_id>/block")
@admin_required
def toggle_block_user(user_id):
    """
    Bloqueia ou desbloqueia um usuário alternando is_admin para False
    e adicionando um campo is_blocked (requer coluna no banco).
    Por ora, remove permissões de admin se o alvo for admin.
    """
    if str(user_id) == str(g.current_user.id):
        return jsonify({"error": "Você não pode bloquear sua própria conta."}), 400

    user = User.query.get_or_404(user_id)

    # Revoga admin se tiver
    if user.is_admin:
        user.is_admin = False
        db.session.commit()
        return jsonify({"message": f"Permissões de admin removidas de {user.email}."}), 200

    return jsonify({"message": "Usuário encontrado.", "user": user.to_dict_admin()}), 200
