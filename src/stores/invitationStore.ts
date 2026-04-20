import { create } from 'zustand';
import { client } from '@/lib/amplifyClient';
import { useAuthStore } from '@/stores/authStore';
import { generateInviteCode, buildInviteUrl } from '@/lib/auth';
import { toast } from '@/stores/toastStore';

export interface Invitation {
  id: string;
  email: string;
  code: string;
  status: 'pending' | 'accepted' | 'revoked';
  invitedBy?: string;
  invitedAt?: string;
  acceptedAt?: string;
}

interface InvitationStore {
  invitations: Invitation[];
  isLoading: boolean;
  error: string | null;

  loadInvitations: () => Promise<void>;
  createInvitation: (email: string) => Promise<string>;
  revokeInvitation: (id: string) => Promise<void>;
  getInvitationByCode: (code: string) => Promise<Invitation | null>;
  markInvitationAccepted: (id: string) => Promise<void>;
}

export const useInvitationStore = create<InvitationStore>((set, get) => ({
  invitations: [],
  isLoading: false,
  error: null,

  loadInvitations: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await client.models.Invitation.list();
      const invitations = (result.data ?? []).map((inv) => ({
        id: inv.id,
        email: inv.email,
        code: inv.code,
        status: inv.status as 'pending' | 'accepted' | 'revoked',
        invitedBy: inv.invitedBy ?? undefined,
        invitedAt: inv.invitedAt ?? undefined,
        acceptedAt: inv.acceptedAt ?? undefined,
      }));
      set({ invitations, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load invitations',
        isLoading: false,
      });
    }
  },

  createInvitation: async (email: string) => {
    const code = generateInviteCode();
    const currentUser = useAuthStore.getState().user;

    try {
      const result = await client.models.Invitation.create({
        email,
        code,
        status: 'pending',
        invitedBy: currentUser?.userId,
        invitedAt: new Date().toISOString(),
      });

      if (result.data) {
        const newInvitation: Invitation = {
          id: result.data.id,
          email: result.data.email,
          code: result.data.code,
          status: result.data.status as 'pending' | 'accepted' | 'revoked',
          invitedBy: result.data.invitedBy ?? undefined,
          invitedAt: result.data.invitedAt ?? undefined,
        };
        set((state) => ({
          invitations: [...state.invitations, newInvitation],
        }));
        toast.success(`Invitation sent to ${email}`);
      }

      return buildInviteUrl(code);
    } catch (error) {
      toast.error('Failed to create invitation');
      throw error;
    }
  },

  revokeInvitation: async (id: string) => {
    try {
      await client.models.Invitation.update({
        id,
        status: 'revoked',
      });
      set((state) => ({
        invitations: state.invitations.map((inv) =>
          inv.id === id ? { ...inv, status: 'revoked' as const } : inv
        ),
      }));
      toast.success('Invitation revoked');
    } catch (error) {
      toast.error('Failed to revoke invitation');
      throw error;
    }
  },

  getInvitationByCode: async (code: string) => {
    try {
      // Query by the byCode GSI
      const result = await client.models.Invitation.list({
        filter: { code: { eq: code } },
      });
      const invitation = result.data?.[0];
      if (!invitation) return null;

      return {
        id: invitation.id,
        email: invitation.email,
        code: invitation.code,
        status: invitation.status as 'pending' | 'accepted' | 'revoked',
        invitedBy: invitation.invitedBy ?? undefined,
        invitedAt: invitation.invitedAt ?? undefined,
        acceptedAt: invitation.acceptedAt ?? undefined,
      };
    } catch {
      return null;
    }
  },

  markInvitationAccepted: async (id: string) => {
    try {
      await client.models.Invitation.update({
        id,
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });
      set((state) => ({
        invitations: state.invitations.map((inv) =>
          inv.id === id
            ? { ...inv, status: 'accepted' as const, acceptedAt: new Date().toISOString() }
            : inv
        ),
      }));
    } catch (error) {
      console.error('Failed to mark invitation as accepted:', error);
    }
  },
}));
