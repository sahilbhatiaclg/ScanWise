import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  startGuestSession,
  refreshAccessToken,
  logoutUser,
  deleteUserAccount,
} from '../api/auth';
import { setApiAuthToken } from '../api/client';

const AuthContext = createContext(null);

const GUEST_PROFILE_STORAGE = 'scanwise_guest_profile';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null); // 'user' | 'guest' | null
  const [user, setUser] = useState(null);
  const [guestProfile, setGuestProfileState] = useState(() => {
    try {
      const stored = sessionStorage.getItem(GUEST_PROFILE_STORAGE);
      return stored ? JSON.parse(stored) : { age_group: 'adult', conditions: [] };
    } catch {
      return { age_group: 'adult', conditions: [] };
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Initialize: attempt silent token refresh for logged in users
  useEffect(() => {
    let mounted = true;
    async function initAuth() {
      try {
        const res = await refreshAccessToken();
        if (mounted && res?.access_token) {
          setToken(res.access_token);
          setRole(res.role || 'user');
          setUser(res.user || null);
          setApiAuthToken(res.access_token);
        }
      } catch {
        // If refresh fails, check for saved guest token or stay unauthenticated
        if (mounted) {
          setToken(null);
          setRole(null);
          setUser(null);
          setApiAuthToken(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const loginWithToken = (authData) => {
    setToken(authData.access_token);
    setRole(authData.role || 'user');
    setUser(authData.user || null);
    setApiAuthToken(authData.access_token);
  };

  const continueAsGuest = async (customGuestProfile = null) => {
    setIsLoading(true);
    try {
      const guestData = await startGuestSession();
      setToken(guestData.access_token);
      setRole('guest');
      setUser(null);
      setApiAuthToken(guestData.access_token);
      if (customGuestProfile) {
        updateGuestProfile(customGuestProfile);
      }
      return guestData;
    } finally {
      setIsLoading(false);
    }
  };

  const updateGuestProfile = (profile) => {
    const updated = { ...guestProfile, ...profile };
    setGuestProfileState(updated);
    try {
      sessionStorage.setItem(GUEST_PROFILE_STORAGE, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save guest profile in session', e);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Logout API call failed, clearing local state', e);
    } finally {
      setToken(null);
      setRole(null);
      setUser(null);
      setApiAuthToken(null);
    }
  };

  const deleteAccount = async () => {
    await deleteUserAccount();
    setToken(null);
    setRole(null);
    setUser(null);
    setApiAuthToken(null);
  };

  const isGuest = role === 'guest';
  const isRegisteredUser = role === 'user';
  const isAuthenticated = Boolean(token);

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        user,
        guestProfile,
        isLoading,
        isGuest,
        isRegisteredUser,
        isAuthenticated,
        loginWithToken,
        continueAsGuest,
        updateGuestProfile,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

