import uuid
from datetime import datetime, timezone
from app import db

ANALYSIS_TYPES = ("code", "n8n")


class Analysis(db.Model):
    __tablename__ = "analyses"

    id = db.Column(
        db.UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=db.text("gen_random_uuid()"),
    )
    user_id = db.Column(
        db.UUID(as_uuid=True),
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type = db.Column(
        db.String(20),
        nullable=False,
        # CHECK constraint applied via __table_args__
    )
    title = db.Column(db.String(255), nullable=True)
    input_data = db.Column(db.Text, nullable=True)
    result = db.Column(db.JSON, nullable=True)          # JSONB via PostgreSQL dialect
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text("NOW()"),
    )

    __table_args__ = (
        db.CheckConstraint("type IN ('code', 'n8n')", name="ck_analyses_type"),
    )

    # Relationships
    user = db.relationship("User", back_populates="analyses")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "type": self.type,
            "title": self.title,
            "result": self.result,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<Analysis {self.id} type={self.type}>"
