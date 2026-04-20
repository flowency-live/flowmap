export const STORAGE_KEY = 'flowmap_auth_jwt';

interface JwtPayload {
  authorized: boolean;
  exp: number;
  iat: number;
}

export async function validateTokenWithServer(
  token: string,
  apiUrl: string
): Promise<string | null> {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.jwt ?? null;
  } catch {
    return null;
  }
}

export function isValidJwt(jwt: string): boolean {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Decode payload (second part)
    const payloadPart = parts[1];
    if (!payloadPart) {
      return false;
    }
    const payload = JSON.parse(atob(payloadPart)) as JwtPayload;

    // Check expiry
    if (!payload.exp) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch {
    return false;
  }
}

export function getSession(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setSession(jwt: string): void {
  localStorage.setItem(STORAGE_KEY, jwt);
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function extractTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('t');
}

export function clearTokenFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('t');
  window.history.replaceState({}, '', url.pathname + url.search);
}
