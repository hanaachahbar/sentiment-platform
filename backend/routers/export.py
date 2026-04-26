from io import BytesIO, StringIO

import pandas as pd
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from database import SessionLocal, Ticket
from query_utils import apply_platform_filter, apply_time_filter, effective_category_expr, get_time_window

router = APIRouter()

EXPORT_COLUMNS = {
    "id": ("ID", lambda t, c: t.id),
    "customerName": ("Customer Name", lambda t, c: t.author or "unknown"),
    "dateTime": ("Date & Time", lambda t, c: t.created_at),
    "commentText": ("Comment Text", lambda t, c: t.text),
    "isUrgent": ("isUrgent", lambda t, c: bool(t.is_urgent)),
    "category": ("Category", lambda t, c: c),
    "categoryOriginal": ("Original Category", lambda t, c: t.category),
    "status": ("Status", lambda t, c: t.status),
    "slaValue": ("SLA Value", lambda t, c: t.sla_deadline),
    "platform": ("Platform", lambda t, c: t.platform),
    "topic": ("Topic", lambda t, c: t.topic_ref.topic_name if t.topic_ref else "Other"),
    "sourceLink": ("Source Link", lambda t, c: t.source_link),
}


@router.get("/api/export")
def export_data(
    platform: str = None,
    time_range: str = "all",
    from_date: str = None,
    to_date: str = None,
    status: str = None,
    category: str = None,
    columns: str = None,
    file_format: str = "csv",
):
    db = SessionLocal()
    try:
        start, end, _ = get_time_window(time_range, from_date, to_date)
        effective_category = effective_category_expr()

        query = db.query(Ticket)
        query = apply_platform_filter(query, platform)
        query = apply_time_filter(query, start, end)

        if status and status.strip().lower() != "all":
            query = query.filter(Ticket.status == status.strip().lower())
        if category and category.strip().lower() != "all":
            query = query.filter(effective_category == category.strip().lower())

        tickets = query.order_by(Ticket.created_at.desc()).all()

        selected_keys = [key.strip() for key in (columns or "").split(",") if key.strip()]
        if not selected_keys:
            selected_keys = list(EXPORT_COLUMNS.keys())
        selected_keys = [key for key in selected_keys if key in EXPORT_COLUMNS] or list(EXPORT_COLUMNS.keys())

        rows = []
        for ticket in tickets:
            final_category = ticket.category_manual if ticket.manually_corrected and ticket.category_manual else ticket.category
            rows.append({EXPORT_COLUMNS[key][0]: EXPORT_COLUMNS[key][1](ticket, final_category) for key in selected_keys})

        dataframe = pd.DataFrame(rows, columns=[EXPORT_COLUMNS[key][0] for key in selected_keys])

        normalized_format = (file_format or "csv").strip().lower()
        if normalized_format in {"excel", "xlsx"}:
            output = BytesIO()
            dataframe.to_excel(output, index=False, engine="openpyxl")
            output.seek(0)
            return StreamingResponse(
                output,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=tickets_export.xlsx"},
            )

        output = StringIO()
        dataframe.to_csv(output, index=False)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=tickets_export.csv"},
        )
    finally:
        db.close()
