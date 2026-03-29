# Backend Setup

## 1. Go to backend folder

cd backend

## 2. Create virtual environment

python -m venv .venv

## 3. Activate environment

.\.venv\Scripts\Activate.ps1

## 4. Install dependencies

pip install -r requirements.txt

## 5. Run server

uvicorn main:app --reload

## API Endpoints

- GET /api/posts
- GET /api/stats
- PATCH /api/tickets/{id}/category
- POST /api/tickets/{id}/resolve
- GET /api/export
