import logging
from datetime import datetime

from database import SessionLocal, Ticket
from fetcher import fetch_facebook_posts
from topic_model_service import run_monthly_topic_update

logger = logging.getLogger(__name__)


def check_sla_breaches():
    db = SessionLocal()
    now = datetime.utcnow()

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
    try:
        fetch_facebook_posts()
    except Exception:
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
