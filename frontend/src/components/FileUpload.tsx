import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { stockAPI } from '../api/client';
import { UploadResponse } from '../types';

interface FileUploadProps {
  onUploadComplete: (result: UploadResponse) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];

      if (!file.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50 MB');
        return;
      }

      setUploading(true);
      setProgress(10);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 8, 85));
      }, 300);

      try {
        const res = await stockAPI.uploadCSV(file);
        clearInterval(progressInterval);
        setProgress(100);
        toast.success(`Uploaded ${res.data.records.toLocaleString()} records!`);
        onUploadComplete(res.data);
      } catch (err: any) {
        clearInterval(progressInterval);
        const msg = err.response?.data?.detail || 'Upload failed';
        toast.error(msg);
      } finally {
        setUploading(false);
        setTimeout(() => setProgress(0), 1500);
      }
    },
    [onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="upload-container">
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'drag-active' : ''} ${
          isDragReject ? 'drag-reject' : ''
        } ${uploading ? 'uploading' : ''}`}
        id="csv-dropzone"
      >
        <input {...getInputProps()} id="csv-file-input" />

        <div className="dropzone-icon">
          {isDragReject ? (
            <AlertCircle size={48} color="#ef4444" />
          ) : uploading ? (
            <div className="upload-spinner" />
          ) : isDragActive ? (
            <CheckCircle size={48} color="#10b981" />
          ) : (
            <Upload size={48} color="#6366f1" />
          )}
        </div>

        <h3 className="dropzone-title">
          {isDragReject
            ? 'Invalid file type'
            : isDragActive
            ? 'Drop it here!'
            : uploading
            ? 'Uploading to AWS S3...'
            : 'Upload Stock CSV'}
        </h3>

        <p className="dropzone-sub">
          {isDragReject
            ? 'Only CSV files are accepted'
            : uploading
            ? 'Please wait while your data is being processed'
            : 'Drag & drop your CSV file here, or click to browse'}
        </p>

        {!uploading && !isDragActive && (
          <div className="dropzone-hint">
            <FileText size={14} />
            <span>Supports: Date, Open, High, Low, Close, Volume columns</span>
          </div>
        )}

        {uploading && progress > 0 && (
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
            <span className="progress-label">{progress}%</span>
          </div>
        )}
      </div>

      <div className="csv-format-hint">
        <h4>📋 Expected CSV Format</h4>
        <code>Date,Open,High,Low,Close,Volume</code>
        <code>2020-01-02,296.24,300.60,295.19,300.35,33870100</code>
        <p>Minimum 100 rows required. Date column must be in YYYY-MM-DD format.</p>
      </div>
    </div>
  );
};

export default FileUpload;
