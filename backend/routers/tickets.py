from fastapi import APIRouter
from database import SessionLocal, Ticket

router = APIRouter()

@router.post("/api/tickets/{id}/resolve")
def resolve_ticket(id: int):
    db = SessionLocal()
    ticket = db.query(Ticket).filter(Ticket.id == id).first()

    ticket.status = "resolved"
    db.commit()

    return {"id": ticket.id, "status": ticket.status}
