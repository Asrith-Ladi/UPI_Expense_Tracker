import { Upload, CheckCircle2 } from 'lucide-react';

type UploadSectionProps = {
  loading: boolean;
  uploadComplete: boolean;
  onTriggerFileDialog: () => void;
};

export default function UploadSection({ loading, uploadComplete, onTriggerFileDialog }: UploadSectionProps) {
  return (
    <div className="upload-section glass-panel">
      <div className="upload-section-inner">
        <div className="upload-section-icon">
          {uploadComplete ? <CheckCircle2 size={22} strokeWidth={2.25} /> : <Upload size={22} strokeWidth={2.25} />}
        </div>
        <div className="upload-section-copy">
          <span className="upload-section-label">Step 1 · Statements</span>
          <span className="upload-section-title">{uploadComplete ? 'File loaded' : 'Upload document'}</span>
          <span className="upload-section-hint">
            {uploadComplete
              ? 'You can add more files anytime.'
              : 'Paytm, PhonePe (PDF), or GPay — required before tagging & dashboard.'}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary upload-section-btn"
          onClick={onTriggerFileDialog}
          disabled={loading}
        >
          {loading ? 'Processing…' : uploadComplete ? 'Add files' : 'Choose files'}
        </button>
      </div>
    </div>
  );
}
