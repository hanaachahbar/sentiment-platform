from datetime import datetime, timedelta
from typing import Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import and_, case

from database import Ticket
from time_utils import now_local

VALID_TIME_RANGES = {
    "all",
    "today",
    "last_24h",
    "last_48h",
    "this_week",
    "last_week",
    "this_month",
    "last_month",
    "custom",
}


def parse_datetime(value: Optional[str], field_name: str) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name}. Use ISO format like 2026-04-26T12:00:00",
        )


def get_time_window(time_range: str = "all", from_date: str = None, to_date: str = None) -> Tuple[Optional[datetime], Optional[datetime], str]:
    """Convert a frontend time range into start/end datetimes.

    End is exclusive for database filtering.
    """
    normalized = (time_range or "all").strip().lower()
    if normalized not in VALID_TIME_RANGES:
        raise HTTPException(status_code=400, detail=f"Invalid time_range. Use one of: {', '.join(sorted(VALID_TIME_RANGES))}")

    now = now_local()

    if normalized == "custom":
        start = parse_datetime(from_date, "from_date")
        end = parse_datetime(to_date, "to_date")
        if not start or not end:
            raise HTTPException(status_code=400, detail="custom time_range requires both from_date and to_date")
        if start >= end:
            raise HTTPException(status_code=400, detail="from_date must be earlier than to_date")
        return start, end, normalized

    if from_date or to_date:
        start = parse_datetime(from_date, "from_date") if from_date else None
        end = parse_datetime(to_date, "to_date") if to_date else None
        if start and end and start >= end:
            raise HTTPException(status_code=400, detail="from_date must be earlier than to_date")
        return start, end, "custom"

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if normalized == "all":
        return None, None, normalized
    if normalized == "today":
        return today_start, today_start + timedelta(days=1), normalized
    if normalized == "last_24h":
        return now - timedelta(hours=24), now, normalized
    if normalized == "last_48h":
        return now - timedelta(hours=48), now, normalized
    if normalized == "this_week":
        start = today_start - timedelta(days=today_start.weekday())
        return start, now, normalized
    if normalized == "last_week":
        this_week_start = today_start - timedelta(days=today_start.weekday())
        return this_week_start - timedelta(days=7), this_week_start, normalized
    if normalized == "this_month":
        return today_start.replace(day=1), now, normalized
    if normalized == "last_month":
        this_month_start = today_start.replace(day=1)
        previous_month_end = this_month_start
        previous_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
        return previous_month_start, previous_month_end, normalized

    return None, None, "all"


def apply_time_filter(query, start: Optional[datetime], end: Optional[datetime]):
    if start:
        query = query.filter(Ticket.created_at >= start)
    if end:
        query = query.filter(Ticket.created_at < end)
    return query


def apply_platform_filter(query, platform: Optional[str]):
    if platform and platform.strip().lower() != "all":
        query = query.filter(Ticket.platform == platform.strip().lower())
    return query


def effective_category_expr():
    return case(
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


def serialize_ticket(ticket: Ticket) -> dict:
    final_category = ticket.category_manual if ticket.manually_corrected and ticket.category_manual else ticket.category
    return {
        "id": ticket.id,
        "author": ticket.author or "unknown",
        "text": ticket.text,
        "platform": ticket.platform,
        "source_link": ticket.source_link,
        "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
        "fetched_at": ticket.fetched_at.isoformat() if ticket.fetched_at else None,
        "category": final_category,
        "category_original": ticket.category,
        "category_manual": ticket.category_manual,
        "manually_corrected": bool(ticket.manually_corrected),
        "is_urgent": bool(ticket.is_urgent),
        "topic_id": ticket.topic_id,
        "topic": ticket.topic_ref.topic_name if ticket.topic_ref else "Other",
        "sla_deadline": ticket.sla_deadline.isoformat() if ticket.sla_deadline else None,
        "status": ticket.status,
    }
