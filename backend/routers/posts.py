from fastapi import APIRouter
from database import SessionLocal, Ticket
from datetime import datetime
from sqlalchemy import case, and_

router = APIRouter()

@router.get("/api/posts")
def get_posts(
    platform: str = None,
    category: str = None,
    status: str = None,
    is_urgent: bool = None
):
    db = SessionLocal()

    try:
        effective_category = case(
            (
                and_(
                    Ticket.manually_corrected == True,
                    Ticket.category_manual.isnot(None),
                    Ticket.category_manual != ""
                ),
                Ticket.category_manual
            ),
            else_=Ticket.category
        )

        query = db.query(Ticket)

        if platform:
            query = query.filter(Ticket.platform == platform)

        if category:
            query = query.filter(effective_category == category)

        if status:
            query = query.filter(Ticket.status == status)

        if is_urgent is not None:
            query = query.filter(Ticket.is_urgent == is_urgent)

        tickets = query.all()

        now = datetime.utcnow()
        updated = False

        for t in tickets:
            if t.status == "open" and t.sla_deadline and now > t.sla_deadline:
                t.status = "breached"
                updated = True

        if updated:
            db.commit()

        response = []
        for t in tickets:
            final_category = (
                t.category_manual
                if t.manually_corrected and t.category_manual
                else t.category
            )

            response.append({
                "id": t.id,
                "text": t.text,
                "author": t.author,
                "platform": t.platform,
                "source_link": t.source_link,
                "created_at": t.created_at,
                "category": final_category,          # final category used by frontend
                "category_original": t.category,     # optional
                "category_manual": t.category_manual,
                "manually_corrected": t.manually_corrected,
                "is_urgent": t.is_urgent,
                "sla_deadline": t.sla_deadline,
                "status": t.status,
                "topic": t.topic
            })

        return response

    finally:
        db.close()