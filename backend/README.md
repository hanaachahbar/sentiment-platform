# Sentiment Analysis Platform — Backend

A FastAPI backend for managing and analysing customer comments from social media. Comments are stored as tickets, classified by an AI engine (category, sentiment, topic), and exposed through a REST API consumed by the React dashboard.

---

## Tech Stack

| Technology | Role                       |
| ---------- | -------------------------- |
| Python     | Core language              |
| FastAPI    | REST API framework         |
| SQLAlchemy | ORM / database interaction |
| SQLite     | Local database             |
| Pandas     | CSV ingestion              |

---

## Setup

### 1. Go to the backend folder

```bash
cd backend
```

### 2. Create a virtual environment

```bash
python -m venv .venv
```

### 3. Activate the environment

**Windows (PowerShell):**

```powershell
.\.venv\Scripts\Activate.ps1
```

**Mac / Linux:**

```bash
source .venv/bin/activate
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Seed the database (first time only)

```bash
python insert_data.py
```

### 6. Run the server

```bash
uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`  
Interactive docs (Swagger UI): `http://127.0.0.1:8000/docs`

---

## Project Structure

```
backend/
│
├── main.py            # App entry point, registers all routers
├── database.py        # SQLAlchemy engine, session, Base model
├── sla.py             # SLA deadline computation
├── insert_data.py     # CSV ingestion and database seeding
│
├── routers/
│   ├── posts.py       # GET /api/posts
│   ├── stats.py       # GET /api/stats
│   ├── tickets.py     # PATCH and POST ticket endpoints
│   ├── export.py      # GET /api/export
│   └── trends.py      # GET /api/trends
│
├── data/
│   └── comments.csv   # Source data for testing
│
├── requirements.txt
└── README.md
```

---

## API Endpoints

### `GET /api/posts`

Returns all tickets with optional filters.

| Parameter   | Description                                      |
| ----------- | ------------------------------------------------ |
| `platform`  | Filter by source platform (facebook, instagram…) |
| `category`  | Filter by category                               |
| `status`    | `open`, `resolved`, or `breached`                |
| `is_urgent` | `true` or `false`                                |

> Automatically marks overdue open tickets as `breached` on each call.

---

### `GET /api/stats`

Returns dashboard KPIs.

```json
{
  "total_posts_today": 42,
  "complaint_percentage": 61.9,
  "sla_breaches": 5
}
```

---

### `GET /api/trends`

Identifies the most active discussion topics and compares their frequency against a previous period to determine if each topic is rising, falling, or stable.

**Default behaviour:** compares the last 48 hours against the previous 48 hours.

| Parameter   | Description            |
| ----------- | ---------------------- |
| `from_date` | Start of custom period |
| `to_date`   | End of custom period   |

**Example response:**

```json
{
  "current_period": {
    "from": "2026-03-27T10:00:00",
    "to": "2026-03-29T10:00:00"
  },
  "previous_period": {
    "from": "2026-03-25T10:00:00",
    "to": "2026-03-27T10:00:00"
  },
  "trends": [
    {
      "topic": "FTTH installation",
      "count": 23,
      "direction": "up",
      "change": "+15 vs previous period",
      "tickets": [
        { "id": 42, "text": "...", "author": "...", "fb_link": "..." }
      ]
    }
  ]
}
```

---

### `PATCH /api/tickets/{id}/category`

Manually correct the AI-assigned category of a ticket.

```json
{ "category": "suggestion" }
```

- Original AI category is preserved
- Correction saved in `category_manual`
- `manually_corrected` flag set to `true`

---

### `POST /api/tickets/{id}/resolve`

Mark a ticket as resolved.

- Sets `status = "resolved"`

---

### `GET /api/export`

Download ticket data as a CSV file.

| Parameter   | Description                    |
| ----------- | ------------------------------ |
| `from_date` | Export tickets from this date  |
| `to_date`   | Export tickets up to this date |
| `status`    | Filter by status               |
| `category`  | Filter by category             |

All parameters are optional and can be combined freely.

---

## Ticket Lifecycle

```
Comment received
      ↓
Stored in DB (status = open)
      ↓
AI classification (category · sentiment · topic)
      ↓
[Optional] Manual correction by staff
      ↓
Resolved (status = resolved)
```

If the 48-hour SLA deadline passes without resolution → `status = breached`

---

## SLA Management

Each ticket gets an SLA deadline:

```
sla_deadline = created_at + 48 hours
```

The system automatically checks and updates overdue tickets to `breached` on every call to `GET /api/posts`.

---

## Error Responses

| Status | Meaning                           |
| ------ | --------------------------------- |
| `404`  | Ticket not found                  |
| `422`  | Invalid or missing request fields |
| `400`  | Invalid operation                 |

All errors follow the format:

```json
{ "detail": "Ticket not found" }
```
