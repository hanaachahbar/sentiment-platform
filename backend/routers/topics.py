from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from database import SessionLocal, TopicDictionary

router = APIRouter()


class TopicRenameRequest(BaseModel):
    topic_name: str


@router.patch("/api/topics/{id}/rename")
def rename_topic(id: int, body: TopicRenameRequest):
    """
    Rename an existing topic in topics_dictionary.

    Because all tickets reference topics via topic_id (FK),
    renaming the topic here automatically updates the displayed
    name across ALL tickets and trend results — no ticket rows
    are modified.
    """
    db = SessionLocal()
    try:
        # Check topic exists
        topic = db.query(TopicDictionary).filter(TopicDictionary.id == id).first()
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")

        # If new name already exists on a different topic, just return that existing topic
        new_name = body.topic_name.strip()
        existing = (
            db.query(TopicDictionary)
            .filter(TopicDictionary.topic_name == new_name)
            .first()
        )
        if existing and existing.id != id:
            # Name is already taken — return the existing topic as-is
            return {
                "id": existing.id,
                "topic_name": existing.topic_name,
                "is_active": existing.is_active,
                "updated_at": existing.updated_at.isoformat(),
                "note": "Topic name already existed — returning existing topic",
            }

        # Apply rename — all tickets with this topic_id reflect the change instantly
        topic.topic_name = new_name
        topic.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(topic)

        return {
            "id": topic.id,
            "topic_name": topic.topic_name,
            "is_active": topic.is_active,
            "updated_at": topic.updated_at.isoformat(),
        }

    finally:
        db.close()