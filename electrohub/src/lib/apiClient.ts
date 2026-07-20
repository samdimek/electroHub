'use client';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match?.[2];
}

const CSRF_COOKIE = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || 'eh_csrf';

export async function apiFetch<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers.set('x-csrf-token', csrf);
  }

  const res = await fetch(url, { ...init, headers, credentials: 'same-origin' });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const message = (data && (data as { error?: string }).error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}
