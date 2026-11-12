import { useState, useEffect, useCallback } from 'react';
import { getProfile, updateProfile as apiUpdateProfile } from '../api/profile';
import { useAuth } from './useAuth';

export function useProfile() {
  const { isRegisteredUser, isGuest, guestProfile, updateGuestProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    if (isGuest) {
      setProfile(guestProfile);
      return;
    }
    if (!isRegisteredUser) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch user profile');
    } finally {
      setIsLoading(false);
    }
  }, [isGuest, isRegisteredUser, guestProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = async (newProfileData) => {
    if (isGuest) {
      updateGuestProfile(newProfileData);
      setProfile((prev) => ({ ...prev, ...newProfileData }));
      return { ...guestProfile, ...newProfileData };
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await apiUpdateProfile(newProfileData);
      setProfile(res);
      return res;
    } catch (err) {
      setError(err.message || 'Failed to update profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    profile,
    isLoading,
    error,
    saveProfile,
    refetch: fetchProfile,
  };
}

