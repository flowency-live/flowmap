/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the auth store
const mockCheckAuth = vi.fn();
let mockUser: { userId: string; email: string } | null = null;
let mockIsLoading = true;

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: mockUser,
    isLoading: mockIsLoading,
    checkAuth: mockCheckAuth,
  })),
}));

// Import after mocks
const { AuthGate } = await import('./AuthGate');

describe('AuthGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockIsLoading = true;
  });

  it('shows loading state while checking auth', () => {
    mockIsLoading = true;
    mockUser = null;

    render(
      <AuthGate>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGate>
    );

    expect(screen.getByText(/checking access/i)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('shows children when authenticated', () => {
    mockIsLoading = false;
    mockUser = { userId: 'user-123', email: 'user@example.com' };

    render(
      <AuthGate>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGate>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('shows login form when not authenticated', () => {
    mockIsLoading = false;
    mockUser = null;

    render(
      <AuthGate>
        <div data-testid="protected-content">Protected Content</div>
      </AuthGate>
    );

    expect(screen.getByText(/sign in to flowmap/i)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('calls checkAuth on mount when no user', () => {
    mockIsLoading = true;
    mockUser = null;

    render(
      <AuthGate>
        <div>Protected Content</div>
      </AuthGate>
    );

    expect(mockCheckAuth).toHaveBeenCalledTimes(1);
  });

  it('does not call checkAuth if user already exists', () => {
    mockIsLoading = false;
    mockUser = { userId: 'user-123', email: 'user@example.com' };

    render(
      <AuthGate>
        <div>Protected Content</div>
      </AuthGate>
    );

    expect(mockCheckAuth).not.toHaveBeenCalled();
  });

  it('renders email input and password input in login form', () => {
    mockIsLoading = false;
    mockUser = null;

    render(
      <AuthGate>
        <div>Protected Content</div>
      </AuthGate>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});
