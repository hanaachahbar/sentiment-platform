from datetime import timedelta

from fastapi import APIRouter
from sqlalchemy import func

from database import SessionLocal, Ticket
from query_utils import apply_platform_filter, apply_time_filter, effective_category_expr, get_time_window
from scheduler import get_fetcher_status
from time_utils import now_local

router = APIRouter()


@router.get("/api/stats")
def get_stats(platform: str = None, time_range: str = "this_week", from_date: str = None, to_date: str = None):
    db = SessionLocal()
    try:
        start, end, normalized_range = get_time_window(time_range, from_date, to_date)
        effective_category = effective_category_expr()

        base = db.query(Ticket)
        base = apply_platform_filter(base, platform)
        base = apply_time_filter(base, start, end)

        tickets = base.all()
        total = len(tickets)
        open_tickets = sum(1 for t in tickets if t.status == "open")
        resolved_tickets = sum(1 for t in tickets if t.status == "resolved")
        breached_tickets = sum(1 for t in tickets if t.status == "breached")
        complaints = sum(1 for t in tickets if (t.category_manual if t.manually_corrected and t.category_manual else t.category) in {"complaint", "negative"})

        avg_response_hours = None
        resolved_with_dates = [t for t in tickets if t.status == "resolved" and t.created_at]
        if resolved_with_dates:
            now = now_local()
            avg_response_hours = round(sum((now - t.created_at).total_seconds() / 3600 for t in resolved_with_dates) / len(resolved_with_dates), 1)

        # Daily activity over the selected window. For "all", show last 7 days to keep chart readable.
        chart_end = end or now_local()
        chart_start = start or (chart_end - timedelta(days=6))
        if (chart_end - chart_start).days > 31:
            chart_start = chart_end - timedelta(days=30)

        day_expr = func.date(Ticket.created_at)
        daily_query = db.query(day_expr.label("day"), Ticket.status, func.count(Ticket.id).label("count"))
        daily_query = apply_platform_filter(daily_query, platform)
        daily_query = daily_query.filter(Ticket.created_at >= chart_start).filter(Ticket.created_at < chart_end)
        daily_rows = daily_query.group_by(day_expr, Ticket.status).all()

        daily_map = {}
        for row in daily_rows:
            daily_map.setdefault(row.day, {"volume": 0, "open": 0, "resolved": 0, "breached": 0})
            daily_map[row.day]["volume"] += row.count
            if row.status in {"open", "resolved", "breached"}:
                daily_map[row.day][row.status] += row.count

        daily_activity = []
        days = max(1, min(31, (chart_end.date() - chart_start.date()).days + 1))
        for offset in range(days):
            day = chart_start.date() + timedelta(days=offset)
            values = daily_map.get(day.isoformat(), {"volume": 0, "open": 0, "resolved": 0, "breached": 0})
            daily_activity.append({"name": day.strftime("%d %b").upper(), **values})

        category_rows = base.with_entities(effective_category.label("category"), func.count(Ticket.id).label("count")).group_by(effective_category).all()
        category_breakdown = [
            {"name": (row.category or "unknown").title(), "value": row.count}
            for row in sorted(category_rows, key=lambda r: r.count, reverse=True)
        ]

        platform_rows = base.with_entities(Ticket.platform, func.count(Ticket.id).label("count")).group_by(Ticket.platform).all()
        platform_breakdown = [{"name": row.platform or "unknown", "value": row.count} for row in platform_rows]

        return {
            "time_range": normalized_range,
            "from": start.isoformat() if start else None,
            "to": end.isoformat() if end else None,
            "platform": platform or "all",
            "total_posts_today": total,
            "total_mentions": total,
            "complaint_percentage": (complaints / total * 100) if total else 0,
            "sla_breaches": breached_tickets,
            "breached_tickets": breached_tickets,
            "open_tickets": open_tickets,
            "resolved_tickets": resolved_tickets,
            "total_tickets": total,
            "avg_response_hours": avg_response_hours,
            "dashboard": {
                "daily_activity": daily_activity,
                "category_breakdown": category_breakdown,
                "platform_breakdown": platform_breakdown,
            },
        }
    finally:
        db.close()


@router.get("/api/fetcher/status")
def get_fetcher_monitor_status():
    return get_fetcher_status()
