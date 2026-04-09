import logging
from datetime import datetime, timedelta
from threading import Lock

from database import SessionLocal, Ticket
from fetcher import fetch_facebook_posts
from topic_model_service import run_monthly_topic_update
from time_utils import now_local

logger = logging.getLogger(__name__)

_FETCHER_MONITOR_LOCK = Lock()
_FETCHER_MONITOR_STATE = {
    "status": "idle",
    "interval_minutes": 5,
    "last_run_started_at": None,
    "last_run_finished_at": None,
    "last_success_at": None,
    "next_run_at": None,
    "last_inserted_count": 0,
    "last_error": None,
}


def _to_iso(dt_value):
    if dt_value is None:
        return None
    return f"{dt_value.isoformat()}Z"


def configure_fetcher_monitor(interval_minutes: int):
    now = datetime.utcnow()
    with _FETCHER_MONITOR_LOCK:
        _FETCHER_MONITOR_STATE["interval_minutes"] = interval_minutes
        _FETCHER_MONITOR_STATE["next_run_at"] = now + timedelta(minutes=interval_minutes)


def get_fetcher_status():
    with _FETCHER_MONITOR_LOCK:
        snapshot = dict(_FETCHER_MONITOR_STATE)

    return {
        "status": snapshot["status"],
        "interval_minutes": snapshot["interval_minutes"],
        "last_run_started_at": _to_iso(snapshot["last_run_started_at"]),
        "last_run_finished_at": _to_iso(snapshot["last_run_finished_at"]),
        "last_success_at": _to_iso(snapshot["last_success_at"]),
        "next_run_at": _to_iso(snapshot["next_run_at"]),
        "last_inserted_count": snapshot["last_inserted_count"],
        "last_error": snapshot["last_error"],
    }


def check_sla_breaches():
    db = SessionLocal()
    now = now_local()

    try:
        open_tickets = (
            db.query(Ticket)
            .filter(Ticket.status == "open")
            .filter(Ticket.sla_deadline.isnot(None))
            .all()
        )

        breach_count = 0
        for ticket in open_tickets:
            if now > ticket.sla_deadline:
                ticket.status = "breached"
                breach_count += 1

        if breach_count:
            db.commit()
            logger.info("SLA breach check: %d tickets marked as breached.", breach_count)
        else:
            logger.info("SLA breach check: no new breaches.")
    except Exception:
        db.rollback()
        logger.exception("Error during SLA breach check")
    finally:
        db.close()


def run_fetcher():
    logger.info("Running scheduled Facebook fetch...")
    started_at = datetime.utcnow()

    with _FETCHER_MONITOR_LOCK:
        _FETCHER_MONITOR_STATE["status"] = "running"
        _FETCHER_MONITOR_STATE["last_run_started_at"] = started_at
        _FETCHER_MONITOR_STATE["last_error"] = None

    try:
        result = fetch_facebook_posts() or {}
        finished_at = datetime.utcnow()
        with _FETCHER_MONITOR_LOCK:
            interval_minutes = _FETCHER_MONITOR_STATE["interval_minutes"]
        success = bool(result.get("success", True))
        inserted_count = int(result.get("inserted_count", 0) or 0)
        error_message = result.get("error")

        with _FETCHER_MONITOR_LOCK:
            _FETCHER_MONITOR_STATE["last_run_finished_at"] = finished_at
            _FETCHER_MONITOR_STATE["last_inserted_count"] = inserted_count
            _FETCHER_MONITOR_STATE["next_run_at"] = finished_at + timedelta(minutes=interval_minutes)

            if success:
                _FETCHER_MONITOR_STATE["status"] = "success"
                _FETCHER_MONITOR_STATE["last_success_at"] = finished_at
                _FETCHER_MONITOR_STATE["last_error"] = None
            else:
                _FETCHER_MONITOR_STATE["status"] = "failed"
                _FETCHER_MONITOR_STATE["last_error"] = error_message or "Fetcher run failed"
                logger.error("Scheduled Facebook fetch reported failure: %s", _FETCHER_MONITOR_STATE["last_error"])
    except Exception as exc:
        finished_at = datetime.utcnow()
        with _FETCHER_MONITOR_LOCK:
            interval_minutes = _FETCHER_MONITOR_STATE["interval_minutes"]
            _FETCHER_MONITOR_STATE["status"] = "failed"
            _FETCHER_MONITOR_STATE["last_run_finished_at"] = finished_at
            _FETCHER_MONITOR_STATE["next_run_at"] = finished_at + timedelta(minutes=interval_minutes)
            _FETCHER_MONITOR_STATE["last_error"] = str(exc)

        logger.exception("Scheduled Facebook fetch failed")


def run_monthly_model_update():
    logger.info("Running scheduled monthly topic model update...")
    try:
        updated = run_monthly_topic_update()
        if updated:
            logger.info("Monthly topic model update completed successfully")
        else:
            logger.info("Monthly topic model update skipped or no update was required")
    except Exception:
        logger.exception("Scheduled monthly topic model update failed")
