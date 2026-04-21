from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from database import SessionLocal, Ticket
from io import BytesIO, StringIO
from datetime import datetime
from sqlalchemy import case, and_
import pandas as pd

router = APIRouter()

EXPORT_COLUMNS = {
    "customerName": ("Customer Name", lambda ticket, final_category: ticket.author or "Unknown"),
    "dateTime": ("Date & Time", lambda ticket, final_category: ticket.created_at),
    "commentText": ("Comment Text", lambda ticket, final_category: ticket.text),
    "isUrgent": ("isUrgent", lambda ticket, final_category: ticket.is_urgent or ""),
    "category": ("Category", lambda ticket, final_category: final_category),
    "status": ("Status", lambda ticket, final_category: ticket.status),
    "slaValue": ("SLA Value", lambda ticket, final_category: ticket.sla_deadline),
    "platform": ("Platform", lambda ticket, final_category: ticket.platform),
}

@router.get("/api/export")
def export_data(
    from_date: str = None,
    to_date: str = None,
    status: str = None,
    category: str = None,
    columns: str = None,
    file_format: str = "csv",
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

        selected_keys = [key.strip() for key in (columns or "").split(",") if key.strip()]
        if not selected_keys:
            selected_keys = list(EXPORT_COLUMNS.keys())

        selected_keys = [key for key in selected_keys if key in EXPORT_COLUMNS]
        if not selected_keys:
            selected_keys = list(EXPORT_COLUMNS.keys())

        rows = []
        for t in tickets:
            final_category = (
                t.category_manual
                if t.manually_corrected and t.category_manual
                else t.category
            )

            row = {}
            for key in selected_keys:
                header, extractor = EXPORT_COLUMNS[key]
                row[header] = extractor(t, final_category)
            rows.append(row)

        dataframe = pd.DataFrame(rows, columns=[EXPORT_COLUMNS[key][0] for key in selected_keys])

        normalized_format = (file_format or "csv").strip().lower()
        if normalized_format in {"excel", "xlsx"}:
            output = BytesIO()
            dataframe.to_excel(output, index=False, engine="openpyxl")
            output.seek(0)
            return StreamingResponse(
                output,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=tickets_export.xlsx"}
            )

        output = StringIO()
        dataframe.to_csv(output, index=False)
        output.seek(0)

        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=tickets_export.csv"}
        )

    finally:
        db.close()