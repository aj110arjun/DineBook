export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getErrorMessage(detail, fallbackMessage) {
  if (typeof detail === 'string') return detail;
  if (!Array.isArray(detail) || detail.length === 0) return fallbackMessage;

  const validationError = detail[0];
  const field = validationError?.loc?.at(-1);
  if (field === 'email') return 'Enter a valid email address.';
  if (field === 'name' && /letters and spaces/i.test(validationError?.msg || '')) {
    return 'Full name must contain letters and spaces only.';
  }
  if (field === 'password' || field === 'confirm_password') {
    return (validationError?.msg || '')
      .replace(/^Value error,\s*/i, '')
      .replace(/^String should have at least \d+ characters$/i, 'Use at least 8 characters for your password.')
      || fallbackMessage;
  }

  return (validationError?.msg || '').replace(/^Value error,\s*/i, '') || fallbackMessage;
}

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
    throw new Error(getErrorMessage(data?.detail, fallbackMessage));
  }
  return data;
}
