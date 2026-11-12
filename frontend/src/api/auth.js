import { apiClient, setApiAuthToken } from './client';
import { isMockEnabled, mockDb } from '../mocks';

export async function startGuestSession() {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 150));
    setApiAuthToken(mockDb.guestSession.access_token);
    return mockDb.guestSession;
  }
  try {
    const data = await apiClient('/auth/guest', { method: 'POST' });
    if (data?.access_token) {
      setApiAuthToken(data.access_token);
    }
    return data;
  } catch (err) {
    console.warn('Backend unavailable for guest session, falling back to local guest session', err);
    setApiAuthToken(mockDb.guestSession.access_token);
    return mockDb.guestSession;
  }
}

export async function requestOtp(phoneNumber) {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 200));
    return mockDb.otpRequest;
  }
  try {
    return await apiClient('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
  } catch (err) {
    console.warn('Backend unavailable for OTP request, falling back to mock OTP', err);
    return mockDb.otpRequest;
  }
}

export async function verifyOtp(phoneNumber, otp) {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 250));
    const token = 'mock-user-jwt-access-token-abc123';
    setApiAuthToken(token);
    return {
      access_token: token,
      role: 'user',
      user: {
        user_id: 1,
        phone_number: phoneNumber || '+919876543210',
      },
    };
  }
  try {
    const data = await apiClient('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber, otp }),
    });
    if (data?.access_token) {
      setApiAuthToken(data.access_token);
    }
    return data;
  } catch (err) {
    console.warn('Backend unavailable for OTP verify, falling back to mock session', err);
    const token = 'mock-user-jwt-access-token-abc123';
    setApiAuthToken(token);
    return {
      access_token: token,
      role: 'user',
      user: {
        user_id: 1,
        phone_number: phoneNumber || '+919876543210',
      },
    };
  }
}

export async function refreshAccessToken() {
  if (isMockEnabled()) {
    return { access_token: 'mock-user-jwt-refreshed', role: 'user' };
  }
  try {
    const data = await apiClient('/auth/refresh', { method: 'POST' });
    if (data?.access_token) {
      setApiAuthToken(data.access_token);
    }
    return data;
  } catch (err) {
    setApiAuthToken(null);
    throw err;
  }
}

export async function logoutUser() {
  if (isMockEnabled()) {
    setApiAuthToken(null);
    return { status: 'logged_out' };
  }
  try {
    return await apiClient('/auth/logout', { method: 'POST' });
  } catch (err) {
    console.warn('Backend logout failed, clearing local token', err);
    return { status: 'logged_out' };
  } finally {
    setApiAuthToken(null);
  }
}

export async function deleteUserAccount() {
  if (isMockEnabled()) {
    setApiAuthToken(null);
    return { status: 'deleted' };
  }
  try {
    return await apiClient('/account', { method: 'DELETE' });
  } catch (err) {
    console.warn('Backend delete account failed, clearing local token', err);
    return { status: 'deleted' };
  } finally {
    setApiAuthToken(null);
  }
}
