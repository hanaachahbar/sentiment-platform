import os
import logging
from datetime import datetime

import httpx

from database import SessionLocal, Ticket
from ai_service import predict_category, predict_urgency, predict_topic
from sla import calculate_sla_deadline

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v25.0"


def fetch_facebook_posts():
    page_id = os.getenv("FB_PAGE_ID")
    access_token = os.getenv("FB_ACCESS_TOKEN")

    if not page_id or not access_token:
        logger.warning(
            "FB_PAGE_ID or FB_ACCESS_TOKEN not set — skipping Facebook fetch."
        )
        return

    url = (
        f"{GRAPH_API_BASE}/{page_id}/feed"
        f"?fields=id,message,created_time,from,permalink_url"
        f"&access_token={access_token}"
    )

    try:
        response = httpx.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPStatusError as exc:
        logger.error("Facebook API HTTP error: %s — %s", exc.response.status_code, exc.response.text)
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
            message = post.get("message", "")

            if not message:
                continue

            permalink = post.get("permalink_url") or f"https://facebook.com/{post.get('id', '')}"

            # Deduplicate
            existing = (
                db.query(Ticket)
                .filter(Ticket.fb_link == permalink)
                .first()
            )
            if existing:
                continue

            # Parse timestamp
            created_time_str = post.get("created_time", "")
            try:
                created_at = datetime.strptime(
                    created_time_str, "%Y-%m-%dT%H:%M:%S%z"
                ).replace(tzinfo=None)
            except (ValueError, TypeError):
                created_at = datetime.utcnow()

            # Run AI inference
            category = predict_category(message)
            is_urgent = predict_urgency(category)
            topic = predict_topic(message)

            # Derive sentiment from category
            if category in ("Complaint", "Escalation"):
                sentiment = "Negative"
            elif category == "Compliment":
                sentiment = "Positive"
            else:
                sentiment = "Neutral"

            # Author info
            from_data = post.get("from", {})
            author = from_data.get("name", "Facebook User")

            ticket = Ticket(
                text=message,
                author=author,
                platform="Facebook",
                fb_link=permalink,
                created_at=created_at,
                category=category,
                category_manual=None,
                manually_corrected=False,
                sentiment=sentiment,
                is_urgent=is_urgent,
                topic=topic,
                sla_deadline=calculate_sla_deadline(created_at),
                status="open",
            )
            db.add(ticket)
            new_count += 1

        db.commit()
        logger.info("Facebook fetch complete — %d new tickets created.", new_count)
    except Exception:
        db.rollback()
        logger.exception("Error during Facebook fetch")
    finally:
        db.close()
