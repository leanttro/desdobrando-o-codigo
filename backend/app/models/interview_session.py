import uuid
from datetime import datetime, timezone
from app import db


class InterviewSession(db.Model):
    __tablename__ = "interview_sessions"

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
    analysis_id = db.Column(
        db.UUID(as_uuid=True),
        db.ForeignKey("analyses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    score_avg = db.Column(db.Numeric(4, 1), nullable=True)
    results = db.Column(db.JSON, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=db.text("NOW()"),
    )

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "analysis_id": str(self.analysis_id),
            "score_avg": float(self.score_avg) if self.score_avg is not None else None,
            "results": self.results,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self) -> str:
        return f"<InterviewSession {self.id} analysis={self.analysis_id}>"
