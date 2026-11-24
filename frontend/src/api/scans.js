import { apiClient } from './client';
import { isMockEnabled, mockDb } from '../mocks';

export async function uploadScanImage(file) {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 900));
    return mockDb.scanExtracted;
  }

  const formData = new FormData();
  formData.append('image', file);

  return apiClient('/scans', {
    method: 'POST',
    body: formData,
  });
}

export async function patchScanExtracted(scanId, corrections) {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      ...mockDb.scanExtracted,
      ...corrections,
    };
  }

  return apiClient(`/scans/${scanId}`, {
    method: 'PATCH',
    body: JSON.stringify(corrections),
  });
}

export async function analyzeScan(scanId, guestProfile = null, scanPayload = null) {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 1200));
    return mockDb.report;
  }

  const payload = { ...(scanPayload || {}) };
  if (guestProfile) {
    payload.guest_profile = guestProfile;
  }

  return apiClient(`/scans/${scanId}/analyze`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

