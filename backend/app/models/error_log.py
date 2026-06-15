import uuid
from datetime import datetime, timezone
from app import db


class ErrorLog(db.Model):
    __tablename__ = "error_logs"

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
    error_input = db.Column(db.Text, nullable=False)
    explanation = db.Column(db.Text, nullable=True)
    fix_prompt = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text("NOW()"),
    )

    # Relationships
    user = db.relationship("User", back_populates="error_logs")

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "error_input": self.error_input,
            "explanation": self.explanation,
            "fix_prompt": self.fix_prompt,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<ErrorLog {self.id}>"
