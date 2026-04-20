import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { LoginForm } from './LoginForm';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    // Only check auth if we don't already have a user
    if (!user) {
      checkAuth();
    }
  }, [user, checkAuth]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <LoginForm />
      </div>
    );
  }

  // Authenticated - render children
  return <>{children}</>;
}
