/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the auth store
const mockSignIn = vi.fn();
const mockClearError = vi.fn();

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    signIn: mockSignIn,
    clearError: mockClearError,
    isLoading: false,
    error: null,
  })),
}));

// Import after mocks
const { LoginForm } = await import('./LoginForm');

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls signIn on form submit', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('shows error message when error exists', async () => {
    const { useAuthStore } = await import('@/stores/authStore');
    vi.mocked(useAuthStore).mockReturnValue({
      signIn: mockSignIn,
      clearError: mockClearError,
      isLoading: false,
      error: 'Incorrect username or password.',
    });

    render(<LoginForm />);

    expect(screen.getByText('Incorrect username or password.')).toBeInTheDocument();
  });

  it('disables button while loading', async () => {
    const { useAuthStore } = await import('@/stores/authStore');
    vi.mocked(useAuthStore).mockReturnValue({
      signIn: mockSignIn,
      clearError: mockClearError,
      isLoading: true,
      error: null,
    });

    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: /signing in/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state on button while signing in', async () => {
    const { useAuthStore } = await import('@/stores/authStore');
    vi.mocked(useAuthStore).mockReturnValue({
      signIn: mockSignIn,
      clearError: mockClearError,
      isLoading: true,
      error: null,
    });

    render(<LoginForm />);

    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });

  it('clears error when user types in form', async () => {
    const { useAuthStore } = await import('@/stores/authStore');
    vi.mocked(useAuthStore).mockReturnValue({
      signIn: mockSignIn,
      clearError: mockClearError,
      isLoading: false,
      error: 'Some error',
    });

    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'a');

    expect(mockClearError).toHaveBeenCalled();
  });

  it('prevents submission with empty fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('has link to invite signup when onSwitchToInvite provided', () => {
    const mockSwitch = vi.fn();
    render(<LoginForm onSwitchToInvite={mockSwitch} />);

    const link = screen.getByText(/have an invite/i);
    expect(link).toBeInTheDocument();
  });
});
