import { useState, useEffect, type FormEvent } from 'react';
import { useInvitationStore } from '@/stores/invitationStore';
import { useAuthStore } from '@/stores/authStore';
import { extractInviteCodeFromUrl } from '@/lib/auth';

type PageState = 'loading' | 'no-code' | 'invalid' | 'used' | 'revoked' | 'ready' | 'submitting' | 'success';

export function InviteSignup() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [email, setEmail] = useState('');
  const [invitationId, setInvitationId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { getInvitationByCode, markInvitationAccepted } = useInvitationStore();
  const { signUpWithInvite, signIn } = useAuthStore();

  useEffect(() => {
    async function loadInvitation() {
      const inviteCode = extractInviteCodeFromUrl();

      if (!inviteCode) {
        setPageState('no-code');
        return;
      }

      setCode(inviteCode);

      try {
        const invitation = await getInvitationByCode(inviteCode);

        if (!invitation) {
          setPageState('invalid');
          return;
        }

        if (invitation.status === 'accepted') {
          setPageState('used');
          return;
        }

        if (invitation.status === 'revoked') {
          setPageState('revoked');
          return;
        }

        setEmail(invitation.email);
        setInvitationId(invitation.id);
        setPageState('ready');
      } catch {
        setPageState('invalid');
      }
    }

    loadInvitation();
  }, [getInvitationByCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setPageState('submitting');

    try {
      await signUpWithInvite(email, password, code);
      await markInvitationAccepted(invitationId);
      // Auto sign in after signup
      await signIn(email, password);
      setPageState('success');
      // Full page navigation since InviteSignup is outside the main Router
      setTimeout(() => { window.location.href = '/'; }, 1000);
    } catch (err) {
      setPageState('ready');
      setError(err instanceof Error ? err.message : 'Failed to create account');
    }
  };

  if (pageState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (pageState === 'no-code') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">No Invitation Code</h1>
          <p className="text-muted-foreground">
            This page requires an invitation code. Please use the link provided in your invitation.
          </p>
        </div>
      </div>
    );
  }

  if (pageState === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Invalid Invitation</h1>
          <p className="text-muted-foreground">
            This invitation link is invalid or has expired. Please contact your administrator for a new invitation.
          </p>
        </div>
      </div>
    );
  }

  if (pageState === 'used') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Invitation Already Used</h1>
          <p className="text-muted-foreground mb-4">
            This invitation has already been used to create an account.
          </p>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="text-primary hover:underline font-medium"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  if (pageState === 'revoked') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Invitation Revoked</h1>
          <p className="text-muted-foreground">
            This invitation has been revoked. Please contact your administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Account Created!</h1>
          <p className="text-muted-foreground">Redirecting to FlowMap...</p>
        </div>
      </div>
    );
  }

  // pageState === 'ready' || 'submitting'
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Create Your Account</h1>
          <p className="text-muted-foreground text-sm">
            Set a password to complete your FlowMap account setup.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
              disabled={pageState === 'submitting'}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
              disabled={pageState === 'submitting'}
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pageState === 'submitting'}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pageState === 'submitting' ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => { window.location.href = '/'; }}
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
