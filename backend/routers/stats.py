from fastapi import APIRouter
from datetime import datetime
from database import SessionLocal, Ticket

router = APIRouter()

@router.get("/api/stats")
def get_stats():
    db = SessionLocal()
    today = datetime.utcnow().date()

    tickets = db.query(Ticket).all()

    today_posts = [t for t in tickets if t.created_at.date() == today]

    total = len(today_posts)
    complaints = len([t for t in today_posts if t.category == "Complaint"])
    breaches = len([t for t in tickets if t.status == "breached"])

    return {
        "total_posts_today": total,
        "complaint_percentage": (complaints / total * 100) if total else 0,
        "sla_breaches": breaches
    }