from fastapi import APIRouter
from database import SessionLocal, Ticket
from scheduler import get_fetcher_status
from time_utils import now_local

router = APIRouter()

@router.get("/api/stats")
def get_stats():
    db = SessionLocal()
    today = now_local().date()

    tickets = db.query(Ticket).all()

    today_posts = [t for t in tickets if t.created_at and t.created_at.date() == today]

    total = len(today_posts)

    def _is_complaint(value: str | None) -> bool:
        if not value:
            return False
        normalized = value.strip().lower()
        # Accept both legacy and current category naming.
        return normalized in {"complaint", "negative"}

    complaints = len(
        [
            t
            for t in today_posts
            if _is_complaint(t.category_manual or t.category)
        ]
    )
    breaches = len([t for t in tickets if t.status == "breached"])

    response = {
        "total_posts_today": total,
        "complaint_percentage": (complaints / total * 100) if total else 0,
        "sla_breaches": breaches
    }

    db.close()
    return response


@router.get("/api/fetcher/status")
def get_fetcher_monitor_status():
    return get_fetcher_status()