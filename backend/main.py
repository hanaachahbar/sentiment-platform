from fastapi import FastAPI, Query
from database import SessionLocal, Ticket
from routers import posts, stats, tickets, export

app = FastAPI()

# Include routers
app.include_router(posts.router)
app.include_router(stats.router)
app.include_router(tickets.router)
app.include_router(export.router)

# @app.get("/")
# def root():
#     return {"message": "API is running"}


# @app.get("/api/posts")
# def get_posts(
#     platform: str = None,
#     category: str = None,
#     status: str = None,
#     is_urgent: bool = None
# ):
#     db = SessionLocal()
#     query = db.query(Ticket)

#     if platform:
#         query = query.filter(Ticket.platform == platform)
#     if category:
#         query = query.filter(Ticket.category == category)
#     if status:
#         query = query.filter(Ticket.status == status)
#     if is_urgent is not None:
#         query = query.filter(Ticket.is_urgent == is_urgent)

#     tickets = query.all()

#     return [
#         {
#             "id": t.id,
#             "text": t.text,
#             "author": t.author,
#             "platform": t.platform,
#             "fb_link": t.fb_link,
#             "created_at": t.created_at,
#             "category": t.category,
#             "category_manual": t.category_manual,
#             "manually_corrected": t.manually_corrected,
#             "is_urgent": t.is_urgent,
#             "sla_deadline": t.sla_deadline,
#             "status": t.status
#         }
#         for t in tickets
#     ]