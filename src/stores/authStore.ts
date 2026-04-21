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
    _inviteCode: string
  ) => {
    // Note: inviteCode is validated client-side before signup and used
    // to mark the invitation as accepted after signup succeeds.
    // We don't store it in Cognito - the invitation table tracks usage.
    // Users are auto-confirmed via pre-signup Lambda trigger.
    set({ isLoading: true, error: null });
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
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
