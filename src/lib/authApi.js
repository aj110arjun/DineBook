export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function requestJson(path, { fallbackMessage, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Can’t reach DineBook right now. Check that the service is running and try again.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data?.detail === 'string' ? data.detail : fallbackMessage);
  }
  return data;
}
