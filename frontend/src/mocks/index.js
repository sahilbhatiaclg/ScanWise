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
 * Defaults to false so deployed builds (Vercel) and local dev always call the real backend
 * unless VITE_USE_MOCKS is explicitly set to 'true'.
 */
export const isMockEnabled = () => {
  return import.meta.env.VITE_USE_MOCKS === 'true';
};
