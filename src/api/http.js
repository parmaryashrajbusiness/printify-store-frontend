const API_BASE = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE && import.meta.env.PROD) {
  throw new Error("Missing VITE_API_BASE_URL in production build.");
}

const RESOLVED_API_BASE = API_BASE || "http://localhost:8080/api";

function getToken() {
  return localStorage.getItem("accessToken");
}

function clearAuthStorage() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("paypalCheckoutShipping");
}

function buildUrl(path) {
  if (!path) return RESOLVED_API_BASE;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanBase = RESOLVED_API_BASE.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const useAuth = options.auth !== false;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (useAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const { auth, ...fetchOptions } = options;

  const response = await fetch(buildUrl(path), {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let message = "Something went wrong.";

    try {
      const errorBody = await response.json();
      message = errorBody.message || errorBody.error || message;
    } catch {
      // keep default message
    }

    if (response.status === 401 || response.status === 403) {
      clearAuthStorage();
      window.dispatchEvent(new Event("auth-expired"));
      throw new Error(message || "Session expired. Please login again.");
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

export { RESOLVED_API_BASE as API_BASE };