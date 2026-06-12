import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import current_app, request, jsonify


def generate_token(user_id: str) -> str:
    """Gera um JWT para o user_id informado."""
    expiration_hours = current_app.config.get("JWT_EXPIRATION_HOURS", 24)
    payload = {
        "sub": str(user_id),
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=expiration_hours),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def decode_token(token: str) -> dict:
    """
    Decodifica e valida o JWT.
    Lança jwt.ExpiredSignatureError ou jwt.InvalidTokenError em caso de falha.
    """
    return jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])


def jwt_required(f):
    """
    Decorator que protege uma rota exigindo JWT válido no header:
        Authorization: Bearer <token>
    Injeta `current_user_id` (str) no contexto via flask.g.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        from flask import g

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Token não fornecido ou formato inválido."}), 401

        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token)
            g.current_user_id = payload["sub"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expirado."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Token inválido."}), 401

        return f(*args, **kwargs)

    return decorated
