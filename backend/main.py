from fastapi import FastAPI, Query
from routers import posts, stats, tickets, export

app = FastAPI()

# Include routers
app.include_router(posts.router)
app.include_router(stats.router)
app.include_router(tickets.router)
app.include_router(export.router)
