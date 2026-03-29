from fastapi import APIRouter, HTTPException, Body
from database import SessionLocal, Ticket

router = APIRouter()

@router.post("/api/tickets/{id}/resolve")
def resolve_ticket(id: int):
    db = SessionLocal()
    ticket = db.query(Ticket).filter(Ticket.id == id).first()

    if not ticket:
        db.close()
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = "resolved"
    db.commit()
    response = {"id": ticket.id, "status": ticket.status}
    db.close()
    return response

@router.patch("/api/tickets/{id}/category")
def update_category(id: int, data: dict = Body(...)):
    db = SessionLocal()
    ticket = db.query(Ticket).filter(Ticket.id == id).first()

    if not ticket:
        db.close()
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.category_manual = data["category"]
    ticket.manually_corrected = True
    db.commit()

    response = {
        "id": ticket.id,
        "category": ticket.category,
        "category_manual": ticket.category_manual,
        "manually_corrected": ticket.manually_corrected
    }
    db.close()
    return response