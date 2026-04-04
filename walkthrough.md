# Backend Data Pipeline — Walkthrough

## Summary

Implemented the complete backend data pipeline for the sentiment platform, following the [implementation_plan.md](file:///e:/GitHub/sentiment-platform/implementation_plan.md). All 8 files were created/modified successfully and verified.

---

## New Files Created

### [ai_mock.py](file:///e:/GitHub/sentiment-platform/backend/ai_mock.py)
Mock AI module with 3 prediction functions:
- `predict_category(text)` — keyword matching across 7 categories (Complaint, Escalation, Inquiry, Compliment, Suggestion, Request, Feedback)
- `predict_urgency(category)` — returns `True` for Complaint/Escalation
- `predict_topic(text)` — keyword matching against 8 topic areas (FTTH installation, Internet outage, Billing, Router/Equipment, Speed issues, Customer service, Mobile/4G, TV/IPTV)

### [scheduler.py](file:///e:/GitHub/sentiment-platform/backend/scheduler.py)
Background job module:
- `check_sla_breaches()` — queries open tickets, marks as breached if `now > sla_deadline`
- `run_fetcher()` — wrapper around the Facebook fetcher

---

## Modified Files

### [database.py](file:///e:/GitHub/sentiment-platform/backend/database.py)
```diff:database.py
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timedelta
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "tickets.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String)
    author = Column(String)
    platform = Column(String)
    fb_link = Column(String)
    created_at = Column(DateTime)

    category = Column(String)
    category_manual = Column(String, nullable=True)
    manually_corrected = Column(Boolean, default=False)

    sentiment = Column(String)
    is_urgent = Column(Boolean)

    topic = Column(String)

    sla_deadline = Column(DateTime)
    status = Column(String)

    fetched_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)
===
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timedelta
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "tickets.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String)
    author = Column(String)
    platform = Column(String)
    fb_link = Column(String)
    created_at = Column(DateTime)

    category = Column(String)
    category_manual = Column(String, nullable=True)
    manually_corrected = Column(Boolean, default=False)

    sentiment = Column(String)
    is_urgent = Column(Boolean)

    topic = Column(String)

    sla_deadline = Column(DateTime)
    status = Column(String)

    fetched_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)
```

### [fetcher.py](file:///e:/GitHub/sentiment-platform/backend/fetcher.py)
Built from scratch — calls Facebook Graph API, deduplicates by the saved Facebook link, runs AI mock on each new post, sets SLA deadline. Fails gracefully if no FB credentials configured.

### [main.py](file:///e:/GitHub/sentiment-platform/backend/main.py)
- Added **CORS middleware** (`allow_origins=["*"]` for dev)
- Added **APScheduler** with two jobs: fetcher every 5 min, SLA check every 60 min
- Added **python-dotenv** loading
- Added **lifespan** context manager for startup/shutdown

### [insert_data.py](file:///e:/GitHub/sentiment-platform/backend/insert_data.py)
Rewritten to produce realistic data:
- Uses AI mock functions for varied categories/topics
- Spreads timestamps over 7 days for trend testing
- Generates 20 realistic author names
- Adds **100 synthetic tickets** beyond the 31 CSV rows (131 total)

### [routers/export.py](file:///e:/GitHub/sentiment-platform/backend/routers/export.py)
- Added query filters: `from_date`, `to_date`, `status`, `category`
- Exports **all 14 ticket fields** (was only 4)
- Added `Content-Disposition` header for proper file download

### [routers/posts.py](file:///e:/GitHub/sentiment-platform/backend/routers/posts.py)
- Added `.order_by(Ticket.created_at.desc())` — newest first
- Added `sentiment` field to response (was missing)

### [.env.example](file:///e:/GitHub/sentiment-platform/.env.example)
Populated with FB_PAGE_ID, FB_ACCESS_TOKEN, FETCH_INTERVAL_MINUTES, SLA_CHECK_INTERVAL_MINUTES

### [requirements.txt](file:///e:/GitHub/sentiment-platform/backend/requirements.txt)
Added: `python-dotenv`, `apscheduler`, `httpx`

---

## Verification Results

| Test | Result |
|------|--------|
| `python insert_data.py` | ✅ 131 tickets inserted (31 CSV + 100 synthetic) |
| `GET /api/posts` | ✅ 131 posts, newest first, sentiment field present |
| `GET /api/stats` | ✅ Returns total_posts_today, complaint_percentage, sla_breaches |
| `GET /api/trends` | ✅ Topic grouping working |
| `GET /api/export` | ✅ CSV with all 14 fields, Content-Disposition header |
| `GET /api/export?status=open` | ✅ Filter works correctly |
| CORS headers | ✅ `access-control-allow-origin: *` present |
| Scheduler | ✅ Fetcher every 5 min + SLA check every 60 min running |
| Swagger UI (`/docs`) | ✅ All 6 endpoints listed and functional |

![API endpoint test recording](C:/Users/moham/.gemini/antigravity/brain/96a41acc-5959-4129-8aed-533e98ea1a93/api_endpoint_test_1774896518216.webp)
