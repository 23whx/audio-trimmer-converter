import { useState } from 'react';
import AudioUploader from './AudioUploader';

interface UploadWidgetProps {
  locale: string;
  translations: any;
  onFileReady: (file: File) => void;
}

export default function UploadWidget({ locale, translations, onFileReady }: UploadWidgetProps) {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isExtracted, setIsExtracted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileReady = (file: File, extracted = false) => {
    setCurrentFile(file);
    setIsExtracted(extracted);
    setError(null);
    setIsProcessing(false);
  };

  const handleError = (message: string) => {
    setError(message);
    setCurrentFile(null);
    setIsProcessing(false);
  };

  const handleStartEditing = () => {
    if (currentFile) {
      // 使用全局函数通知页面
      if (typeof window !== 'undefined' && window.handleFileReady) {
        window.handleFileReady(currentFile);
      } else {
        onFileReady(currentFile);
      }
    }
  };

  const handleChooseDifferent = () => {
    setCurrentFile(null);
    setIsExtracted(false);
    setError(null);
    setIsProcessing(false);
  };

  if (error) {
    return (
      <section className="rounded-xl border-2 border-dashed border-neutral-dark/20 bg-primary p-8 text-center">
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          <div className="text-2xl">❌</div>
          <h2 className="text-2xl font-semibold text-error-dark">
            {translations.uploadError || 'Upload Error'}
          </h2>
          <p className="text-sm text-neutral-dark/80">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-accent-dark px-6 py-3 text-sm font-semibold text-primary shadow hover:bg-accent transition-colors"
          >
            {translations.tryAgain || 'Try Again'}
          </button>
        </div>
      </section>
    );
  }

  if (isProcessing) {
    return (
      <section className="rounded-xl border-2 border-dashed border-neutral-dark/20 bg-primary p-8 text-center">
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          <div className="text-2xl animate-spin">⚙️</div>
          <h2 className="text-2xl font-semibold text-accent-dark">
            {translations.processing || 'Processing...'}
          </h2>
          <p className="text-sm text-neutral-dark/80">
            {translations.loadingEditor || 'Initializing audio extraction...'}
          </p>
        </div>
      </section>
    );
  }

  if (currentFile) {
    const extractedText = isExtracted
      ? '<br><span class="text-success-dark font-medium">✓ Audio extracted from video</span>'
      : '';

    return (
      <section className="rounded-xl border-2 border-dashed border-neutral-dark/20 bg-primary p-8 text-center">
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          <div className="text-2xl">✅</div>
          <h2 className="text-2xl font-semibold text-success-dark">
            {translations.fileReady || 'File Ready'}
          </h2>
          <div className="text-sm text-neutral-dark/80">
            <div><strong>{currentFile.name}</strong></div>
            <div>Type: {currentFile.type}</div>
            <div>Size: {(currentFile.size / 1024 / 1024).toFixed(2)} MB</div>
            {isExtracted && (
              <div className="text-success-dark font-medium mt-2">
                ✓ Audio extracted from video
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleChooseDifferent}
              className="flex-1 rounded-full bg-neutral-dark/20 px-4 py-2 text-sm font-semibold text-neutral-dark hover:bg-neutral-dark/30 transition-colors"
            >
              {translations.chooseDifferent || 'Choose Different'}
            </button>
            <button
              type="button"
              onClick={handleStartEditing}
              className="flex-1 rounded-full bg-accent-dark px-4 py-2 text-sm font-semibold text-primary shadow hover:bg-accent transition-colors"
            >
              {translations.startEditing || 'Start Editing'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <AudioUploader
      onFileReady={handleFileReady}
      onError={handleError}
      locale={locale}
      translations={translations}
    />
  );
}