import guestSession from './data/guestSession.json';
import otpRequest from './data/otpRequest.json';
import profile from './data/profile.json';
import scanExtracted from './data/scanExtracted.json';
import report from './data/report.json';
import reportsList from './data/reportsList.json';

export const mockDb = {
  guestSession,
  otpRequest,
  profile,
  scanExtracted,
  report,
  reportsList,
};

/**
 * Returns true if mock mode is active.
 * Defaults to true in development so the UI works out-of-the-box even when
 * the backend or Azure database is not currently running.
 */
export const isMockEnabled = () => {
  if (import.meta.env.VITE_USE_MOCKS === 'false') {
    return false;
  }
  return true;
};
