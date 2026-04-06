import pandas as pd
from database import SessionLocal, Ticket, engine, Base
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Recreate schema
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# Load CSV
csv_path = BASE_DIR / "data" / "comments_clean_with_reference.csv"
df = pd.read_csv(csv_path)

print("Columns found:")
print(df.columns.tolist())
print("Initial shape:", df.shape)

# Remove fully empty rows
df = df.dropna(how="all")

# Remove rows with missing essential fields
df = df[df["text"].notna()]
df = df[df["text"].astype(str).str.strip() != ""]
df = df[df["platform"].notna()]
df = df[df["category"].notna()]
df = df[df["created_at"].notna()]
df = df[df["sla_deadline"].notna()]
df = df[df["status"].notna()]
df = df[df["fetched_at"].notna()]

print("Shape after cleaning:", df.shape)

db = SessionLocal()

# Clear existing records
db.query(Ticket).delete()
db.commit()
print("Cleared existing tickets from database.")

for _, row in df.iterrows():
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
        topic=str(row["topic"]).strip() if pd.notna(row["topic"]) and str(row["topic"]).strip() != "" else None,
        sla_deadline=pd.to_datetime(row["sla_deadline"]),
        status=str(row["status"]).strip(),
        fetched_at=pd.to_datetime(row["fetched_at"]),
    )

    db.add(ticket)

db.commit()
db.close()

print("Data inserted successfully.")