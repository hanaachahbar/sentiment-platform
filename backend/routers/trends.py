from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
import os
from database import SessionLocal, Ticket, TopicDictionary
from time_utils import now_local

router = APIRouter()

@router.get("/api/trends")
def get_trends(from_date: str = None, to_date: str = None):
    db = SessionLocal()

    now = now_local()

    if not from_date and not to_date:
        # Default: compare last 48 hours vs the 48 hours before that
        current_end = now
        current_start = now - timedelta(hours=48)
    elif from_date and to_date:
        try:
            current_start = datetime.fromisoformat(from_date)
            current_end = datetime.fromisoformat(to_date)
        except ValueError:
            db.close()
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use ISO format like 2026-03-29T12:00:00"
            )

        if current_start >= current_end:
            db.close()
            raise HTTPException(
                status_code=400,
                detail="from_date must be earlier than to_date"
            )
    else:
        db.close()
        raise HTTPException(
            status_code=400,
            detail="Provide both from_date and to_date, or neither"
        )

    duration = current_end - current_start
    previous_end = current_start
    previous_start = current_start - duration

    active_topics = db.query(TopicDictionary).filter(TopicDictionary.is_active == True).all()
    topic_name_by_id = {t.id: t.topic_name for t in active_topics}

    all_tickets = db.query(Ticket).all()

    current_tickets = [
        t for t in all_tickets
        if t.created_at and current_start <= t.created_at <= current_end
    ]

    previous_tickets = [
        t for t in all_tickets
        if t.created_at and previous_start <= t.created_at < previous_end
    ]

    current_counts = {}
    previous_counts = {}
    current_topic_tickets = {}

    # Count tickets in current period
    for t in current_tickets:
        topic_id = t.topic_id

        if topic_id is None or topic_id not in topic_name_by_id:
            continue

        current_counts[topic_id] = current_counts.get(topic_id, 0) + 1

        if topic_id not in current_topic_tickets:
            current_topic_tickets[topic_id] = []

        current_topic_tickets[topic_id].append({
            "id": t.id,
            "text": t.text,
            "author": t.author,
            "source_link": t.source_link
        })

    # Count tickets in previous period
    for t in previous_tickets:
        topic_id = t.topic_id

        if topic_id is None or topic_id not in topic_name_by_id:
            continue

        previous_counts[topic_id] = previous_counts.get(topic_id, 0) + 1

    trends = []

    for topic_id, count in current_counts.items():
        previous_count = previous_counts.get(topic_id, 0)
        diff = count - previous_count

        if diff > 0:
            direction = "up"
            change = f"+{diff} vs previous period"
        elif diff < 0:
            direction = "down"
            change = f"{diff} vs previous period"
        else:
            direction = "stable"
            change = "0 vs previous period"

        trends.append({
            "topic_id": topic_id,
            "topic": topic_name_by_id[topic_id],
            "is_active": True,
            "count": count,
            "direction": direction,
            "change": change,
            "tickets": current_topic_tickets.get(topic_id, [])
        })

    trends.sort(key=lambda x: x["count"], reverse=True)

    top_n_raw = os.getenv("TOP_TRENDS_LIMIT", "8").strip()
    try:
        top_n = max(1, int(top_n_raw))
    except ValueError:
        top_n = 8

    trends = trends[:top_n]

    response = {
        "current_period": {
            "from": current_start.isoformat(),
            "to": current_end.isoformat()
        },
        "previous_period": {
            "from": previous_start.isoformat(),
            "to": previous_end.isoformat()
        },
        "trends": trends
    }

    db.close()
    return response