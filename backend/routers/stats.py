from datetime import timedelta

from fastapi import APIRouter
from sqlalchemy import and_, case, func
from database import SessionLocal, Ticket
from scheduler import get_fetcher_status
from time_utils import now_local

router = APIRouter()

@router.get("/api/stats")
def get_stats():
    db = SessionLocal()
    try:
        today_start = now_local().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow_start = today_start + timedelta(days=1)
        dashboard_start = today_start - timedelta(days=6)

        total = (
            db.query(func.count(Ticket.id))
            .filter(Ticket.created_at >= today_start)
            .filter(Ticket.created_at < tomorrow_start)
            .scalar()
        ) or 0

        complaints = (
            db.query(func.count(Ticket.id))
            .filter(Ticket.created_at >= today_start)
            .filter(Ticket.created_at < tomorrow_start)
            .filter(func.lower(func.coalesce(Ticket.category_manual, Ticket.category)).in_(["complaint", "negative"]))
            .scalar()
        ) or 0

        breaches = (
            db.query(func.count(Ticket.id))
            .filter(Ticket.status == "breached")
            .scalar()
        ) or 0

        open_tickets = (
            db.query(func.count(Ticket.id))
            .filter(Ticket.status == "open")
            .scalar()
        ) or 0

        resolved_tickets = (
            db.query(func.count(Ticket.id))
            .filter(Ticket.status == "resolved")
            .scalar()
        ) or 0

        day_expr = func.date(Ticket.created_at)
        daily_rows = (
            db.query(day_expr.label("day"), func.count(Ticket.id).label("count"))
            .filter(Ticket.created_at >= dashboard_start)
            .filter(Ticket.created_at < tomorrow_start)
            .group_by(day_expr)
            .all()
        )
        daily_counts = {row.day: row.count for row in daily_rows}

        status_rows = (
            db.query(day_expr.label("day"), Ticket.status.label("status"), func.count(Ticket.id).label("count"))
            .filter(Ticket.created_at >= dashboard_start)
            .filter(Ticket.created_at < tomorrow_start)
            .filter(Ticket.status.in_(["open", "resolved", "breached"]))
            .group_by(day_expr, Ticket.status)
            .all()
        )
        status_counts = {(row.day, row.status): row.count for row in status_rows}

        daily_activity = []
        for offset in range(7):
            current_day = dashboard_start + timedelta(days=offset)
            day_key = current_day.date().isoformat()
            daily_activity.append({
                "name": current_day.strftime("%d %b").upper(),
                "volume": daily_counts.get(day_key, 0),
                "open": status_counts.get((day_key, "open"), 0),
                "resolved": status_counts.get((day_key, "resolved"), 0),
                "breached": status_counts.get((day_key, "breached"), 0),
            })

        effective_category = case(
            (
                and_(
                    Ticket.manually_corrected == True,
                    Ticket.category_manual.isnot(None),
                    Ticket.category_manual != "",
                ),
                Ticket.category_manual,
            ),
            else_=Ticket.category,
        )
        category_rows = (
            db.query(effective_category.label("category"), func.count(Ticket.id).label("count"))
            .group_by(effective_category)
            .all()
        )
        category_breakdown = [
            {
                "name": row.category.title() if row.category else "Unknown",
                "value": row.count,
            }
            for row in sorted(category_rows, key=lambda row: row.count, reverse=True)
        ]

        avg_response_hours = (
            db.query(
                func.avg(
                    (func.julianday(func.current_timestamp()) - func.julianday(Ticket.created_at)) * 24.0
                )
            )
            .filter(Ticket.status == "resolved")
            .scalar()
        )

        response = {
            "total_posts_today": total,
            "complaint_percentage": (complaints / total * 100) if total else 0,
            "sla_breaches": breaches,
            "breached_tickets": breaches,
            "open_tickets": open_tickets,
            "resolved_tickets": resolved_tickets,
            "total_tickets": open_tickets + resolved_tickets + breaches,
            "avg_response_hours": round(avg_response_hours, 1) if avg_response_hours is not None else None,
            "dashboard": {
                "daily_activity": daily_activity,
                "category_breakdown": category_breakdown,
            },
        }

        return response
    finally:
        db.close()


@router.get("/api/fetcher/status")
def get_fetcher_monitor_status():
    return get_fetcher_status()