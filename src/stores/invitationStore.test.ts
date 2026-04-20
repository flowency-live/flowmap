/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Amplify.getConfig
vi.mock('aws-amplify', () => ({
  Amplify: {
    getConfig: () => ({
      custom: {
        invitationApiUrl: 'https://test-api.example.com/',
      },
    }),
  },
}));

// Mock toast
vi.mock('@/stores/toastStore', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock auth store for current user
vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      user: { userId: 'admin-user-123', email: 'admin@example.com' },
    }),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mocks
const { useInvitationStore } = await import('./invitationStore');

describe('invitationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useInvitationStore.setState({
      invitations: [],
      isLoading: false,
      error: null,
    });
  });

  describe('loadInvitations', () => {
    it('fetches all invitations', async () => {
      const mockInvitations = [
        { id: '1', email: 'user1@example.com', code: 'code1', status: 'pending' },
        { id: '2', email: 'user2@example.com', code: 'code2', status: 'accepted' },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInvitations),
      });

      await useInvitationStore.getState().loadInvitations();

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.example.com/invitations');
      const state = useInvitationStore.getState();
      expect(state.invitations).toHaveLength(2);
      expect(state.invitations[0].email).toBe('user1@example.com');
    });

    it('sets isLoading during fetch', async () => {
      mockFetch.mockImplementationOnce(() => {
        expect(useInvitationStore.getState().isLoading).toBe(true);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      await useInvitationStore.getState().loadInvitations();

      expect(useInvitationStore.getState().isLoading).toBe(false);
    });
  });

  describe('createInvitation', () => {
    it('creates invitation via API', async () => {
      const mockInvitation = {
        id: 'inv-1',
        email: 'newuser@example.com',
        code: 'generated-code-123',
        status: 'pending',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInvitation),
      });

      const inviteUrl = await useInvitationStore.getState().createInvitation('newuser@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/invitations',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'newuser@example.com',
            invitedBy: 'admin-user-123',
          }),
        })
      );
      expect(inviteUrl).toContain('generated-code-123');
    });

    it('adds new invitation to store', async () => {
      const mockInvitation = {
        id: 'inv-1',
        email: 'newuser@example.com',
        code: 'generated-code-123',
        status: 'pending',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInvitation),
      });

      await useInvitationStore.getState().createInvitation('newuser@example.com');

      const state = useInvitationStore.getState();
      expect(state.invitations).toHaveLength(1);
      expect(state.invitations[0].email).toBe('newuser@example.com');
    });
  });

  describe('revokeInvitation', () => {
    it('updates invitation status to revoked', async () => {
      useInvitationStore.setState({
        invitations: [
          { id: 'inv-1', email: 'user@example.com', code: 'code1', status: 'pending' as const },
        ],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'inv-1', status: 'revoked' }),
      });

      await useInvitationStore.getState().revokeInvitation('inv-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/invitations/inv-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'revoked' }),
        })
      );
      expect(useInvitationStore.getState().invitations[0].status).toBe('revoked');
    });
  });

  describe('getInvitationByCode', () => {
    it('finds invitation by code', async () => {
      const mockInvitation = {
        id: 'inv-1',
        email: 'user@example.com',
        code: 'test-code',
        status: 'pending',
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockInvitation),
      });

      const found = await useInvitationStore.getState().getInvitationByCode('test-code');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/invitations/by-code?code=test-code'
      );
      expect(found).toEqual(mockInvitation);
    });

    it('returns null when not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const found = await useInvitationStore.getState().getInvitationByCode('nonexistent');

      expect(found).toBeNull();
    });
  });

  describe('markInvitationAccepted', () => {
    it('updates invitation status to accepted', async () => {
      useInvitationStore.setState({
        invitations: [
          { id: 'inv-1', email: 'user@example.com', code: 'code1', status: 'pending' as const },
        ],
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'inv-1', status: 'accepted' }),
      });

      await useInvitationStore.getState().markInvitationAccepted('inv-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/invitations/inv-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'accepted' }),
        })
      );
      expect(useInvitationStore.getState().invitations[0].status).toBe('accepted');
    });
  });
});
