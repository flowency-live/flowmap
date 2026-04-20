/**
 * Auth utilities for Cognito-based authentication
 */

/**
 * Generate a unique invitation code (UUID v4)
 */
export function generateInviteCode(): string {
  return crypto.randomUUID();
}

/**
 * Build an invite URL from the code
 */
export function buildInviteUrl(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/invite?code=${code}`;
}

/**
 * Extract invite code from URL query parameters
 */
export function extractInviteCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

/**
 * Clear invite code from URL without page reload
 */
export function clearInviteCodeFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  window.history.replaceState({}, '', url.pathname + url.search);
}
