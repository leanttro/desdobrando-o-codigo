import uuid
from datetime import datetime, timezone
from app import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(
        db.UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=db.text("gen_random_uuid()"),
    )
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    whatsapp = db.Column(db.String(20), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("FALSE"))
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text("NOW()"),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text("NOW()"),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    analyses = db.relationship(
        "Analysis", back_populates="user", cascade="all, delete-orphan", lazy="dynamic"
    )
    error_logs = db.relationship(
        "ErrorLog", back_populates="user", cascade="all, delete-orphan", lazy="dynamic"
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "whatsapp": self.whatsapp,
            "created_at": self.created_at.isoformat(),
        }

    def to_dict_admin(self) -> dict:
        """Versão completa do to_dict, usada apenas em rotas de admin."""
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "whatsapp": self.whatsapp,
            "is_admin": self.is_admin,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<User {self.email}>"
