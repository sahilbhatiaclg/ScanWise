import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

export function UploadButton({ onUpload, isLoading = false, className = '' }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file) => {
    if (file && onUpload) {
      onUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-card p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-brand-500 bg-brand-50/50 dark:bg-emerald-950/20'
            : 'border-slate-300 dark:border-surface-dark-border hover:border-slate-400 dark:hover:border-slate-600 bg-surface-light-card dark:bg-surface-dark-card'
        } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
          <UploadCloud className="w-6 h-6 stroke-[1.8]" />
        </div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Upload or drop back-label photo
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Supports JPG, PNG, WebP up to 5 MB
        </p>
      </div>
    </div>
  );
}

