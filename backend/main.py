import os
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from routers import posts, stats, tickets, export, trends
from scheduler import check_sla_breaches, run_fetcher

# Configuration
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# Background scheduler
scheduler = BackgroundScheduler()

fetch_interval = int(os.getenv("FETCH_INTERVAL_MINUTES", "5"))
sla_interval = int(os.getenv("SLA_CHECK_INTERVAL_MINUTES", "60"))

scheduler.add_job(run_fetcher, "interval", minutes=fetch_interval, id="facebook_fetch")
scheduler.add_job(check_sla_breaches, "interval", minutes=sla_interval, id="sla_check")


# App lifecycle
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scheduler.start()
    logger.info(
        "Scheduler started — fetcher every %d min, SLA check every %d min",
        fetch_interval,
        sla_interval,
    )
    yield
    # Shutdown
    scheduler.shutdown(wait=False)
    logger.info("Scheduler shut down.")


# FastAPI app
app = FastAPI(
    title="Sentiment Platform API",
    description="Customer support sentiment analysis backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(posts.router)
app.include_router(stats.router)
app.include_router(tickets.router)
app.include_router(export.router)
app.include_router(trends.router)