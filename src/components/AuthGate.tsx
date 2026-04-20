import { useEffect, useState, type ReactNode } from 'react';
import {
  getSession,
  setSession,
  clearSession,
  extractTokenFromUrl,
  clearTokenFromUrl,
  validateTokenWithServer,
  isValidJwt,
} from '@/lib/auth';

type AuthState = 'checking' | 'validating' | 'authenticated' | 'denied' | 'prompt';

interface AuthGateProps {
  children: ReactNode;
  apiUrl: string;
}

export function AuthGate({ children, apiUrl }: AuthGateProps) {
  const [authState, setAuthState] = useState<AuthState>('checking');

  useEffect(() => {
    async function checkAuth() {
      // Check for existing session
      const existingJwt = getSession();
      if (existingJwt && isValidJwt(existingJwt)) {
        setAuthState('authenticated');
        return;
      }

      // Clear invalid session
      if (existingJwt) {
        clearSession();
      }

      // Check for token in URL
      const urlToken = extractTokenFromUrl();
      if (urlToken) {
        setAuthState('validating');
        const jwt = await validateTokenWithServer(urlToken, apiUrl);

        if (jwt) {
          setSession(jwt);
          clearTokenFromUrl();
          setAuthState('authenticated');
        } else {
          setAuthState('denied');
        }
        return;
      }

      // No session and no token - show prompt
      setAuthState('prompt');
    }

    checkAuth();
  }, [apiUrl]);

  if (authState === 'checking' || authState === 'validating') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">
            {authState === 'checking' ? 'Checking access...' : 'Validating access link...'}
          </p>
        </div>
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg
              className="h-8 w-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Invalid Access Link</h1>
          <p className="text-muted-foreground">
            The access link you used is invalid or has expired. Please request a valid link from your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (authState === 'prompt') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              className="h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Access Required</h1>
          <p className="text-muted-foreground">
            Please use your shared access link to view FlowMap. Contact your administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  // authState === 'authenticated'
  return <>{children}</>;
}
