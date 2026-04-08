import os
import logging
from datetime import datetime

import httpx

from database import SessionLocal, Ticket, TopicDictionary
from ai_service import predict_category, predict_urgency, predict_topic
from sla import calculate_sla_deadline
from topic_model_service import predict_topic as predict_topic_with_model

logger = logging.getLogger(__name__)


def _graph_api_base() -> str:
    version = os.getenv("FB_GRAPH_API_VERSION", "v18.0")
    return f"https://graph.facebook.com/{version}"


def _get_or_create_topic_id(db, topic_name: str, topic_model_id: int | None = None) -> int:
    cleaned = (topic_name or "").strip() or "Other"

    if topic_model_id is not None and topic_model_id >= 0:
        existing_by_id = db.query(TopicDictionary).filter(TopicDictionary.id == topic_model_id).first()
        if existing_by_id:
            if cleaned and existing_by_id.topic_name != cleaned:
                existing_by_id.topic_name = cleaned
                existing_by_id.updated_at = datetime.utcnow()
            return existing_by_id.id

        existing_by_name = (
            db.query(TopicDictionary)
            .filter(TopicDictionary.topic_name == cleaned)
            .first()
        )
        if existing_by_name:
            return existing_by_name.id

        topic = TopicDictionary(id=topic_model_id, topic_name=cleaned)
        db.add(topic)
        db.flush()
        return topic.id

    topic = (
        db.query(TopicDictionary)
        .filter(TopicDictionary.topic_name == cleaned)
        .first()
    )
    if topic:
        return topic.id

    topic = TopicDictionary(topic_name=cleaned)
    db.add(topic)
    db.flush()
    return topic.id


def fetch_facebook_posts():
    page_id = os.getenv("FB_PAGE_ID")
    access_token = os.getenv("FB_ACCESS_TOKEN")

    if not page_id or not access_token:
        logger.warning(
            "FB_PAGE_ID or FB_ACCESS_TOKEN not set; skipping Facebook fetch."
        )
        return

    url = f"{_graph_api_base()}/{page_id}/feed"
    params = {
        "fields": "id,message,created_time,from,permalink_url",
        "access_token": access_token,
    }

    try:
        response = httpx.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPStatusError as exc:
        logger.error("Facebook API HTTP error: %s - %s", exc.response.status_code, exc.response.text)
        return
    except httpx.RequestError as exc:
        logger.error("Facebook API request error: %s", exc)
        return

    posts = data.get("data", [])
    if not posts:
        logger.info("No posts returned from Facebook API.")
        return

    db = SessionLocal()
    new_count = 0

    try:
        for post in posts:
            post_id = (post.get("id") or "").strip()
            message = post.get("message", "")

            if not post_id or not message:
                continue

            permalink = post.get("permalink_url") or f"https://facebook.com/{post.get('id', '')}"

            existing = (
                db.query(Ticket)
                .filter(Ticket.source_link == permalink)
                .first()
            )
            if existing:
                continue

            created_time_str = post.get("created_time", "")
            try:
                created_at = datetime.strptime(
                    created_time_str, "%Y-%m-%dT%H:%M:%S%z"
                ).replace(tzinfo=None)
            except (ValueError, TypeError):
                created_at = datetime.utcnow()

            category = predict_category(message)
            is_urgent = predict_urgency(category)
            topic_model_id, topic_name = predict_topic_with_model(message)

            if not topic_name:
                topic_name = predict_topic(message)

            topic_id = _get_or_create_topic_id(db, topic_name, topic_model_id)

            from_data = post.get("from", {})
            author = from_data.get("name", "Facebook User")

            ticket = Ticket(
                text=message,
                author=author,
                platform="Facebook",
                source_link=permalink,
                created_at=created_at,
                category=category,
                category_manual=None,
                manually_corrected=False,
                is_urgent=is_urgent,
                topic_id=topic_id,
                sla_deadline=calculate_sla_deadline(created_at),
                status="open",
                fetched_at=datetime.utcnow(),
            )
            db.add(ticket)
            new_count += 1

        db.commit()
        logger.info("Facebook fetch complete - %d new tickets created.", new_count)
    except Exception:
        db.rollback()
        logger.exception("Error during Facebook fetch")
    finally:
        db.close()
