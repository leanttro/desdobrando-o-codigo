import re
import bcrypt
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.user import User
from app.utils.jwt_helper import generate_token

auth_bp = Blueprint("auth", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
WHATSAPP_RE = re.compile(r"^\+?[\d\s\-()]{7,20}$")


def _validate_register_body(data: dict) -> list[str]:
    errors = []
    if not data.get("name", "").strip():
        errors.append("name é obrigatório.")
    if not EMAIL_RE.match(data.get("email", "")):
        errors.append("email inválido.")
    whatsapp = data.get("whatsapp", "")
    if whatsapp and not WHATSAPP_RE.match(whatsapp):
        errors.append("whatsapp inválido.")
    password = data.get("password", "")
    if len(password) < 8:
        errors.append("password deve ter ao menos 8 caracteres.")
    return errors


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Body JSON inválido ou ausente."}), 400

    errors = _validate_register_body(data)
    if errors:
        return jsonify({"errors": errors}), 422

    password_hash = bcrypt.hashpw(
        data["password"].encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    user = User(
        name=data["name"].strip(),
        email=data["email"].strip().lower(),
        whatsapp=data.get("whatsapp", "").strip(),
        password_hash=password_hash,
    )

    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Este e-mail já está cadastrado."}), 409

    # Retorna to_dict_admin para incluir is_admin no payload do frontend
    token = generate_token(str(user.id))
    return jsonify({"token": token, "user": user.to_dict_admin()}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Body JSON inválido ou ausente."}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "email e password são obrigatórios."}), 400

    user: User | None = User.query.filter_by(email=email).first()

    if user is None or not bcrypt.checkpw(
        password.encode("utf-8"), user.password_hash.encode("utf-8")
    ):
        return jsonify({"error": "Credenciais inválidas."}), 401

    # Retorna to_dict_admin para incluir is_admin no payload do frontend
    token = generate_token(str(user.id))
    return jsonify({"token": token, "user": user.to_dict_admin()}), 200
