from datetime import datetime, timedelta

def calculate_sla_deadline(created_at: datetime) -> datetime:
    return created_at + timedelta(hours=48)

def should_be_breached(status: str, sla_deadline: datetime) -> bool:
    if status != "open":
        return False
    if not sla_deadline:
        return False
    return datetime.utcnow() > sla_deadline