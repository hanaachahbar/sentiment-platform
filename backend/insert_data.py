import pandas as pd
from database import SessionLocal, Ticket
from datetime import datetime
from sla import calculate_sla_deadline
from pathlib import Path

# Load CSV safely
BASE_DIR = Path(__file__).resolve().parent
csv_path = BASE_DIR / "data" / "comments.csv"

df = pd.read_csv(csv_path, header=None)

# Rename columns
df.columns = ["platform", "category_raw", "text", "sentiment_raw", "urgent_flag"]

db = SessionLocal()

for _, row in df.iterrows():
    created_at = datetime.utcnow()

    ticket = Ticket(
        text=row["text"],
        author="unknown",
        platform=row["platform"],
        fb_link="",

        created_at=created_at,

        category="Negative" if row["sentiment_raw"] == "negative" else "Neutral",
        category_manual=None,
        manually_corrected=False,


        is_urgent=True if row["urgent_flag"] == 1 else False,

        topic="installation issue",

        sla_deadline=calculate_sla_deadline(created_at),
        status="open"
    )

    db.add(ticket)

db.commit()
db.close()

print("✅ Data inserted successfully")