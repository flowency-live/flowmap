/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock URL search params
let mockCode: string | null = 'valid-code-123';
vi.mock('@/lib/auth', () => ({
  extractInviteCodeFromUrl: () => mockCode,
  clearInviteCodeFromUrl: vi.fn(),
}));

// Mock invitation store
const mockGetInvitationByCode = vi.fn();
const mockMarkInvitationAccepted = vi.fn();

vi.mock('@/stores/invitationStore', () => ({
  useInvitationStore: vi.fn(() => ({
    getInvitationByCode: mockGetInvitationByCode,
    markInvitationAccepted: mockMarkInvitationAccepted,
  })),
}));

// Mock auth store
const mockSignUpWithInvite = vi.fn();
const mockSignIn = vi.fn();

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    signUpWithInvite: mockSignUpWithInvite,
    signIn: mockSignIn,
    isLoading: false,
    error: null,
  })),
}));

// Mock router
const mockNavigate = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockNavigate],
}));

// Import after mocks
const { InviteSignup } = await import('./InviteSignup');

describe('InviteSignup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCode = 'valid-code-123';
  });

  it('shows loading while fetching invitation', () => {
    mockGetInvitationByCode.mockReturnValueOnce(new Promise(() => {})); // Never resolves

    render(<InviteSignup />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error for invalid code', async () => {
    mockGetInvitationByCode.mockResolvedValueOnce(null);

    render(<InviteSignup />);

    await waitFor(() => {
      expect(screen.getByText(/invalid invitation/i)).toBeInTheDocument();
    });
  });

  it('shows error for already-used invitation', async () => {
    mockGetInvitationByCode.mockResolvedValueOnce({
      id: 'inv-1',
      email: 'user@example.com',
      code: 'valid-code-123',
      status: 'accepted',
    });

    render(<InviteSignup />);

    await waitFor(() => {
      expect(screen.getByText(/already been used/i)).toBeInTheDocument();
    });
  });

  it('pre-fills email from invitation', async () => {
    mockGetInvitationByCode.mockResolvedValueOnce({
      id: 'inv-1',
      email: 'invited@example.com',
      code: 'valid-code-123',
      status: 'pending',
    });

    render(<InviteSignup />);

    await waitFor(() => {
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      expect(emailInput.value).toBe('invited@example.com');
      expect(emailInput).toBeDisabled();
    });
  });

  it('shows error when no code in URL', async () => {
    mockCode = null;

    render(<InviteSignup />);

    await waitFor(() => {
      expect(screen.getByText(/no invitation code/i)).toBeInTheDocument();
    });
  });

  it('creates user on valid submission', async () => {
    const user = userEvent.setup();
    mockGetInvitationByCode.mockResolvedValueOnce({
      id: 'inv-1',
      email: 'invited@example.com',
      code: 'valid-code-123',
      status: 'pending',
    });
    mockSignUpWithInvite.mockResolvedValueOnce(undefined);
    mockSignIn.mockResolvedValueOnce(undefined);

    render(<InviteSignup />);

    await waitFor(() => {
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    await user.type(passwordInput, 'Password123!');
    await user.type(confirmInput, 'Password123!');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignUpWithInvite).toHaveBeenCalledWith(
        'invited@example.com',
        'Password123!',
        'valid-code-123'
      );
    });
  });

  it('shows password mismatch error', async () => {
    const user = userEvent.setup();
    mockGetInvitationByCode.mockResolvedValueOnce({
      id: 'inv-1',
      email: 'invited@example.com',
      code: 'valid-code-123',
      status: 'pending',
    });

    render(<InviteSignup />);

    await waitFor(() => {
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });

    await user.type(passwordInput, 'Password123!');
    await user.type(confirmInput, 'DifferentPassword!');
    await user.click(submitButton);

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockSignUpWithInvite).not.toHaveBeenCalled();
  });
});
