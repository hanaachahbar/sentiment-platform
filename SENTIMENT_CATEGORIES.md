# Sentiment Platform - Complete Category Reference

## Current Issue
The CSV file contains detailed sentiment labels (negative, interrogative, etc.), but the backend `insert_data.py` is only converting them to **"Negative"** or **"Neutral"**, losing all category information during data insertion.

---

## Complete Sentiment Categories

### Primary Categories (should be in your data)
1. **positive** - Positive feedback, compliments, praise
   - Alternative label: `compliment`
   - Frontend color: Green

2. **negative** - Complaints, criticism, negative feedback
   - Alternative label: `complaint`
   - Frontend color: Blue-muted

3. **interrogative** - Questions, inquiries, requests for information
   - Alternative label: `inquiry`
   - Frontend color: Green-muted

4. **off-topic** - Comments not related to the service
   - Alternative label: `out_of_topic`
   - Frontend color: Secondary (grey)

5. **suggestion** - Suggestions for improvement
   - Frontend color: Blue

### Additional Categories (for special cases)
6. **neutral** - Neutral comments with no clear sentiment
   - Frontend color: Slate grey

7. **escalation** - Issues requiring urgent escalation
   - Frontend color: Red (#e11d48)

---

## What Your CSV Currently Has
Looking at `backend/data/comments.csv`:
- **negative** (appears frequently in the data)
- **interrogative** (present in the data)
- Other categories may exist but are being lost during insertion

---

## The Problem
In `backend/insert_data.py` (line 29):
```python
category="Negative" if row["sentiment_raw"] == "negative" else "Neutral"
```

This mapping **loses all category details**:
- ❌ `negative` → "Negative" ✓
- ❌ `interrogative` → "Neutral" ✗ (WRONG - should be "interrogative")
- ❌ `positive` → "Neutral" ✗ (WRONG - should be "positive")
- ❌ `suggestion` → "Neutral" ✗ (WRONG - should be "suggestion")
- ❌ `off-topic` → "Neutral" ✗ (WRONG - should be "off-topic")

---

## Recommended Fix
Update `backend/insert_data.py` to map categories correctly:
```python
CATEGORY_MAP = {
    "positive": "positive",
    "negative": "negative",
    "interrogative": "interrogative",
    "off-topic": "off-topic",
    "suggestion": "suggestion",
    "neutral": "neutral"
}

category = CATEGORY_MAP.get(row["sentiment_raw"], "neutral")
```

This ensures all sentiment nuances are preserved in your database and displayed correctly in the frontend.
