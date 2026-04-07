from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from database import SessionLocal, Ticket
import csv
import io
from datetime import datetime
from sqlalchemy import case, and_

router = APIRouter()

@router.get("/api/export")
def export_data(
    from_date: str = None,
    to_date: str = None,
    status: str = None,
    category: str = None
):
    db = SessionLocal()

    try:
        effective_category = case(
            (
                and_(
                    Ticket.manually_corrected == True,
                    Ticket.category_manual.isnot(None),
                    Ticket.category_manual != ""
                ),
                Ticket.category_manual
            ),
            else_=Ticket.category
        )

        query = db.query(Ticket)

        if status:
            query = query.filter(Ticket.status == status)

        if category:
            query = query.filter(effective_category == category)

        tickets = query.all()

        if from_date:
            start = datetime.fromisoformat(from_date)
            tickets = [t for t in tickets if t.created_at and t.created_at >= start]

        if to_date:
            end = datetime.fromisoformat(to_date)
            tickets = [t for t in tickets if t.created_at and t.created_at <= end]

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "id",
            "text",
            "category",
            "category_original",
            "category_manual",
            "status",
            "platform",
            "source_link",
            "created_at",
            "topic"
        ])

        for t in tickets:
            final_category = (
                t.category_manual
                if t.manually_corrected and t.category_manual
                else t.category
            )

            writer.writerow([
                t.id,
                t.text,
                final_category,
                t.category,
                t.category_manual,
                t.status,
                t.platform,
                t.source_link,
                t.created_at,
                t.topic_ref.topic_name if t.topic_ref else "Other"
            ])

        output.seek(0)

        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=tickets_export.csv"}
        )

    finally:
        db.close()