/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-1234-5678';
vi.stubGlobal('crypto', {
  randomUUID: () => mockUUID,
});

// Mock the Amplify client
const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/amplifyClient', () => ({
  client: {
    models: {
      Invitation: {
        list: (params?: unknown) => mockList(params),
        create: (data: unknown) => mockCreate(data),
        update: (data: unknown) => mockUpdate(data),
      },
    },
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
      mockList.mockResolvedValueOnce({ data: mockInvitations });

      await useInvitationStore.getState().loadInvitations();

      const state = useInvitationStore.getState();
      expect(state.invitations).toHaveLength(2);
      expect(state.invitations[0].email).toBe('user1@example.com');
    });

    it('sets isLoading during fetch', async () => {
      mockList.mockImplementationOnce(() => {
        // Check state during the call
        expect(useInvitationStore.getState().isLoading).toBe(true);
        return Promise.resolve({ data: [] });
      });

      await useInvitationStore.getState().loadInvitations();

      expect(useInvitationStore.getState().isLoading).toBe(false);
    });
  });

  describe('createInvitation', () => {
    it('generates unique code and creates invitation', async () => {
      mockCreate.mockResolvedValueOnce({
        data: {
          id: 'inv-1',
          email: 'newuser@example.com',
          code: mockUUID,
          status: 'pending',
        },
      });

      const inviteUrl = await useInvitationStore.getState().createInvitation('newuser@example.com');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          code: mockUUID,
          status: 'pending',
          invitedBy: 'admin-user-123',
        })
      );
      expect(inviteUrl).toContain(mockUUID);
    });

    it('adds new invitation to store', async () => {
      mockCreate.mockResolvedValueOnce({
        data: {
          id: 'inv-1',
          email: 'newuser@example.com',
          code: mockUUID,
          status: 'pending',
        },
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
          { id: 'inv-1', email: 'user@example.com', code: 'code1', status: 'pending' as const, invitedBy: 'admin', invitedAt: new Date().toISOString() },
        ],
      });

      mockUpdate.mockResolvedValueOnce({
        data: { id: 'inv-1', status: 'revoked' },
      });

      await useInvitationStore.getState().revokeInvitation('inv-1');

      expect(mockUpdate).toHaveBeenCalledWith({
        id: 'inv-1',
        status: 'revoked',
      });
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
      mockList.mockResolvedValueOnce({ data: [mockInvitation] });

      const found = await useInvitationStore.getState().getInvitationByCode('test-code');

      expect(found).toEqual(mockInvitation);
    });

    it('returns null when not found', async () => {
      mockList.mockResolvedValueOnce({ data: [] });

      const found = await useInvitationStore.getState().getInvitationByCode('nonexistent');

      expect(found).toBeNull();
    });
  });

  describe('markInvitationAccepted', () => {
    it('updates invitation status to accepted', async () => {
      useInvitationStore.setState({
        invitations: [
          { id: 'inv-1', email: 'user@example.com', code: 'code1', status: 'pending' as const, invitedBy: 'admin', invitedAt: new Date().toISOString() },
        ],
      });

      mockUpdate.mockResolvedValueOnce({
        data: { id: 'inv-1', status: 'accepted' },
      });

      await useInvitationStore.getState().markInvitationAccepted('inv-1');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'inv-1',
          status: 'accepted',
        })
      );
    });
  });
});
