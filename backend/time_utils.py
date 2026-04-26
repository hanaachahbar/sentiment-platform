import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

DEFAULT_APP_TIMEZONE = "Africa/Algiers"


def _resolve_app_timezone():
    tz_name = (os.getenv("APP_TIMEZONE") or DEFAULT_APP_TIMEZONE).strip()
    if tz_name:
        try:
            return ZoneInfo(tz_name)
        except Exception:
            pass

    # Fallback to fixed GMT+1 when IANA timezone data is unavailable.
    return timezone(timedelta(hours=1))


APP_TIMEZONE = _resolve_app_timezone()


def now_local() -> datetime:
    """Return current application-local time as naive datetime for SQLite."""
    return datetime.now(APP_TIMEZONE).replace(tzinfo=None)


def parse_facebook_time_to_local(created_time_str: str) -> datetime:
    """Convert Facebook API timestamp to application-local naive datetime."""
    parsed = datetime.strptime(created_time_str, "%Y-%m-%dT%H:%M:%S%z")
    return parsed.astimezone(APP_TIMEZONE).replace(tzinfo=None)
