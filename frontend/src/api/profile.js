import { apiClient } from './client';
import { isMockEnabled, mockDb } from '../mocks';

export async function getProfile() {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 200));
    return mockDb.profile;
  }
  return apiClient('/profile', { method: 'GET' });
}

export async function updateProfile(profileData) {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 300));
    Object.assign(mockDb.profile, profileData);
    return mockDb.profile;
  }
  return apiClient('/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
}

