import random
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

from database import SessionLocal, Ticket, Base, engine
from ai_service import predict_category, predict_urgency, predict_topic
from sla import calculate_sla_deadline

# Recreate tables
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# Load CSV
BASE_DIR = Path(__file__).resolve().parent
csv_path = BASE_DIR / "data" / "comments.csv"

df = pd.read_csv(csv_path, header=None)
df.columns = ["platform", "category_raw", "text", "sentiment_raw", "urgent_flag"]

# Realistic author names
_AUTHORS = [
    "Youssef B.", "Fatima Z.", "Amine K.", "Sara M.", "Khalid R.",
    "Nadia L.", "Omar H.", "Leila A.", "Rachid T.", "Imane D.",
    "Hassan E.", "Khadija N.", "Mehdi S.", "Zineb F.", "Hamza O.",
    "Aicha G.", "Mouad C.", "Salma W.", "Ayoub J.", "Meryem P.",
]


def _sentiment_from_category(category: str) -> str:
    if category in ("Complaint", "Escalation"):
        return "Negative"
    if category == "Compliment":
        return "Positive"
    return "Neutral"

db = SessionLocal()

# Insert CSV rows with varied timestamps
now = datetime.utcnow()

for idx, row in df.iterrows():
    text = str(row["text"])

    # Spread over the last 7 days for trend testing
    hours_ago = random.randint(1, 168)  # 1 hour to 7 days
    created_at = now - timedelta(hours=hours_ago)

    # Run AI inference
    category = predict_category(text)
    is_urgent = predict_urgency(category)
    topic = predict_topic(text)

    sentiment = _sentiment_from_category(category)

    author = random.choice(_AUTHORS)
    fb_link = f"https://facebook.com/post/{random.randint(100000, 999999)}"

    ticket = Ticket(
        text=text,
        author=author,
        platform=row["platform"],
        fb_link=fb_link,
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

db.commit()
db.close()

print(f"Data inserted: {len(df)} CSV rows")