import axios from "axios";

// Same-origin in dev (Vite proxy) and prod (Laravel serves the build), so the
// session cookie + XSRF-TOKEN cookie "just work".
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { Accept: "application/json" },
});

/** Pull a readable message out of a Laravel error response. */
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  const data = error?.response?.data;
  if (data?.errors) {
    const first = Object.values(data.errors).flat()[0];
    if (first) return first;
  }
  return data?.message || fallback;
}

export default api;
