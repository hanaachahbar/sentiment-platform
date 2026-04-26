from fastapi import APIRouter

from database import SessionLocal, Ticket
from query_utils import apply_platform_filter, apply_time_filter, effective_category_expr, get_time_window, serialize_ticket
from time_utils import now_local

router = APIRouter()


@router.get("/api/posts")
def get_posts(
    platform: str = None,
    category: str = None,
    status: str = None,
    is_urgent: bool = None,
    time_range: str = "all",
    from_date: str = None,
    to_date: str = None,
):
    """Feed / tickets list with platform, category, status, urgency, and date filters."""
    db = SessionLocal()
    try:
        now = now_local()

        # Update SLA before returning data.
        overdue = (
            db.query(Ticket)
            .filter(Ticket.status == "open")
            .filter(Ticket.sla_deadline.isnot(None))
            .filter(Ticket.sla_deadline < now)
            .all()
        )
        for ticket in overdue:
            ticket.status = "breached"
        if overdue:
            db.commit()

        start, end, normalized_range = get_time_window(time_range, from_date, to_date)
        effective_category = effective_category_expr()

        query = db.query(Ticket)
        query = apply_platform_filter(query, platform)
        query = apply_time_filter(query, start, end)

        if category and category.strip().lower() != "all":
            query = query.filter(effective_category == category.strip().lower())
        if status and status.strip().lower() != "all":
            query = query.filter(Ticket.status == status.strip().lower())
        if is_urgent is not None:
            query = query.filter(Ticket.is_urgent == is_urgent)

        tickets = query.order_by(Ticket.created_at.desc()).all()
        return {
            "time_range": normalized_range,
            "from": start.isoformat() if start else None,
            "to": end.isoformat() if end else None,
            "count": len(tickets),
            "tickets": [serialize_ticket(ticket) for ticket in tickets],
        }
    finally:
        db.close()
