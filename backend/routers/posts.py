from fastapi import APIRouter, Body
from database import SessionLocal, Ticket

router = APIRouter()

@router.patch("/api/tickets/{id}/category")
def update_category(id: int, data: dict = Body(...)):
    db = SessionLocal()
    ticket = db.query(Ticket).filter(Ticket.id == id).first()

    ticket.category_manual = data["category"]
    ticket.manually_corrected = True

    db.commit()

    return {
        "id": ticket.id,
        "category": ticket.category,
        "category_manual": ticket.category_manual,
        "manually_corrected": ticket.manually_corrected
    }