# Amine's Backend Work — Implementation Plan

Complete the backend data pipeline: Facebook fetcher, AI integration (mock functions for now), SLA timer, background jobs, and overall backend polish.

## Current State Analysis

### What Already Exists ✅
| File | Status | Notes |
|------|--------|-------|
| `database.py` | ✅ Complete | Schema matches spec (all fields present including `topic`) |
| `sla.py` | ✅ Complete | `calculate_sla_deadline()` and `should_be_breached()` both working |
| `main.py` | ⚠️ Needs updates | Missing CORS, missing background scheduler, no `.env` loading |
| `routers/posts.py` | ✅ Complete | Inline SLA breach check on each GET (good interim solution) |
| `routers/stats.py` | ✅ Complete | KPI cards endpoint |
| `routers/tickets.py` | ✅ Complete | Resolve + manual category override |
| `routers/trends.py` | ✅ Complete | Period comparison with custom date ranges |
| `routers/export.py` | ⚠️ Incomplete | Missing filters (from/to date, status, category), missing all fields in CSV |
| `fetcher.py` | ❌ Empty | Facebook fetcher not built |
| `insert_data.py` | ⚠️ Basic | All rows use same hardcoded category/topic/author — not realistic for testing |
| `.env.example` | ❌ Empty | No credentials template |

### What Needs To Be Built 🔨
1. **Facebook fetcher** — fetch from Graph API every 5 minutes
2. **Mock AI functions** — `predict_category()`, `predict_urgency()`, `predict_topic()`
3. **SLA breach background job** — runs every hour, updates open → breached
4. **Improved data seeding** — realistic fake data for all fields
5. **CORS middleware** — allow frontend to call the API
6. **`.env` configuration** — FB credentials & settings
7. **Export endpoint fixes** — filters + all fields
8. **Posts endpoint fix** — order by newest first (spec says "newest first")

---

## Proposed Changes

### Mock AI Module

#### [NEW] [ai_mock.py](file:///e:/GitHub/sentiment-platform/backend/ai_mock.py)

Three mock prediction functions that mirror the agreed interface with Aya & Malak. These will be swapped for real models in week 2.

```python
def predict_category(text: str) -> str:
    # Returns one of 7 categories based on keyword matching
    # Mock: uses simple keyword heuristics

def predict_urgency(category: str) -> bool:
    # True if category in ["Complaint", "Escalation"]

def predict_topic(text: str) -> str:
    # Uses the topic_map dictionary for keyword-based topic extraction
    # Returns: "FTTH installation", "internet outage", "billing", etc.
```

The mock `predict_category` will use keyword-based heuristics to produce varied categories (not just "Complaint" for everything). The `predict_topic` will use the exact `topic_map` from the spec. This gives realistic test data.

---

### Facebook Fetcher

#### [MODIFY] [fetcher.py](file:///e:/GitHub/sentiment-platform/backend/fetcher.py)

Fetches comments from the Facebook Graph API and saves new ones as tickets.

- Calls `GET https://graph.facebook.com/v18.0/{page_id}/feed?fields=id,message,created_time,from,permalink_url`
- Deduplicates by checking the saved `fb_link`
- Calls the 3 mock AI functions on each new comment
- Sets `sla_deadline = created_at + 48h`
- Handles API errors gracefully with logging
- Designed to be called by APScheduler every 5 minutes

> [!IMPORTANT]
> The fetcher now deduplicates using the saved Facebook link, so no extra ID column is required.

---

### Database Schema Update

#### [MODIFY] [database.py](file:///e:/GitHub/sentiment-platform/backend/database.py)

- Keep the schema aligned with the ticket contract, without an extra Facebook ID column

---

### Main Application Updates

#### [MODIFY] [main.py](file:///e:/GitHub/sentiment-platform/backend/main.py)

- Add **CORS middleware** allowing frontend origin (`http://localhost:5173` for Vite)
- Add **APScheduler** for two background jobs:
  - Facebook fetcher: every 5 minutes
  - SLA breach checker: every hour
- Load `.env` using `python-dotenv`
- Add startup/shutdown lifecycle events

---

### Improved Data Seeding

#### [MODIFY] [insert_data.py](file:///e:/GitHub/sentiment-platform/backend/insert_data.py)

Rewrite to produce realistic test data:
- Run `predict_category()`, `predict_urgency()`, and `predict_topic()` on each comment text
- Derive `sentiment` from category (Complaint/Escalation → Negative, Compliment → Positive, else Neutral)
- Use varied `created_at` timestamps (spread over the last 7 days for trend testing)
- Generate realistic author names and Facebook links
- Also generate ~100 additional synthetic tickets with varied categories/topics for richer dashboard testing

---

### Export Endpoint Fix

#### [MODIFY] [export.py](file:///e:/GitHub/sentiment-platform/backend/routers/export.py)

- Add query parameter filters: `from_date`, `to_date`, `status`, `category`
- Export ALL ticket fields (not just id, text, category, status)
- Add `Content-Disposition` header for proper file download

---

### Posts Ordering Fix

#### [MODIFY] [posts.py](file:///e:/GitHub/sentiment-platform/backend/routers/posts.py)

- Add `.order_by(Ticket.created_at.desc())` — spec says "newest first"
- Add `sentiment` field to response (currently missing)

---

### Environment Configuration

#### [MODIFY] [.env.example](file:///e:/GitHub/sentiment-platform/.env.example)

```
FB_PAGE_ID=your_own_test_page_id
FB_ACCESS_TOKEN=your_own_test_token
FETCH_INTERVAL_MINUTES=5
SLA_CHECK_INTERVAL_MINUTES=60
```

---

### Requirements Update

#### [MODIFY] [requirements.txt](file:///e:/GitHub/sentiment-platform/backend/requirements.txt)

Add:
- `python-dotenv` — for loading `.env`
- `apscheduler` — for background scheduling
- `requests` — for Facebook API calls (if not already present)
- `httpx` — async HTTP client (alternative to requests)

---

### SLA Background Job

#### [NEW] [scheduler.py](file:///e:/GitHub/sentiment-platform/backend/scheduler.py)

Dedicated module for background jobs:
- `check_sla_breaches()` — queries all open tickets, marks as breached if `now > sla_deadline`
- `run_fetcher()` — calls the Facebook fetcher
- Both are registered with APScheduler in `main.py`

---

## User Review Required

> [!IMPORTANT]
> **Database migration**: The seeder recreates the dev database when needed, so schema changes stay isolated to local data.

> [!IMPORTANT]
> **Facebook API credentials**: The fetcher will fail gracefully if no real FB credentials are in `.env`. The system works with seeded data regardless. When the client provides real credentials, you just change the 2 lines in `.env`.

> [!WARNING]
> **CORS origins**: I'll set `allow_origins=["*"]` for development. For production, this should be restricted to the actual frontend domain.

---

## Open Questions

1. **Do you want me to also include a batch of ~100 synthetic test tickets** in the seeder (with varied categories, topics, timestamps) for richer dashboard testing? Or stick to only the 31 CSV rows?

2. **The `routers/__init__.py` file is missing** — do you want me to add it, or does the current import style work for your team?

---

## Verification Plan

### Automated Tests
1. Run `python insert_data.py` → verify 31+ tickets inserted with varied categories/topics
2. Start server with `uvicorn main:app --reload` → verify all endpoints return correct data
3. Test each endpoint via browser:
   - `GET /api/posts` — verify newest first, all fields present
   - `GET /api/stats` — verify KPIs calculate correctly 
   - `GET /api/trends` — verify topic grouping and direction arrows
   - `GET /api/export` — verify CSV downloads with all fields
   - `GET /api/export?status=open` — verify filter works
4. Verify CORS headers present in responses
5. Verify scheduler logs show fetcher + SLA check running

### Manual Verification
- Open Swagger UI at `http://127.0.0.1:8000/docs` and test all endpoints interactively
