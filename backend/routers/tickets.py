from fastapi import APIRouter, Body, HTTPException

from database import SessionLocal, Ticket
from query_utils import serialize_ticket
from time_utils import now_local

router = APIRouter()
VALID_STATUSES = {"open", "resolved", "breached"}


@router.post("/api/tickets/{id}/resolve")
def resolve_ticket(id: int):
    db = SessionLocal()
    try:
        ticket = db.query(Ticket).filter(Ticket.id == id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        ticket.status = "resolved"
        db.commit()
        db.refresh(ticket)
        return {"id": ticket.id, "status": ticket.status}
    finally:
        db.close()


@router.patch("/api/tickets/{id}/status")
def update_ticket_status(id: int, data: dict = Body(...)):
    db = SessionLocal()
    try:
        ticket = db.query(Ticket).filter(Ticket.id == id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        status = str(data.get("status", "")).strip().lower()
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="status must be one of: open, resolved, breached")
        ticket.status = status
        db.commit()
        db.refresh(ticket)
        return serialize_ticket(ticket)
    finally:
        db.close()


@router.patch("/api/tickets/{id}/category")
def update_category(id: int, data: dict = Body(...)):
    db = SessionLocal()
    try:
        ticket = db.query(Ticket).filter(Ticket.id == id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        if "category" not in data:
            raise HTTPException(status_code=400, detail="Missing category in request body")
        new_category = str(data["category"]).strip().lower()
        if not new_category:
            raise HTTPException(status_code=400, detail="category cannot be empty")
        ticket.category_manual = new_category
        ticket.manually_corrected = True
        db.commit()
        db.refresh(ticket)
        return serialize_ticket(ticket)
    finally:
        db.close()
