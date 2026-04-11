import os
import re
import logging
from pathlib import Path

import httpx
from dotenv import load_dotenv

from database import SessionLocal, Ticket, TopicDictionary
from ai_service import predict_category, predict_urgency, predict_topic
from sla import calculate_sla_deadline
from topic_model_service import predict_topic as predict_topic_with_model
from time_utils import now_local, parse_facebook_time_to_local

logger = logging.getLogger(__name__)


def _graph_api_base() -> str:
    version = os.getenv("FB_GRAPH_API_VERSION", "v25.0")
    return f"https://graph.facebook.com/{version}"


def _load_env_files(override: bool) -> None:
    backend_dir = Path(__file__).resolve().parent
    project_root = backend_dir.parent
    load_dotenv(project_root / ".env", override=override)
    load_dotenv(backend_dir / ".env", override=override)


def _get_facebook_credentials() -> tuple[str, str]:
    page_id = (os.getenv("FB_PAGE_ID") or "").strip()
    access_token = (os.getenv("FB_ACCESS_TOKEN") or "").strip()

    if page_id and access_token:
        return page_id, access_token

    # Try loading .env files without overriding explicitly set values.
    _load_env_files(override=False)
    page_id = (os.getenv("FB_PAGE_ID") or "").strip()
    access_token = (os.getenv("FB_ACCESS_TOKEN") or "").strip()
    if page_id and access_token:
        return page_id, access_token

    # Retry with override=True in case process env contains empty placeholders.
    _load_env_files(override=True)
    return (os.getenv("FB_PAGE_ID") or "").strip(), (os.getenv("FB_ACCESS_TOKEN") or "").strip()


def _clean_comment_text(value: str) -> str:
    """Normalize comment text and drop noisy placeholders."""
    if not value:
        return ""

    cleaned = str(value)
    cleaned = cleaned.replace("\xa0", " ").replace("\u200b", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # Ignore synthetic post-title values such as "Post #03".
    if re.fullmatch(r"post\s*#\d+", cleaned, flags=re.IGNORECASE):
        return ""
    if re.fullmatch(r"comment\s*#\d+", cleaned, flags=re.IGNORECASE):
        return ""

    # Skip comments that are mostly symbols/emojis with no letters.
    if not any(ch.isalpha() for ch in cleaned):
        return ""

    return cleaned


def _build_comment_link(
    comment_id: str,
    post_id: str,
    comment_permalink: str,
    post_permalink: str,
) -> str:
    """Return best available comment URL with a stable non-null fallback."""
    if comment_permalink:
        return comment_permalink

    if post_id and comment_id:
        return f"https://facebook.com/{post_id}?comment_id={comment_id}"

    if post_permalink and comment_id:
        return f"{post_permalink}?comment_id={comment_id}"

    return f"https://facebook.com/{comment_id}"


def _get_or_create_topic_id(db, topic_name: str, topic_model_id: int | None = None) -> int:
    cleaned = (topic_name or "").strip() or "Other"

    if topic_model_id is not None and topic_model_id >= 0:
        existing_by_id = db.query(TopicDictionary).filter(TopicDictionary.id == topic_model_id).first()
        if existing_by_id:
            if cleaned and existing_by_id.topic_name != cleaned:
                existing_by_id.topic_name = cleaned
                existing_by_id.updated_at = now_local()
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
    page_id, access_token = _get_facebook_credentials()

    if not page_id or not access_token:
        backend_dir = Path(__file__).resolve().parent
        project_root = backend_dir.parent
        logger.warning(
            "FB_PAGE_ID or FB_ACCESS_TOKEN not set; checked %s and %s",
            project_root / ".env",
            backend_dir / ".env",
        )
        return {
            "success": False,
            "inserted_count": 0,
            "error": "FB_PAGE_ID or FB_ACCESS_TOKEN not set (check .env in project root or backend)",
        }

    url = f"{_graph_api_base()}/{page_id}/posts"
    params = {
        "fields": "id,permalink_url,comments.limit(100){id,message,created_time,from,permalink_url}",
        "limit": 25,
        "access_token": access_token,
    }

    try:
        response = httpx.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPStatusError as exc:
        logger.error("Facebook API HTTP error: %s - %s", exc.response.status_code, exc.response.text)
        return {
            "success": False,
            "inserted_count": 0,
            "error": f"Facebook API HTTP error: {exc.response.status_code}",
        }
    except httpx.RequestError as exc:
        logger.error("Facebook API request error: %s", exc)
        return {
            "success": False,
            "inserted_count": 0,
            "error": f"Facebook API request error: {exc}",
        }

    posts = data.get("data", [])
    if not posts:
        logger.info("No posts returned from Facebook API.")
        return {
            "success": True,
            "inserted_count": 0,
            "error": None,
        }

    comments_payload = []
    for post in posts:
        post_graph_id = (post.get("id") or "").strip()
        post_permalink = post.get("permalink_url")
        comments = (post.get("comments") or {}).get("data", [])

        for comment in comments:
            comment_id = (comment.get("id") or "").strip()
            if not comment_id:
                continue

            message = _clean_comment_text(comment.get("message", ""))
            if not message:
                continue

            comment_link = _build_comment_link(
                comment_id=comment_id,
                post_id=post_graph_id,
                comment_permalink=(comment.get("permalink_url") or "").strip(),
                post_permalink=(post_permalink or "").strip(),
            )

            comments_payload.append(
                {
                    "id": comment_id,
                    "message": message,
                    "created_time": comment.get("created_time", ""),
                    "from": comment.get("from", {}),
                    "permalink_url": comment_link,
                }
            )

    if not comments_payload:
        logger.info("No comments returned from Facebook API posts.")
        return {
            "success": True,
            "inserted_count": 0,
            "error": None,
        }

    db = SessionLocal()
    new_count = 0

    try:
        for post in comments_payload:
            post_id = (post.get("id") or "").strip()
            message = (post.get("message") or "").strip()

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
                created_at = parse_facebook_time_to_local(created_time_str)
            except (ValueError, TypeError):
                created_at = now_local()

            category = predict_category(message)
            is_urgent = predict_urgency(category, message)
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
                fetched_at=now_local(),
            )
            db.add(ticket)
            new_count += 1

        db.commit()
        logger.info("Facebook fetch complete - %d new tickets created.", new_count)
        return {
            "success": True,
            "inserted_count": new_count,
            "error": None,
        }
    except Exception:
        db.rollback()
        logger.exception("Error during Facebook fetch")
        return {
            "success": False,
            "inserted_count": 0,
            "error": "Error during Facebook fetch",
        }
    finally:
        db.close()
