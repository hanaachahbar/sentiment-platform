from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from database import SessionLocal, Ticket
from datetime import datetime, timedelta
import csv
import io

router = APIRouter()


@router.get("/api/export")
def export_data(
    request: Request,
):
    params = request.query_params
    from_date = params.get("from") or params.get("from_date")
    to_date = params.get("to") or params.get("to_date")
    status = params.get("status")
    category = params.get("category")

    db = SessionLocal()
    query = db.query(Ticket)

    # Apply filters
    if from_date:
        try:
            start = datetime.strptime(from_date, "%Y-%m-%d")
            query = query.filter(Ticket.created_at >= start)
        except ValueError:
            pass

    if to_date:
        try:
            end = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(Ticket.created_at < end)
        except ValueError:
            pass

    if status:
        query = query.filter(Ticket.status == status)

    if category:
        query = query.filter(Ticket.category == category)

    tickets = query.all()
    db.close()

    # Build CSV with ALL fields
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "id", "text", "author", "platform", "fb_link",
        "created_at", "category", "category_manual", "manually_corrected",
        "sentiment", "is_urgent", "topic", "sla_deadline", "status",
    ])

    for t in tickets:
        writer.writerow([
            t.id, t.text, t.author, t.platform, t.fb_link,
            t.created_at, t.category, t.category_manual, t.manually_corrected,
            t.sentiment, t.is_urgent, t.topic, t.sla_deadline, t.status,
        ])

    output.seek(0)

    filename = f"tickets_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )