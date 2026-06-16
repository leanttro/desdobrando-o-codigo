"""
app/__init__.py
Factory da aplicação Flask.
Registra todos os blueprints — auth (Etapa 1) + analyze/errors/history/glossary (Etapa 2) + interview (Etapa 3) + admin (Etapa 4).
"""

from __future__ import annotations

from flask import Flask
from flask_cors import CORS

from app.config import Config
from app.extensions import db


def create_app(config_object: object = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object)

    # CORS — apenas origem do frontend configurada em FRONTEND_URL
    CORS(app, origins=[app.config.get("FRONTEND_URL", "*")])

    # Inicializa extensões
    db.init_app(app)

    # -----------------------------------------------------------------------
    # Blueprints — Etapa 1
    # -----------------------------------------------------------------------
    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/auth")

    # -----------------------------------------------------------------------
    # Blueprints — Etapa 2
    # -----------------------------------------------------------------------
    from app.routes.analyze import analyze_bp
    from app.routes.errors import errors_bp
    from app.routes.glossary import glossary_bp
    from app.routes.history import history_bp

    app.register_blueprint(analyze_bp)
    app.register_blueprint(errors_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(glossary_bp)

    # -----------------------------------------------------------------------
    # Blueprints — Etapa 3
    # -----------------------------------------------------------------------
    from app.routes.interview import interview_bp
    app.register_blueprint(interview_bp)

    # -----------------------------------------------------------------------
    # Blueprints — Etapa 4 (Admin)
    # -----------------------------------------------------------------------
    from app.routes.admin import admin_bp
    app.register_blueprint(admin_bp)

    # -----------------------------------------------------------------------
    # Health check
    # -----------------------------------------------------------------------
    @app.route("/health")
    def health():
        return {"status": "ok"}, 200

    return app
