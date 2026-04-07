import pandas as pd
from database import SessionLocal, Ticket, TopicDictionary, engine, Base
from pathlib import Path
from datetime import datetime, timedelta

BASE_DIR = Path(__file__).resolve().parent

# Recreate DB from scratch
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# CSV path
csv_path = BASE_DIR / "data" / "comments_clean_with_reference.csv"
df = pd.read_csv(csv_path)

# Clean rows
df = df.dropna(how="all")
df = df[df["text"].notna()]
df = df[df["text"].astype(str).str.strip() != ""]
df = df[df["platform"].notna()]
df = df[df["category"].notna()]

db = SessionLocal()
db.query(Ticket).delete()
db.query(TopicDictionary).delete()
db.commit()

# Spread the tickets over time for testing
# Some in last 48h, some before, so trends and breached statuses can be tested
hour_offsets = [2, 5, 8, 12, 18, 24, 30, 36, 50, 60, 72, 84, 96, 120, 144, 168]

now = datetime.utcnow()

for idx, (_, row) in enumerate(df.iterrows()):
    topic_name = str(row["topic"]).strip() if pd.notna(row["topic"]) and str(row["topic"]).strip() != "" else "Other"

    # create topic in dictionary if not exists
    topic_obj = db.query(TopicDictionary).filter(TopicDictionary.topic_name == topic_name).first()
    if not topic_obj:
        topic_obj = TopicDictionary(topic_name=topic_name)
        db.add(topic_obj)
        db.flush()

    # assign different times
    offset_hours = hour_offsets[idx % len(hour_offsets)]
    created_at = now - timedelta(hours=offset_hours)
    fetched_at = created_at + timedelta(minutes=5)
    sla_deadline = created_at + timedelta(hours=48)

    ticket = Ticket(
        text=str(row["text"]).strip(),
        author=str(row["author"]).strip() if pd.notna(row["author"]) and str(row["author"]).strip() != "" else "unknown",
        platform=str(row["platform"]).strip(),
        source_link=str(row["fb_link"]).strip() if pd.notna(row["fb_link"]) and str(row["fb_link"]).strip() != "" else None,
        created_at=created_at,
        category=str(row["category"]).strip(),
        category_manual=str(row["category_manual"]).strip() if pd.notna(row["category_manual"]) and str(row["category_manual"]).strip() != "" else None,
        manually_corrected=str(row["manually_corrected"]).strip().lower() == "true" if pd.notna(row["manually_corrected"]) else False,
        is_urgent=str(row["is_urgent"]).strip().lower() == "true" if pd.notna(row["is_urgent"]) else False,
        topic_id=topic_obj.id,
        sla_deadline=sla_deadline,
        status="open",
        fetched_at=fetched_at,
    )

    db.add(ticket)

db.commit()
db.close()

print("✅ Data inserted successfully with different timestamps.")