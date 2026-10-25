# Frontend API integration guide (separate from original source)

Your request was to keep the original ZIP/frontend files unchanged. Therefore this guide is added separately; no React files were edited.

## API client example
Create `src/api.js` when you are ready to switch from local demo state to backend calls:

```js
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export function saveToken(token) { localStorage.setItem("symbioloop_api_token", token); }
export function getToken() { return localStorage.getItem("symbioloop_api_token"); }

export async function api(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `API request failed (${response.status})`);
  }
  if (response.status === 204) return null;
  return response.json();
}

// Examples:
// api("/api/waste")
// api("/api/waste", { method: "POST", body: JSON.stringify({
//   material_type: "NBR rubber", quantity_kg: 500, quality_percent: 85,
//   description: "Clean production scrap", location: "Pune"
// }) })
// api("/api/requirements")
// api("/api/matches")
```

## Connect each existing page
- Login/Register: call `/api/auth/login` and `/api/auth/register`; save `access_token`.
- Waste page: use `GET/POST/PATCH/DELETE /api/waste`.
- Requirement page: use `GET/POST/PATCH/DELETE /api/requirements`.
- Matches: use `GET /api/matches`.
- Dashboard: use `GET /api/dashboard`.
- Forecast: use `GET /api/forecast`.
- Optimization: use `GET /api/optimization`.
- Assistant: use `POST /api/assistant` with `{ "message": "Show matching suppliers" }`.
- Exchanges: use `GET/POST /api/exchanges` and `PATCH /api/exchanges/{id}`.
- Sustainability: use `GET /api/sustainability`.

Do not simply add this helper and assume integration is done: each page/state action must be changed and tested to call these endpoints. That work was intentionally kept out of the original frontend source to honor the no-change request.
