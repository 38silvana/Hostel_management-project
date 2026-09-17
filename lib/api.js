// Next.js API Client with safe JSON/Text response handling & standalone Next.js route mapping

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

/**
 * Safe fetch wrapper that handles JSON, text error pages, and JWT auth tokens cleanly.
 * Automatically prefixes `/api` for standalone Next.js App Router API routes when running without an external backend.
 */
export async function apiFetch(endpoint, options = {}) {
  let token = null;
  let userJson = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token');
    userJson = localStorage.getItem('user');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If payload is FormData (file upload), omit Content-Type header so browser sets boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  // Format endpoint to use internal /api routes when API_BASE_URL is empty
  let finalEndpoint = endpoint;
  if (!API_BASE_URL && !finalEndpoint.startsWith('/api')) {
    finalEndpoint = `/api${finalEndpoint}`;
  }

  const url = `${API_BASE_URL}${finalEndpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';

    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const rawText = await response.text();
      data = {
        detail: rawText.length > 200 ? `Server returned non-JSON response (HTTP ${response.status})` : (rawText || `HTTP ${response.status} ${response.statusText}`),
        error: rawText,
        raw: rawText
      };
    }

    if (!response.ok) {
      const errorMsg = data?.error || data?.detail || `Request failed with status ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status) throw err;
    throw new Error(err.message || `Unable to reach application API server.`);
  }
}
