from datetime import timedelta
from pathlib import Path

import pandas as pd

from database import Base, SessionLocal, Ticket, TopicDictionary, engine
from time_utils import now_local

BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "data" / "comments_clean_with_reference.csv"

# For realistic testing: some tickets are recent, some old, some last week/month.
HOUR_OFFSETS = [2, 5, 8, 12, 18, 24, 30, 36, 50, 60, 72, 84, 96, 120, 144, 168, 240, 360, 520, 760]
VALID_PLATFORMS = {"facebook", "instagram"}
VALID_STATUSES = {"open", "resolved", "breached"}


def clean_str(value, default="") -> str:
    if pd.isna(value):
        return default
    text = str(value).strip()
    return text if text else default


def clean_bool(value) -> bool:
    if pd.isna(value):
        return False
    return str(value).strip().lower() in {"true", "1", "yes", "y", "urgent"}


def normalize_platform(value: str, row_index: int) -> str:
    platform = clean_str(value, "").lower()
    if platform in VALID_PLATFORMS:
        return platform
    # Fallback keeps the demo usable even if old CSV rows missed platform.
    return "facebook" if row_index % 2 == 0 else "instagram"


def get_or_create_topic(db, topic_name: str) -> TopicDictionary:
    topic_name = topic_name or "Other"
    topic = db.query(TopicDictionary).filter(TopicDictionary.topic_name == topic_name).first()
    if topic:
        return topic
    topic = TopicDictionary(topic_name=topic_name, is_active=True)
    db.add(topic)
    db.flush()
    return topic


def main() -> None:
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV file not found: {CSV_PATH}")

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    df = pd.read_csv(CSV_PATH)
    df = df.dropna(how="all")
    df = df[df["text"].notna()]
    df = df[df["text"].astype(str).str.strip() != ""]
    df = df[df["category"].notna()]

    db = SessionLocal()
    now = now_local()

    try:
        inserted = 0
        for idx, (_, row) in enumerate(df.iterrows()):
            topic = get_or_create_topic(db, clean_str(row.get("topic"), "Other"))
            platform = normalize_platform(row.get("platform"), idx)

            created_at = now - timedelta(hours=HOUR_OFFSETS[idx % len(HOUR_OFFSETS)])
            fetched_at = created_at + timedelta(minutes=5)
            sla_deadline = created_at + timedelta(hours=48)

            raw_status = clean_str(row.get("status"), "open").lower()
            status = raw_status if raw_status in VALID_STATUSES else "open"
            # Make old unresolved tickets breached so SLA pages/charts can be tested immediately.
            if status == "open" and now > sla_deadline:
                status = "breached"

            ticket = Ticket(
                text=clean_str(row.get("text")),
                author=clean_str(row.get("author"), "unknown"),
                platform=platform,
                source_link=clean_str(row.get("fb_link") or row.get("source_link"), None),
                created_at=created_at,
                fetched_at=fetched_at,
                category=clean_str(row.get("category"), "unknown").lower(),
                category_manual=clean_str(row.get("category_manual"), None),
                manually_corrected=clean_bool(row.get("manually_corrected")),
                is_urgent=clean_bool(row.get("is_urgent")),
                topic_id=topic.id,
                sla_deadline=sla_deadline,
                status=status,
            )
            db.add(ticket)
            inserted += 1

        db.commit()
        print(f"✅ Inserted {inserted} tickets with facebook/instagram platforms and realistic dates.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
