import { useState } from 'react';
import { compressImage } from '../lib/imageCompress';
import { uploadScanImage, patchScanExtracted, analyzeScan } from '../api/scans';
import { useAuth } from './useAuth';

export function useScan() {
  const { isGuest, guestProfile } = useAuth();
  const [stage, setStage] = useState('idle'); // idle | compressing | reading_label | checking_ingredients | building_report | complete | error
  const [stageMessage, setStageMessage] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const reset = () => {
    setStage('idle');
    setStageMessage('');
    setExtractedData(null);
    setReport(null);
    setError(null);
  };

  const processImageFile = async (rawFile) => {
    try {
      setError(null);
      setStage('compressing');
      setStageMessage('Optimizing image for back-label OCR...');

      const { file } = await compressImage(rawFile);

      setStage('reading_label');
      setStageMessage('Reading back label ingredients and nutrition text...');

      const extracted = await uploadScanImage(file);
      setExtractedData(extracted);
      setStage('idle'); // ready for review
      return extracted;
    } catch (err) {
      setStage('error');
      setError(err.message || 'Image processing failed. Please ensure label is well lit and readable.');
      throw err;
    }
  };

  const saveCorrections = async (scanId, corrections) => {
    try {
      setError(null);
      const updated = await patchScanExtracted(scanId, corrections);
      setExtractedData(updated);
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to update ingredient list');
      throw err;
    }
  };

  const runAnalysis = async (scanId, guestOverride = null) => {
    try {
      setError(null);
      setStage('checking_ingredients');
      setStageMessage('Cross-referencing database & flagging health contraindications...');

      // Small staged delay for UX calibration
      await new Promise((r) => setTimeout(r, 600));

      setStage('building_report');
      setStageMessage('Synthesizing consumption guidance and visual verdict...');

      const activeGuestProfile = isGuest ? (guestOverride || guestProfile) : null;
      const reportResult = await analyzeScan(scanId, activeGuestProfile);

      setReport(reportResult);
      setStage('complete');
      return reportResult;
    } catch (err) {
      setStage('error');
      setError(err.message || 'Analysis failed. Please verify ingredients.');
      throw err;
    }
  };

  return {
    stage,
    stageMessage,
    extractedData,
    report,
    error,
    reset,
    processImageFile,
    saveCorrections,
    runAnalysis,
  };
}

