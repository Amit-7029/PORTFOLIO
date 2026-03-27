const JSON_HEADERS = {
  "Content-Type": "application/json",
};

export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("portfolio-token");
  const headers = {
    ...(options.body instanceof FormData ? {} : JSON_HEADERS),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Request failed");
  }

  if (response.status === 204) return null;
  return response.json();
}
