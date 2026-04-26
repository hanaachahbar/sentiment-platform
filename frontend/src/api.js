// Centralized API service — all backend calls go through here.
// In dev, Vite proxy forwards /api/* → http://127.0.0.1:8000
const API_BASE = "";  // empty string because Vite proxy handles /api prefix
const DIRECT_BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

// ────────────────────────────────────────────
// GET /api/posts  —  list tickets with filters
// ────────────────────────────────────────────
export async function fetchPosts({ platform, category, status, is_urgent, time_range, from_date, to_date } = {}) {
  const params = new URLSearchParams();
  if (platform && platform.toLowerCase() !== 'all') params.append("platform", platform.toLowerCase());
  if (category && category.toLowerCase() !== 'all') params.append("category", category.toLowerCase());
  if (status && status.toLowerCase() !== 'all') params.append("status", status.toLowerCase());
  if (is_urgent !== undefined && is_urgent !== null) params.append("is_urgent", is_urgent);
  if (time_range) params.append("time_range", time_range);
  if (from_date) params.append("from_date", from_date);
  if (to_date) params.append("to_date", to_date);

  const res = await fetch(`${API_BASE}/api/posts?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
  return res.json();
}

// ────────────────────────────────────────────
// GET /api/topics  —  list topics
// ────────────────────────────────────────────
export async function fetchTopics() {
  const res = await fetch(`${API_BASE}/api/topics`);
  if (!res.ok) throw new Error(`Failed to fetch topics: ${res.status}`);
  return res.json();
}

// ────────────────────────────────────────────
// GET /api/stats  —  dashboard KPIs
// ────────────────────────────────────────────
export async function fetchStats({ platform, time_range } = {}) {
  const params = new URLSearchParams();
  if (platform && platform.toLowerCase() !== 'all') params.append("platform", platform.toLowerCase());
  if (time_range) params.append("time_range", time_range);

  const res = await fetch(`${API_BASE}/api/stats?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
  return res.json();
}

// ────────────────────────────────────────────
// GET /api/fetcher/status  —  scheduler/fetcher monitor state
// ────────────────────────────────────────────
export async function fetchFetcherStatus() {
  const path = "/api/fetcher/status";

  try {
    const proxiedRes = await fetch(`${API_BASE}${path}`);
    if (proxiedRes.ok) return proxiedRes.json();

    // In Vite dev mode, a backend-reachability issue often appears as proxy 502.
    if (proxiedRes.status !== 502) {
      throw new Error(`Failed to fetch fetcher status: ${proxiedRes.status}`);
    }
  } catch (error) {
    // Fall through to direct backend call below.
    if (error?.message && !error.message.includes('Failed to fetch')) {
      // no-op: keep the original context and attempt direct URL.
    }
  }

  const directRes = await fetch(`${DIRECT_BACKEND_BASE}${path}`);
  if (!directRes.ok) throw new Error(`Failed to fetch fetcher status: ${directRes.status}`);
  return directRes.json();
}

// ────────────────────────────────────────────
// GET /api/trends  —  trending topics
// ────────────────────────────────────────────
export async function fetchTrends({ platform, time_range, from_date, to_date } = {}) {
  const params = new URLSearchParams();
  if (platform && platform.toLowerCase() !== 'all') params.append("platform", platform.toLowerCase());
  if (time_range) params.append("time_range", time_range);
  if (from_date) params.append("from_date", from_date);
  if (to_date) params.append("to_date", to_date);

  const res = await fetch(`${API_BASE}/api/trends?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch trends: ${res.status}`);
  return res.json();
}

// ────────────────────────────────────────────
// PATCH /api/topics/{id}/rename  —  rename a topic label
// ────────────────────────────────────────────
export async function renameTopic(id, topic_name) {
  const res = await fetch(`${API_BASE}/api/topics/${id}/rename`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic_name }),
  });

  if (!res.ok) {
    let detail = `Failed to rename topic: ${res.status}`;
    try {
      const payload = await res.json();
      detail = payload?.detail || detail;
    } catch {
      // Keep the default detail when the backend response is not JSON.
    }
    throw new Error(detail);
  }

  return res.json();
}

// ────────────────────────────────────────────
// PATCH /api/tickets/{id}/category
// ────────────────────────────────────────────
export async function updateCategory(id, category) {
  const res = await fetch(`${API_BASE}/api/tickets/${id}/category`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category }),
  });
  if (!res.ok) throw new Error(`Failed to update category: ${res.status}`);
  return res.json();
}

// ────────────────────────────────────────────
// POST /api/tickets/{id}/resolve
// ────────────────────────────────────────────
export async function resolveTicket(id) {
  const res = await fetch(`${API_BASE}/api/tickets/${id}/resolve`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to resolve ticket: ${res.status}`);
  return res.json();
}

// ────────────────────────────────────────────
// GET /api/export  —  download CSV
// ────────────────────────────────────────────
export async function exportTickets({ from_date, to_date, status, category, columns, file_format } = {}) {
  const params = new URLSearchParams();
  if (from_date) params.append("from_date", from_date);
  if (to_date)   params.append("to_date", to_date);
  if (status)    params.append("status", status);
  if (category)  params.append("category", category);
  if (columns)   params.append("columns", columns);
  if (file_format) params.append("file_format", file_format);

  const res = await fetch(`${API_BASE}/api/export?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to export: ${res.status}`);
  return res.blob();
}
