import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import posts, stats, tickets, export, trends, topics
from scheduler import run_fetcher, check_sla_breaches, run_monthly_model_update
from topic_model_service import preload_topic_model

logger = logging.getLogger(__name__)


def _load_environment() -> None:
    backend_dir = Path(__file__).resolve().parent
    project_root = backend_dir.parent

    load_dotenv(project_root / ".env", override=False)
    load_dotenv(backend_dir / ".env", override=False)


def _env_minutes(name: str, default: int) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        value = int(raw)
        if value <= 0:
            raise ValueError
        return value
    except ValueError:
        logger.warning("Invalid %s=%s; using default %d", name, raw, default)
        return default


def _env_int_range(name: str, default: int, min_value: int, max_value: int) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        value = int(raw)
        if value < min_value or value > max_value:
            raise ValueError
        return value
    except ValueError:
        logger.warning("Invalid %s=%s; using default %d", name, raw, default)
        return default


scheduler = BackgroundScheduler(timezone="UTC")


@asynccontextmanager
async def lifespan(_: FastAPI):
    _load_environment()
    preload_topic_model()

    fetch_interval = _env_minutes("FETCH_INTERVAL_MINUTES", 5)
    sla_interval = _env_minutes("SLA_CHECK_INTERVAL_MINUTES", 60)
    monthly_enabled = os.getenv("MONTHLY_TOPIC_UPDATE_ENABLED", "true").strip().lower() == "true"
    monthly_day = os.getenv("MONTHLY_UPDATE_DAY", "last").strip() or "last"
    monthly_hour = _env_int_range("MONTHLY_UPDATE_HOUR_UTC", 23, 0, 23)
    monthly_minute = _env_int_range("MONTHLY_UPDATE_MINUTE_UTC", 55, 0, 59)

    scheduler.add_job(
        run_fetcher,
        "interval",
        minutes=fetch_interval,
        id="facebook_fetch",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.add_job(
        check_sla_breaches,
        "interval",
        minutes=sla_interval,
        id="sla_check",
        replace_existing=True,
        max_instances=1,
    )

    if monthly_enabled:
        scheduler.add_job(
            run_monthly_model_update,
            trigger=CronTrigger(
                day=monthly_day,
                hour=monthly_hour,
                minute=monthly_minute,
                timezone="UTC",
            ),
            id="monthly_topic_update",
            replace_existing=True,
            max_instances=1,
        )

    scheduler.start()
    logger.info(
        "Scheduler started (facebook_fetch=%dm, sla_check=%dm)",
        fetch_interval,
        sla_interval,
    )

    try:
        yield
    finally:
        if scheduler.running:
            scheduler.shutdown(wait=False)
            logger.info("Scheduler stopped")


app = FastAPI(lifespan=lifespan)

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