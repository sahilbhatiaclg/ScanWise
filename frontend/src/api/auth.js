import { apiClient, setApiAuthToken, ApiError } from './client';
import { isMockEnabled, mockDb } from '../mocks';

/**
 * Auth API.
 *
 * - Mock mode (VITE_USE_MOCKS != 'false'): everything is simulated locally. The mock session is kept in
 *   sessionStorage so a page refresh keeps you signed in, and a fresh tab starts logged-out (so the
 *   Welcome / Login screens are actually reachable).
 * - Real mode: real HTTP calls. Errors are surfaced to the UI (never silently turned into a fake login).
 *   Set VITE_ALLOW_MOCK_FALLBACK=true to fall back to mocks only when the server is unreachable.
 */

const MOCK_SESSION_KEY = 'scanwise_mock_session';
const MOCK_OTP = mockDb.otpRequest.mock_otp_hint || '123456';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const allowFallback = () => import.meta.env.VITE_ALLOW_MOCK_FALLBACK === 'true';
const isServerDown = (err) => err instanceof ApiError && (err.status === 0 || err.status >= 500);

function readMockSession() {
  try {
    return JSON.parse(sessionStorage.getItem(MOCK_SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}
function writeMockSession(session) {
  try {
    if (session) sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(MOCK_SESSION_KEY);
  } catch {
    /* storage unavailable (private mode) - session just won't survive a refresh */
  }
}

/** Make sure the backend really returned a token; otherwise the UI would silently do nothing. */
function assertToken(data, what) {
  if (!data || typeof data !== 'object' || typeof data.access_token !== 'string' || !data.access_token) {
    throw new ApiError(
      'BAD_RESPONSE',
      `The server sent an unexpected response while ${what}. Please try again later.`,
      502
    );
  }
  return data;
}

function mockUserSession(phoneNumber) {
  return {
    access_token: 'mock-user-jwt-access-token-abc123',
    role: 'user',
    user: { user_id: 1, phone_number: phoneNumber || '+919876543210' },
  };
}

export async function startGuestSession() {
  if (isMockEnabled()) {
    await delay(150);
    const session = { ...mockDb.guestSession, role: 'guest' };
    writeMockSession(session);
    setApiAuthToken(session.access_token);
    return session;
  }
  try {
    const data = assertToken(await apiClient('/auth/guest', { method: 'POST' }), 'starting a guest session');
    setApiAuthToken(data.access_token);
    return { ...data, role: 'guest' };
  } catch (err) {
    if (allowFallback() && isServerDown(err)) {
      console.warn('Backend unavailable, using local guest session (dev fallback)', err);
      setApiAuthToken(mockDb.guestSession.access_token);
      return { ...mockDb.guestSession, role: 'guest' };
    }
    throw err;
  }
}

export async function requestOtp(phoneNumber) {
  if (isMockEnabled()) {
    await delay(200);
    return mockDb.otpRequest;
  }
  try {
    return await apiClient('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
  } catch (err) {
    if (allowFallback() && isServerDown(err)) {
      console.warn('Backend unavailable, using mock OTP (dev fallback)', err);
      return mockDb.otpRequest;
    }
    throw err;
  }
}

export async function verifyOtp(phoneNumber, otp) {
  if (isMockEnabled()) {
    await delay(250);
    if (otp !== MOCK_OTP) {
      throw new ApiError('INVALID_OTP', `Incorrect code. In demo mode use ${MOCK_OTP}.`, 401);
    }
    const session = mockUserSession(phoneNumber);
    writeMockSession(session);
    setApiAuthToken(session.access_token);
    return session;
  }
  try {
    const data = assertToken(
      await apiClient('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phoneNumber, otp }),
      }),
      'verifying your code'
    );
    setApiAuthToken(data.access_token);
    return { role: 'user', ...data };
  } catch (err) {
    // Only fall back when the server is down - a WRONG otp (4xx) must never log anyone in.
    if (allowFallback() && isServerDown(err) && otp === MOCK_OTP) {
      console.warn('Backend unavailable, using mock session (dev fallback)', err);
      const session = mockUserSession(phoneNumber);
      setApiAuthToken(session.access_token);
      return session;
    }
    throw err;
  }
}

/** Restores an existing session on page load. Throws when there is none (=> show Welcome). */
export async function refreshAccessToken() {
  if (isMockEnabled()) {
    const session = readMockSession();
    if (!session) throw new ApiError('NO_SESSION', 'No active session', 401);
    setApiAuthToken(session.access_token);
    return session;
  }
  try {
    const data = assertToken(await apiClient('/auth/refresh', { method: 'POST' }), 'restoring your session');
    setApiAuthToken(data.access_token);
    return { role: 'user', ...data };
  } catch (err) {
    setApiAuthToken(null);
    throw err;
  }
}

export async function logoutUser() {
  if (isMockEnabled()) {
    writeMockSession(null);
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
    writeMockSession(null);
    setApiAuthToken(null);
    return { status: 'deleted' };
  }
  try {
    return await apiClient('/account', { method: 'DELETE' });
  } finally {
    setApiAuthToken(null);
  }
}