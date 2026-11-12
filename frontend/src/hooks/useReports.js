import { useState, useEffect, useCallback } from 'react';
import { getReports, getReportById, deleteReport as apiDeleteReport } from '../api/reports';
import { useAuth } from './useAuth';

export function useReports(initialPage = 1, pageSize = 10) {
  const { isRegisteredUser } = useAuth();
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    if (!isRegisteredUser) {
      setReports([]);
      setTotal(0);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getReports(page, pageSize);
      setReports(data.items || []);
      setTotal(data.total || (data.items ? data.items.length : 0));
    } catch (err) {
      setError(err.message || 'Failed to load report history');
    } finally {
      setIsLoading(false);
    }
  }, [isRegisteredUser, page, pageSize]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const deleteReport = async (reportId) => {
    try {
      await apiDeleteReport(reportId);
      setReports((prev) => prev.filter((r) => r.report_id !== reportId));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.message || 'Failed to delete report');
      throw err;
    }
  };

  const loadSingleReport = async (reportId) => {
    setIsLoading(true);
    setError(null);
    try {
      return await getReportById(reportId);
    } catch (err) {
      setError(err.message || 'Failed to load report details');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    reports,
    total,
    page,
    setPage,
    isLoading,
    error,
    deleteReport,
    loadSingleReport,
    refetch: fetchReports,
  };
}

