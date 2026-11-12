import { apiClient } from './client';
import { isMockEnabled, mockDb } from '../mocks';

export async function getReports(page = 1, pageSize = 10) {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 250));
    return mockDb.reportsList;
  }
  return apiClient(`/reports?page=${page}&page_size=${pageSize}`, { method: 'GET' });
}

export async function getReportById(reportId) {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 300));
    return mockDb.report;
  }
  return apiClient(`/reports/${reportId}`, { method: 'GET' });
}

export async function deleteReport(reportId) {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 300));
    return { status: 'deleted', report_id: reportId };
  }
  return apiClient(`/reports/${reportId}`, { method: 'DELETE' });
}

