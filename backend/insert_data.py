import os
import pandas as pd
from database import SessionLocal, Ticket, engine, Base
from datetime import datetime
from sla import calculate_sla_deadline
from pathlib import Path

# Clean up existing database first
BASE_DIR = Path(__file__).resolve().parent

# Drop and recreate schema to apply column renames (fb_link -> source_link)
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# Load CSV safely
csv_path = BASE_DIR / "data" / "comments.csv"
df = pd.read_csv(csv_path, header=None)

# Rename columns
df.columns = ["platform", "category_raw", "text", "sentiment_raw", "urgent_flag"]

db = SessionLocal()

# Clear existing data instead of deleting file to avoid PermissionError
db.query(Ticket).delete()
db.commit()
print("🧹 Cleared existing tickets from database.")

for idx, row in df.iterrows():
    created_at = datetime.utcnow()

    # Map sentiment_raw to proper fixed categories: positive, negative, off-topic, suggestion, interrogative
    sentiment_map = {
        "positive": "positive",
        "negative": "negative",
        "interrogative": "interrogative",
        "off-topic": "off-topic",
        "suggestion": "suggestion",
        "neutral": "negative" # default to negative as requested by user
    }
    mapped_category = sentiment_map.get(row["sentiment_raw"].lower(), "negative")
    
    # Generate a dummy but valid looking link for source_link
    source_link = f"https://www.facebook.com/search/posts?q={row['platform']}_{idx}" if row["platform"].lower() == "facebook" else f"https://www.google.com/search?q={row['platform']}_{idx}"

    ticket = Ticket(
        text=row["text"],
        author="unknown",
        platform=row["platform"],
        source_link=source_link,

        created_at=created_at,

        category=mapped_category,
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

print("✅ Data inserted successfully with standardized categories and source links")