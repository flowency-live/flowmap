import { create } from 'zustand';
import { useAuthStore } from '@/stores/authStore';
import { buildInviteUrl } from '@/lib/auth';
import { toast } from '@/stores/toastStore';

// Type for Amplify outputs with custom fields (not inferred from local JSON)
interface AmplifyOutputs {
  custom?: {
    invitationApiUrl?: string;
  };
}

// Import outputs with proper typing (local file may not have custom field)
import outputsJson from '../../amplify_outputs.json';
const outputs = outputsJson as AmplifyOutputs;

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

// Get invitation API URL from amplify_outputs.json (Amplify recommended pattern)
// Note: Amplify.getConfig() strips custom fields, so we import directly
function getInvitationApiUrl(): string {
  const url = outputs.custom?.invitationApiUrl;
  if (!url) {
    throw new Error('Invitation API URL not configured - run npx ampx sandbox or deploy');
  }
  return url;
}

export const useInvitationStore = create<InvitationStore>((set) => ({
  invitations: [],
  isLoading: false,
  error: null,

  loadInvitations: async () => {
    set({ isLoading: true, error: null });
    try {
      const apiUrl = getInvitationApiUrl();
      const response = await fetch(`${apiUrl}invitations`);
      if (!response.ok) throw new Error('Failed to load invitations');
      const invitations = await response.json();
      set({ invitations, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load invitations',
        isLoading: false,
      });
    }
  },

  createInvitation: async (email: string) => {
    const currentUser = useAuthStore.getState().user;

    try {
      const apiUrl = getInvitationApiUrl();
      const response = await fetch(`${apiUrl}invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          invitedBy: currentUser?.userId ?? 'admin',
        }),
      });

      if (!response.ok) throw new Error('Failed to create invitation');
      const newInvitation: Invitation = await response.json();

      set((state) => ({
        invitations: [...state.invitations, newInvitation],
      }));
      toast.success(`Invitation sent to ${email}`);

      return buildInviteUrl(newInvitation.code);
    } catch (error) {
      toast.error('Failed to create invitation');
      throw error;
    }
  },

  revokeInvitation: async (id: string) => {
    try {
      const apiUrl = getInvitationApiUrl();
      const response = await fetch(`${apiUrl}invitations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'revoked' }),
      });

      if (!response.ok) throw new Error('Failed to revoke invitation');

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
      const apiUrl = getInvitationApiUrl();
      console.log('Fetching invitation from:', `${apiUrl}invitations/by-code?code=${code}`);
      const response = await fetch(`${apiUrl}invitations/by-code?code=${encodeURIComponent(code)}`);
      if (!response.ok) {
        console.error('Invitation fetch failed:', response.status);
        return null;
      }
      return await response.json();
    } catch (err) {
      console.error('getInvitationByCode error:', err);
      return null;
    }
  },

  markInvitationAccepted: async (id: string) => {
    try {
      const apiUrl = getInvitationApiUrl();
      await fetch(`${apiUrl}invitations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
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
