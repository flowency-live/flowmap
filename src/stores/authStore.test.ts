/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock Amplify Auth
const mockGetCurrentUser = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockSignUp = vi.fn();

vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  signIn: (params: { username: string; password: string }) => mockSignIn(params),
  signOut: () => mockSignOut(),
  signUp: (params: unknown) => mockSignUp(params),
}));

// Import after mocks
const { useAuthStore } = await import('./authStore');

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useAuthStore.setState({
      user: null,
      isLoading: false,
      error: null,
    });
  });

  describe('checkAuth', () => {
    it('returns user when authenticated', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        userId: 'user-123',
        signInDetails: { loginId: 'user@example.com' },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(result.current.user).toEqual({
        userId: 'user-123',
        email: 'user@example.com',
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('returns null when not authenticated', async () => {
      mockGetCurrentUser.mockRejectedValueOnce(new Error('Not authenticated'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('sets isLoading during check', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockGetCurrentUser.mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(() => useAuthStore());

      const checkPromise = act(async () => {
        result.current.checkAuth();
      });

      // Should be loading immediately
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      resolvePromise!({ userId: 'user-123', signInDetails: { loginId: 'user@example.com' } });
      await checkPromise;

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('signIn', () => {
    it('succeeds with valid credentials', async () => {
      mockSignIn.mockResolvedValueOnce({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      });
      mockGetCurrentUser.mockResolvedValueOnce({
        userId: 'user-123',
        signInDetails: { loginId: 'user@example.com' },
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signIn('user@example.com', 'password123');
      });

      expect(mockSignIn).toHaveBeenCalledWith({
        username: 'user@example.com',
        password: 'password123',
      });
      expect(result.current.user).toEqual({
        userId: 'user-123',
        email: 'user@example.com',
      });
      expect(result.current.error).toBeNull();
    });

    it('sets error with invalid credentials', async () => {
      mockSignIn.mockRejectedValueOnce(new Error('Incorrect username or password.'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signIn('user@example.com', 'wrongpassword');
      });

      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe('Incorrect username or password.');
    });

    it('clears previous error on new sign in attempt', async () => {
      // First failed attempt
      mockSignIn.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signIn('user@example.com', 'wrong');
      });

      expect(result.current.error).toBe('First error');

      // Second attempt (successful)
      mockSignIn.mockResolvedValueOnce({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      });
      mockGetCurrentUser.mockResolvedValueOnce({
        userId: 'user-123',
        signInDetails: { loginId: 'user@example.com' },
      });

      await act(async () => {
        await result.current.signIn('user@example.com', 'correct');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('signOut', () => {
    it('clears user state', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: { userId: 'user-123', email: 'user@example.com' },
      });

      mockSignOut.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });
  });

  describe('signUpWithInvite', () => {
    it('creates user with invitation code', async () => {
      mockSignUp.mockResolvedValueOnce({
        isSignUpComplete: true,
        userId: 'new-user-123',
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.signUpWithInvite(
          'newuser@example.com',
          'Password123!',
          'invite-code-abc'
        );
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        username: 'newuser@example.com',
        password: 'Password123!',
        options: {
          userAttributes: {
            email: 'newuser@example.com',
            'custom:inviteCode': 'invite-code-abc',
          },
        },
      });
    });

    it('throws error when signup fails', async () => {
      mockSignUp.mockRejectedValueOnce(new Error('Invalid invitation code'));

      const { result } = renderHook(() => useAuthStore());

      await expect(
        act(async () => {
          await result.current.signUpWithInvite(
            'user@example.com',
            'Password123!',
            'invalid-code'
          );
        })
      ).rejects.toThrow('Invalid invitation code');
    });
  });

  describe('clearError', () => {
    it('clears the error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
