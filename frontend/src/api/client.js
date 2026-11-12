/**
 * ScanWise API Client
 * Centralized fetch wrapper with automatic JWT injection, credentials: 'include',
 * and unified error extraction.
 */

let authToken = null;

export function setApiAuthToken(token) {
  authToken = token;
}

export function getApiAuthToken() {
  return authToken;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  constructor(code, message, status = 500) {
    super(message || 'An unexpected error occurred');
    this.name = 'ApiError';
    this.code = code || 'UNKNOWN_ERROR';
    this.status = status;
  }
}

export async function apiClient(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});

  // Inject Bearer token if available
  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  // Set application/json default unless FormData is passed
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const fetchOptions = {
    ...options,
    headers,
    credentials: 'include', // Crucial for refresh cookies
  };

  try {
    const response = await fetch(url, fetchOptions);

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // Unified backend error format: { error: { code, message } }
      const errObj = (data && data.error) ? data.error : {};
      const code = errObj.code || `HTTP_${response.status}`;
      const message = errObj.message || data.message || `Request failed with status ${response.status}`;
      throw new ApiError(code, message, response.status);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network errors or offline states
    throw new ApiError('NETWORK_ERROR', err.message || 'Cannot reach the ScanWise server', 0);
  }
}

