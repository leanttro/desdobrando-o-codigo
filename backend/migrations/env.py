import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

# ── path setup ────────────────────────────────────────────────────────────────
# Allows importing app package from backend/
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

load_dotenv()

# ── Alembic config ────────────────────────────────────────────────────────────
config = context.config

# Override sqlalchemy.url from environment (never hardcoded)
database_url = os.environ.get("DATABASE_URL")
if not database_url:
    raise ValueError("DATABASE_URL environment variable is not set.")
config.set_main_option("sqlalchemy.url", database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Import models so Alembic sees the metadata ────────────────────────────────
from app import db, create_app           # noqa: E402
from app.models import User, Analysis, ErrorLog  # noqa: F401, E402

# We need an app context to access db.metadata
_app = create_app()
with _app.app_context():
    target_metadata = db.metadata


# ── Migration runners ─────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
