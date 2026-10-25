const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const TOKEN_KEY = "symbioloop.access_token";
const USER_KEY = "symbioloop.user";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getUser = () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; } };
export const setSession = data => {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  window.dispatchEvent(new Event("symbioloop-auth-changed"));
};
export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event("symbioloop-auth-changed"));
};
export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (getToken()) headers.set("Authorization", `Bearer ${getToken()}`);
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (error) {
    throw new Error(`Cannot reach the SymbioLoop backend at ${API_BASE}. Start the backend with START_SYMBIOLOOP.bat and check http://127.0.0.1:8000/api/health.`);
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try { const data = await response.json(); message = data.detail || data.message || message; } catch {}
    if (response.status === 401) clearSession();
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}
export const apiBase = API_BASE;
