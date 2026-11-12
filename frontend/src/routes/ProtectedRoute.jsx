import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/common/Spinner';

export function ProtectedRoute({ children, allowGuest = true, onNavigate }) {
  const { isAuthenticated, isGuest, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" label="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (onNavigate) onNavigate('welcome');
    return null;
  }

  if (!allowGuest && isGuest) {
    if (onNavigate) onNavigate('login');
    return null;
  }

  return <>{children}</>;
}

