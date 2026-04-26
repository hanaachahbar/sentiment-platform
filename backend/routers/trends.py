import os
from datetime import timedelta

from fastapi import APIRouter

from database import SessionLocal, Ticket, TopicDictionary
from query_utils import apply_platform_filter, get_time_window
from time_utils import now_local

router = APIRouter()


@router.get("/api/trends")
def get_trends(platform: str = None, time_range: str = "last_48h", from_date: str = None, to_date: str = None):
    db = SessionLocal()
    try:
        current_start, current_end, normalized_range = get_time_window(time_range, from_date, to_date)
        if current_start is None or current_end is None:
            current_end = now_local()
            current_start = current_end - timedelta(hours=48)
            normalized_range = "last_48h"

        duration = current_end - current_start
        previous_end = current_start
        previous_start = current_start - duration

        active_topics = db.query(TopicDictionary).filter(TopicDictionary.is_active == True).all()
        topic_name_by_id = {topic.id: topic.topic_name for topic in active_topics}

        current_query = db.query(Ticket).filter(Ticket.created_at >= current_start).filter(Ticket.created_at < current_end)
        previous_query = db.query(Ticket).filter(Ticket.created_at >= previous_start).filter(Ticket.created_at < previous_end)
        current_query = apply_platform_filter(current_query, platform)
        previous_query = apply_platform_filter(previous_query, platform)

        current_tickets = current_query.all()
        previous_tickets = previous_query.all()

        current_counts = {}
        previous_counts = {}
        current_topic_tickets = {}

        for ticket in current_tickets:
            if ticket.topic_id is None or ticket.topic_id not in topic_name_by_id:
                continue
            current_counts[ticket.topic_id] = current_counts.get(ticket.topic_id, 0) + 1
            current_topic_tickets.setdefault(ticket.topic_id, []).append({
                "id": ticket.id,
                "text": ticket.text,
                "author": ticket.author,
                "platform": ticket.platform,
                "source_link": ticket.source_link,
                "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
            })

        for ticket in previous_tickets:
            if ticket.topic_id is None or ticket.topic_id not in topic_name_by_id:
                continue
            previous_counts[ticket.topic_id] = previous_counts.get(ticket.topic_id, 0) + 1

        trends = []
        for topic_id, count in current_counts.items():
            previous_count = previous_counts.get(topic_id, 0)
            diff = count - previous_count
            direction = "up" if diff > 0 else "down" if diff < 0 else "stable"
            change = f"+{diff} vs previous period" if diff > 0 else f"{diff} vs previous period" if diff < 0 else "0 vs previous period"
            trends.append({
                "topic_id": topic_id,
                "topic": topic_name_by_id[topic_id],
                "is_active": True,
                "count": count,
                "previous_count": previous_count,
                "direction": direction,
                "change": change,
                "platform": platform or "all",
                "tickets": current_topic_tickets.get(topic_id, []),
            })

        trends.sort(key=lambda item: item["count"], reverse=True)
        try:
            top_n = max(1, int(os.getenv("TOP_TRENDS_LIMIT", "8")))
        except ValueError:
            top_n = 8

        return {
            "time_range": normalized_range,
            "platform": platform or "all",
            "current_period": {"from": current_start.isoformat(), "to": current_end.isoformat()},
            "previous_period": {"from": previous_start.isoformat(), "to": previous_end.isoformat()},
            "trends": trends[:top_n],
        }
    finally:
        db.close()
