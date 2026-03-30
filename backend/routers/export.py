from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from database import SessionLocal, Ticket
import csv
import io
from datetime import datetime

router = APIRouter()

@router.get("/api/export")
def export_data(from_date: str = None, to_date: str = None, status: str = None, category: str = None):
    db = SessionLocal()
    query = db.query(Ticket)

    if status:
        query = query.filter(Ticket.status == status)
    if category:
        query = query.filter(Ticket.category == category)

    tickets = query.all()

    # Optional date filtering in Python for simplicity
    if from_date:
        start = datetime.fromisoformat(from_date)
        tickets = [t for t in tickets if t.created_at and t.created_at >= start]
    if to_date:
        end = datetime.fromisoformat(to_date)
        tickets = [t for t in tickets if t.created_at and t.created_at <= end]

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["id", "text", "category", "category_manual", "status", "platform", "created_at", "topic"])

    for t in tickets:
        writer.writerow([
            t.id,
            t.text,
            t.category,
            t.category_manual,
            t.status,
            t.platform,
            t.created_at,
            t.topic
        ])

    output.seek(0)
    db.close()

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tickets_export.csv"}
    )