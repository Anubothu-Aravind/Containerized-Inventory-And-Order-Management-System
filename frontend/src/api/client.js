const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const STORAGE_KEY = "inventory_app_auth";

export function getAuth() {
  try {
    const localAuth = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (localAuth) {
      return localAuth;
    }
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export function setAuth(auth, remember = true) {
  const storage = remember ? localStorage : sessionStorage;
  const otherStorage = remember ? sessionStorage : localStorage;
  storage.setItem(STORAGE_KEY, JSON.stringify(auth));
  otherStorage.removeItem(STORAGE_KEY);
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function authHeaders() {
  const auth = getAuth();
  if (!auth) return {};
  return { Authorization: `Bearer ${auth.access_token}` };
}

export async function apiFetch(path, options = {}) {
  const normalizedBody =
    options.body && typeof options.body === "object" && !(options.body instanceof FormData)
      ? JSON.stringify(options.body)
      : options.body;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: normalizedBody,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    let detail = await response.text();
    if (contentType.includes("application/json")) {
      try {
        const parsed = JSON.parse(detail);
        if (typeof parsed?.detail === "string") {
          detail = parsed.detail;
        } else if (Array.isArray(parsed?.detail)) {
          detail = parsed.detail
            .map((item) => item?.msg || item?.message || JSON.stringify(item))
            .join("; ");
        } else if (typeof parsed?.message === "string") {
          detail = parsed.message;
        }
      } catch {
        // fall through to raw text
      }
    }
    if (response.status === 401) {
      clearAuth();
      const error = new Error(detail || "Session expired");
      error.status = 401;
      throw error;
    }
    throw new Error(detail || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
