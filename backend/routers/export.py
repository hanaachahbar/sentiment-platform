from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from database import SessionLocal, Ticket
import csv
import io

router = APIRouter()

@router.get("/api/export")
def export_data():
    db = SessionLocal()
    tickets = db.query(Ticket).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["id", "text", "category", "status"])

    for t in tickets:
        writer.writerow([t.id, t.text, t.category, t.status])

    output.seek(0)

    return StreamingResponse(output, media_type="text/csv")