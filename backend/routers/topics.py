from fastapi import APIRouter, HTTPException, Body
from database import SessionLocal, TopicDictionary
from time_utils import now_local

router = APIRouter()


def _serialize_topic(topic: TopicDictionary) -> dict:
    return {
        "id": topic.id,
        "topic_name": topic.topic_name,
        "is_active": topic.is_active,
        "updated_at": topic.updated_at.isoformat() if topic.updated_at else None,
    }

@router.get("/api/topics")
def get_topics():
    db = SessionLocal()
    try:
        topics = db.query(TopicDictionary).all()
        return [
            {
                "id": t.id,
                "topic_name": t.topic_name,
                "is_active": t.is_active
            }
            for t in topics
        ]
    finally:
        db.close()

@router.patch("/api/topics/{id}/rename")
@router.patch("/api/topics/{id}")
def rename_topic(id: int, data: dict = Body(...)):
    db = SessionLocal()
    try:
        topic = db.query(TopicDictionary).filter(TopicDictionary.id == id).first()

        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")

        if "topic_name" not in data:
            raise HTTPException(status_code=400, detail="Missing topic_name in request body")

        new_name = str(data["topic_name"]).strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="topic_name cannot be empty")

        existing = db.query(TopicDictionary).filter(
            TopicDictionary.topic_name == new_name,
            TopicDictionary.id != id
        ).first()

        if existing:
            return _serialize_topic(existing)

        topic.topic_name = new_name
        topic.updated_at = now_local()
        db.commit()
        db.refresh(topic)

        return _serialize_topic(topic)

    finally:
        db.close()