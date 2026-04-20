import { create } from 'zustand';
import { getCurrentUser, signIn, signOut, signUp } from 'aws-amplify/auth';

export interface AuthUser {
  userId: string;
  email: string;
}

interface AuthStore {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;

  checkAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUpWithInvite: (
    email: string,
    password: string,
    inviteCode: string
  ) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const cognitoUser = await getCurrentUser();
      set({
        user: {
          userId: cognitoUser.userId,
          email: cognitoUser.signInDetails?.loginId ?? '',
        },
        isLoading: false,
      });
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      await signIn({ username: email, password });
      // Fetch user details after successful sign in
      const cognitoUser = await getCurrentUser();
      set({
        user: {
          userId: cognitoUser.userId,
          email: cognitoUser.signInDetails?.loginId ?? '',
        },
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await signOut();
      set({ user: null, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  signUpWithInvite: async (
    email: string,
    password: string,
    inviteCode: string
  ) => {
    set({ isLoading: true, error: null });
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            'custom:inviteCode': inviteCode,
          },
        },
      });
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
