import pandas as pd
from database import SessionLocal, Ticket, TopicDictionary, engine, Base
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

csv_path = BASE_DIR / "data" / "comments_clean_with_reference.csv"
df = pd.read_csv(csv_path)

df = df.dropna(how="all")
df = df[df["text"].notna()]
df = df[df["text"].astype(str).str.strip() != ""]
df = df[df["platform"].notna()]
df = df[df["category"].notna()]
df = df[df["created_at"].notna()]
df = df[df["sla_deadline"].notna()]
df = df[df["status"].notna()]
df = df[df["fetched_at"].notna()]

db = SessionLocal()
db.query(Ticket).delete()
db.query(TopicDictionary).delete()
db.commit()

for _, row in df.iterrows():
    topic_name = str(row["topic"]).strip() if pd.notna(row["topic"]) and str(row["topic"]).strip() != "" else "Other"

    topic_obj = db.query(TopicDictionary).filter(TopicDictionary.topic_name == topic_name).first()
    if not topic_obj:
        topic_obj = TopicDictionary(topic_name=topic_name)
        db.add(topic_obj)
        db.flush()

    ticket = Ticket(
        text=str(row["text"]).strip(),
        author=str(row["author"]).strip() if pd.notna(row["author"]) and str(row["author"]).strip() != "" else "unknown",
        platform=str(row["platform"]).strip(),
        source_link=str(row["fb_link"]).strip() if pd.notna(row["fb_link"]) and str(row["fb_link"]).strip() != "" else None,
        created_at=pd.to_datetime(row["created_at"]),
        category=str(row["category"]).strip(),
        category_manual=str(row["category_manual"]).strip() if pd.notna(row["category_manual"]) and str(row["category_manual"]).strip() != "" else None,
        manually_corrected=str(row["manually_corrected"]).strip().lower() == "true",
        is_urgent=str(row["is_urgent"]).strip().lower() == "true",
        topic_id=topic_obj.id,
        sla_deadline=pd.to_datetime(row["sla_deadline"]),
        status=str(row["status"]).strip(),
        fetched_at=pd.to_datetime(row["fetched_at"]),
    )

    db.add(ticket)

db.commit()
db.close()
print("Data inserted successfully.")