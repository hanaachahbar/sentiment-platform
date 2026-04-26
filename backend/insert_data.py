import pandas as pd
from datetime import timedelta
from database import SessionLocal, Ticket, TopicDictionary, engine, Base
from pathlib import Path
from time_utils import now_local

BASE_DIR = Path(__file__).resolve().parent

# Reset DB
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# Load CSV
csv_path = BASE_DIR / "data" / "comments.csv"
df = pd.read_csv(csv_path)

# Clean
df = df.dropna(how="all")
df = df[df["text"].notna()]

db = SessionLocal()

now = now_local()

# Time distribution (VERY IMPORTANT)
hour_offsets = [2, 6, 12, 24, 48, 72, 96, 120, 168, 240]

for idx, row in df.iterrows():

    topic_name = str(row["topic"]).strip()

    topic_obj = db.query(TopicDictionary).filter_by(topic_name=topic_name).first()
    if not topic_obj:
        topic_obj = TopicDictionary(topic_name=topic_name)
        db.add(topic_obj)
        db.flush()

    offset = hour_offsets[idx % len(hour_offsets)]

    created_at = now - timedelta(hours=offset)
    sla_deadline = created_at + timedelta(hours=48)

    ticket = Ticket(
        text=row["text"],
        author=row["author"],
        platform=row["platform"].lower(),
        source_link=row["source_link"],
        created_at=created_at,

        category=row["category"].lower(),
        category_manual=None,
        manually_corrected=False,

        is_urgent=bool(row["is_urgent"]),

        topic_id=topic_obj.id,

        sla_deadline=sla_deadline,
        status="open",
        fetched_at=created_at + timedelta(minutes=5),
    )

    db.add(ticket)

db.commit()
db.close()

print("✅ Data inserted with realistic distribution.")