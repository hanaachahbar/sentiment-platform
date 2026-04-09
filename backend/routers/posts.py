from fastapi import APIRouter
from database import SessionLocal, Ticket
from sqlalchemy import case, and_
from time_utils import now_local

router = APIRouter()

@router.get("/api/posts")
def get_posts(
    platform: str = None,
    category: str = None,
    status: str = None,
    is_urgent: bool = None
):
    """
    Fetch tickets/posts with optional filters.
    Returns all fields needed by frontend (Feed, SLAAlerts, etc.)
    """
    db = SessionLocal()

    try:
        now = now_local()
        overdue_open_tickets = (
            db.query(Ticket)
            .filter(Ticket.status == "open")
            .filter(Ticket.sla_deadline.isnot(None))
            .all()
        )

        has_updates = False
        for ticket in overdue_open_tickets:
            if now > ticket.sla_deadline:
                ticket.status = "breached"
                has_updates = True

        if has_updates:
            db.commit()

        query = db.query(Ticket)

        # Apply filters
        if platform:
            query = query.filter(Ticket.platform == platform)
        
        if status:
            query = query.filter(Ticket.status == status)
        
        if is_urgent is not None:
            query = query.filter(Ticket.is_urgent == is_urgent)
        
        # Category filter uses manual category if it exists, else original
        if category:
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
            query = query.filter(effective_category == category)

        tickets = query.all()

        # Build response with all required fields
        result = []
        for t in tickets:
            # Use manual category if manually corrected, else original
            final_category = (
                t.category_manual
                if t.manually_corrected and t.category_manual
                else t.category
            )

            result.append({
                "id": t.id,
                "author": t.author or "Unknown",
                "text": t.text,
                "platform": t.platform,
                "status": t.status,  # 'open', 'resolved', 'breached'
                "sla_deadline": t.sla_deadline.isoformat() if t.sla_deadline else None,
                "category": final_category,  # The effective category to display
                "category_manual": t.category_manual,  # Manual override if exists
                "manually_corrected": t.manually_corrected or False,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "source_link": t.source_link,
                "is_urgent": t.is_urgent or False,
                "topic": t.topic_ref.topic_name if t.topic_ref else "Other",
            })

        return result

    finally:
        db.close()