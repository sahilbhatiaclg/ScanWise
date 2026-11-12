import React, { useRef } from 'react';
import { Camera } from 'lucide-react';
import { Button } from '../common/Button';

export function CameraCapture({ onCapture, isLoading = false, className = '' }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onCapture) {
      onCapture(file);
    }
    // reset input so the same file can be re-selected if retrying
    e.target.value = '';
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="primary"
        size="lg"
        icon={Camera}
        fullWidth
        isLoading={isLoading}
        onClick={triggerCamera}
        className="shadow-md"
      >
        Take Photo of Label
      </Button>
    </div>
  );
}

