/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

// Import after mocks
const {
  validateTokenWithServer,
  isValidJwt,
  getSession,
  setSession,
  clearSession,
  extractTokenFromUrl,
  STORAGE_KEY,
} = await import('./auth');

describe('auth utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateTokenWithServer', () => {
    it('calls API with token and returns JWT on success', async () => {
      const mockJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRob3JpemVkIjp0cnVlfQ.abc';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jwt: mockJwt }),
      });

      const result = await validateTokenWithServer('test-token', 'https://api.example.com/validate');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'test-token' }),
      });
      expect(result).toBe(mockJwt);
    });

    it('returns null when API returns 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await validateTokenWithServer('invalid-token', 'https://api.example.com/validate');

      expect(result).toBeNull();
    });

    it('returns null when API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await validateTokenWithServer('test-token', 'https://api.example.com/validate');

      expect(result).toBeNull();
    });
  });

  describe('isValidJwt', () => {
    it('returns true for valid unexpired JWT', () => {
      // JWT with exp in the future (year 2099)
      const futureExp = Math.floor(new Date('2099-01-01').getTime() / 1000);
      const payload = btoa(JSON.stringify({ authorized: true, exp: futureExp }));
      const jwt = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;

      expect(isValidJwt(jwt)).toBe(true);
    });

    it('returns false for expired JWT', () => {
      // JWT with exp in the past
      const pastExp = Math.floor(new Date('2020-01-01').getTime() / 1000);
      const payload = btoa(JSON.stringify({ authorized: true, exp: pastExp }));
      const jwt = `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;

      expect(isValidJwt(jwt)).toBe(false);
    });

    it('returns false for malformed JWT', () => {
      expect(isValidJwt('not-a-jwt')).toBe(false);
      expect(isValidJwt('')).toBe(false);
      expect(isValidJwt('a.b')).toBe(false);
    });

    it('returns false for JWT with invalid payload', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.!!!invalid-base64!!!.signature';
      expect(isValidJwt(jwt)).toBe(false);
    });
  });

  describe('getSession', () => {
    it('returns JWT from localStorage', () => {
      const jwt = 'stored.jwt.token';
      localStorageMock.setItem(STORAGE_KEY, jwt);

      expect(getSession()).toBe(jwt);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('returns null when no session exists', () => {
      expect(getSession()).toBeNull();
    });
  });

  describe('setSession', () => {
    it('stores JWT in localStorage', () => {
      const jwt = 'new.jwt.token';

      setSession(jwt);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, jwt);
    });
  });

  describe('clearSession', () => {
    it('removes JWT from localStorage', () => {
      localStorageMock.setItem(STORAGE_KEY, 'existing.jwt');

      clearSession();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });

  describe('extractTokenFromUrl', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      // @ts-expect-error - mocking window.location
      delete window.location;
    });

    afterEach(() => {
      window.location = originalLocation;
    });

    it('extracts token from URL query parameter', () => {
      // @ts-expect-error - mocking window.location
      window.location = { search: '?t=a1b2c3d4e5f67890' };

      expect(extractTokenFromUrl()).toBe('a1b2c3d4e5f67890');
    });

    it('returns null when no token in URL', () => {
      // @ts-expect-error - mocking window.location
      window.location = { search: '' };

      expect(extractTokenFromUrl()).toBeNull();
    });

    it('returns null when different query params present', () => {
      // @ts-expect-error - mocking window.location
      window.location = { search: '?other=value' };

      expect(extractTokenFromUrl()).toBeNull();
    });

    it('handles token with other query params', () => {
      // @ts-expect-error - mocking window.location
      window.location = { search: '?t=mytoken123&other=value' };

      expect(extractTokenFromUrl()).toBe('mytoken123');
    });
  });
});
