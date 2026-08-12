// Next.js API Client with safe JSON/Text response handling & dynamic API Base URL

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Safe fetch wrapper that handles JSON, text error pages, and JWT auth tokens cleanly.
 * Eliminates "Unexpected token 'T' ... is not valid JSON" errors.
 */
export async function apiFetch(endpoint, options = {}) {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('token');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If payload is FormData (file upload), omit Content-Type header so browser sets boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const url = `${API_BASE_URL}${endpoint}`;

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
      // Non-JSON response (HTML error page, plain text, Render spin-up notice)
      const rawText = await response.text();
      data = {
        detail: rawText.length > 200 ? `Server returned non-JSON response (HTTP ${response.status})` : (rawText || `HTTP ${response.status} ${response.statusText}`),
        raw: rawText
      };
    }

    if (!response.ok) {
      const errorMsg = data?.detail || `Request failed with status ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status) throw err; // Re-throw structured API errors
    // Network or connection failures (Render sleeping, CORS blocked, backend offline)
    throw new Error(`Unable to connect to server at ${API_BASE_URL}. Please verify your connection or backend deployment.`);
  }
}
