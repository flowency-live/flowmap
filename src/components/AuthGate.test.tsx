/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock the auth utilities
const mockGetSession = vi.fn();
const mockSetSession = vi.fn();
const mockClearSession = vi.fn();
const mockExtractTokenFromUrl = vi.fn();
const mockClearTokenFromUrl = vi.fn();
const mockValidateTokenWithServer = vi.fn();
const mockIsValidJwt = vi.fn();

vi.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
  setSession: (jwt: string) => mockSetSession(jwt),
  clearSession: () => mockClearSession(),
  extractTokenFromUrl: () => mockExtractTokenFromUrl(),
  clearTokenFromUrl: () => mockClearTokenFromUrl(),
  validateTokenWithServer: (token: string, url: string) =>
    mockValidateTokenWithServer(token, url),
  isValidJwt: (jwt: string) => mockIsValidJwt(jwt),
}));

// Import after mocks
const { AuthGate } = await import('./AuthGate');

describe('AuthGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no session, no token in URL
    mockGetSession.mockReturnValue(null);
    mockExtractTokenFromUrl.mockReturnValue(null);
    mockIsValidJwt.mockReturnValue(false);
  });

  it('shows children when valid JWT exists in storage', async () => {
    const validJwt = 'valid.jwt.token';
    mockGetSession.mockReturnValue(validJwt);
    mockIsValidJwt.mockReturnValue(true);

    render(
      <AuthGate apiUrl="https://api.test/validate">
        <div data-testid="protected-content">Protected Content</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  it('shows loading state while checking session', () => {
    // Session check is synchronous, so this tests initial render
    mockGetSession.mockReturnValue(null);
    mockExtractTokenFromUrl.mockReturnValue('token123');
    mockValidateTokenWithServer.mockReturnValue(new Promise(() => {})); // Never resolves

    render(
      <AuthGate apiUrl="https://api.test/validate">
        <div>Protected Content</div>
      </AuthGate>
    );

    expect(screen.getByText(/validating/i)).toBeInTheDocument();
  });

  it('calls server validation when URL has token', async () => {
    mockExtractTokenFromUrl.mockReturnValue('url-token-123');
    mockValidateTokenWithServer.mockResolvedValue('new.jwt.token');

    render(
      <AuthGate apiUrl="https://api.test/validate">
        <div data-testid="protected-content">Protected Content</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(mockValidateTokenWithServer).toHaveBeenCalledWith(
        'url-token-123',
        'https://api.test/validate'
      );
    });
  });

  it('stores JWT and shows children on successful validation', async () => {
    mockExtractTokenFromUrl.mockReturnValue('url-token-123');
    mockValidateTokenWithServer.mockResolvedValue('new.jwt.token');

    render(
      <AuthGate apiUrl="https://api.test/validate">
        <div data-testid="protected-content">Protected Content</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalledWith('new.jwt.token');
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  it('shows error when server returns 401 (null JWT)', async () => {
    mockExtractTokenFromUrl.mockReturnValue('invalid-token');
    mockValidateTokenWithServer.mockResolvedValue(null);

    render(
      <AuthGate apiUrl="https://api.test/validate">
        <div>Protected Content</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByText(/invalid access link/i)).toBeInTheDocument();
    });
  });

  it('shows prompt when no token and no session', async () => {
    mockGetSession.mockReturnValue(null);
    mockExtractTokenFromUrl.mockReturnValue(null);

    render(
      <AuthGate apiUrl="https://api.test/validate">
        <div>Protected Content</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(screen.getByText(/access required/i)).toBeInTheDocument();
    });
  });

  it('clears URL params after successful auth', async () => {
    mockExtractTokenFromUrl.mockReturnValue('url-token-123');
    mockValidateTokenWithServer.mockResolvedValue('new.jwt.token');

    render(
      <AuthGate apiUrl="https://api.test/validate">
        <div data-testid="protected-content">Protected Content</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(mockClearTokenFromUrl).toHaveBeenCalled();
    });
  });

  it('clears invalid session and shows prompt', async () => {
    const expiredJwt = 'expired.jwt.token';
    mockGetSession.mockReturnValue(expiredJwt);
    mockIsValidJwt.mockReturnValue(false);
    mockExtractTokenFromUrl.mockReturnValue(null);

    render(
      <AuthGate apiUrl="https://api.test/validate">
        <div>Protected Content</div>
      </AuthGate>
    );

    await waitFor(() => {
      expect(mockClearSession).toHaveBeenCalled();
      expect(screen.getByText(/access required/i)).toBeInTheDocument();
    });
  });
});
