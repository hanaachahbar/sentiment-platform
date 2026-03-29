from fastapi import APIRouter
from database import SessionLocal, Ticket
from datetime import datetime

router = APIRouter()

@router.get("/api/posts")
def get_posts(
    platform: str = None,
    category: str = None,
    status: str = None,
    is_urgent: bool = None
):
    db = SessionLocal()
    query = db.query(Ticket)

    if platform:
        query = query.filter(Ticket.platform == platform)
    if category:
        query = query.filter(Ticket.category == category)
    if status:
        query = query.filter(Ticket.status == status)
    if is_urgent is not None:
        query = query.filter(Ticket.is_urgent == is_urgent)

    tickets = query.all()

    now = datetime.utcnow()
    updated = False
# Check for SLA breaches and update status if needed(can be removed later one)
    for t in tickets:
        if t.status == "open" and t.sla_deadline and now > t.sla_deadline:
            t.status = "breached"
            updated = True

    if updated:
        db.commit()
#end of this part
    response = [
        {
            "id": t.id,
            "text": t.text,
            "author": t.author,
            "platform": t.platform,
            "fb_link": t.fb_link,
            "created_at": t.created_at,
            "category": t.category,
            "category_manual": t.category_manual,
            "manually_corrected": t.manually_corrected,
            "is_urgent": t.is_urgent,
            "sla_deadline": t.sla_deadline,
            "status": t.status,
            "topic": t.topic
        }
        for t in tickets
    ]

    db.close()
    return response