from fastapi import FastAPI
from routers import posts, stats, tickets, export, trends, topics
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.include_router(posts.router)
app.include_router(stats.router)
app.include_router(tickets.router)
app.include_router(export.router)
app.include_router(trends.router)
app.include_router(topics.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)