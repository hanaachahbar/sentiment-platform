# Sentiment Analysis Platform — Backend

A FastAPI backend for managing and analysing customer comments from social media. Comments are stored as tickets, classified by an AI engine (category, topic, urgency), and exposed through a REST API consumed by the React dashboard.

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

> This reads `data/comments.csv`, resolves each topic against `topics_dictionary` (creating entries if needed), computes SLA deadlines, and inserts all tickets.

### 6. Run the server

```bash
uvicorn main:app --reload
```

API available at: `http://127.0.0.1:8000`  
Swagger docs: `http://127.0.0.1:8000/docs`

---

## Project Structure

```
backend/
│
├── main.py            # App entry point, registers all routers
├── database.py        # SQLAlchemy engine, session, Ticket + TopicDictionary models
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

## Database Schema

### `tickets` table

| Field                | Type         | Description                                     |
| -------------------- | ------------ | ----------------------------------------------- |
| `id`                 | Integer (PK) | Auto-generated unique identifier                |
| `text`               | String       | Raw customer comment text                       |
| `author`             | String       | Name or handle of the comment author            |
| `platform`           | String       | Source platform (Facebook, Instagram, etc.)     |
| `source_link`        | String       | Direct URL to the original comment              |
| `created_at`         | DateTime     | Timestamp of the original comment               |
| `category`           | String       | AI-predicted ticket category                    |
| `category_manual`    | String       | Human-corrected category (nullable)             |
| `manually_corrected` | Boolean      | `true` if a staff member corrected the category |
| `is_urgent`          | Boolean      | Urgency flag raised by the AI engine            |
| `topic_id`           | Integer (FK) | Foreign key to `topics_dictionary.id`           |
| `sla_deadline`       | DateTime     | `created_at + 48 hours`                         |
| `status`             | String       | `open`, `resolved`, or `breached`               |
| `fetched_at`         | DateTime     | Timestamp when the record was ingested          |

### `topics_dictionary` table

| Field        | Type         | Description                                                |
| ------------ | ------------ | ---------------------------------------------------------- |
| `id`         | Integer (PK) | Primary key                                                |
| `topic_name` | String       | Unique human-readable topic label                          |
| `is_active`  | Boolean      | Whether the topic is active (non-nullable, default `True`) |
| `created_at` | DateTime     | When the topic was created                                 |
| `updated_at` | DateTime     | When the topic was last modified                           |

---

## API Endpoints

### `GET /api/posts`

Returns all tickets with optional filters.

| Parameter   | Description                       |
| ----------- | --------------------------------- |
| `platform`  | Filter by source platform         |
| `category`  | Filter by category                |
| `status`    | `open`, `resolved`, or `breached` |
| `is_urgent` | `true` or `false`                 |

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

Identifies the most active topics and compares their frequency against a previous period.

**Default:** compares last 48 hours vs the 48 hours before that.

| Parameter   | Description                       |
| ----------- | --------------------------------- |
| `from_date` | Start of custom period (optional) |
| `to_date`   | End of custom period (optional)   |

Each trend object returns:

| Field       | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| `topic_id`  | Stable ID from `topics_dictionary`                             |
| `topic`     | Topic label                                                    |
| `is_active` | Whether the topic is currently active                          |
| `count`     | Number of tickets in the current period                        |
| `direction` | `up`, `down`, or `stable`                                      |
| `change`    | Textual comparison vs previous period                          |
| `tickets`   | List of ticket objects (`id`, `text`, `author`, `source_link`) |

> Only active topics (`is_active = true`) appear in results.

**Example response:**

```json
{
  "current_period": {
    "from": "2026-04-05T10:00:00",
    "to": "2026-04-07T10:00:00"
  },
  "previous_period": {
    "from": "2026-04-03T10:00:00",
    "to": "2026-04-05T10:00:00"
  },
  "trends": [
    {
      "topic_id": 1,
      "topic": "Panne et coupures generales",
      "is_active": true,
      "count": 3,
      "direction": "up",
      "change": "+2 vs previous period",
      "tickets": [
        { "id": 6, "text": "...", "author": "...", "source_link": "..." }
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

- Original AI category is preserved in `category`
- Correction saved in `category_manual`
- `manually_corrected` flag set to `true`

---

### `POST /api/tickets/{id}/resolve`

Mark a ticket as resolved. Sets `status = "resolved"`.

---

### `GET /api/export`

Download ticket data as a CSV file.

| Parameter   | Description                               |
| ----------- | ----------------------------------------- |
| `from_date` | Export tickets from this date (optional)  |
| `to_date`   | Export tickets up to this date (optional) |
| `status`    | Filter by status (optional)               |
| `category`  | Filter by category (optional)             |

All parameters are optional and can be combined freely.

---

## Ticket Lifecycle

```
Comment received
      ↓
Stored in DB (status = open)
      ↓
AI classification (category · topic_id · is_urgent)
      ↓
[Optional] Manual correction by staff
      ↓
Resolved (status = resolved)
```

If the 48-hour SLA deadline passes without resolution → `status = breached`

---

## SLA Management

```
sla_deadline = created_at + 48 hours
```

The system automatically checks and updates overdue open tickets to `breached` on every call to `GET /api/posts`.

---

## Frontend Integration

CORS is enabled via `CORSMiddleware` — the React dashboard can call the API directly from the browser.

**Base URL:** `http://127.0.0.1:8000`

```js
const res = await fetch("http://127.0.0.1:8000/api/posts?status=open");
const data = await res.json();
```

---

## Error Responses

| Status | Meaning                           |
| ------ | --------------------------------- |
| `404`  | Ticket not found                  |
| `422`  | Invalid or missing request fields |
| `400`  | Invalid operation                 |

```json
{ "detail": "Ticket not found" }
```
