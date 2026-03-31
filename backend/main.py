from fastapi import FastAPI, Query
from routers import posts, stats, tickets, export, trends
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Include routers
app.include_router(posts.router)
app.include_router(stats.router)
app.include_router(tickets.router)
app.include_router(export.router)
app.include_router(trends.router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)