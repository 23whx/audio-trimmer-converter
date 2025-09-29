import { useState } from 'react';

interface EditorCopy {
  upload: {
    heading: string;
    description: string;
    button: string;
  };
  timeline: {
    trim: string;
    split: string;
    normalize: string;
    detectSilence: string;
    generateSubtitles: string;
  };
  export: {
    heading: string;
    format: string;
    quality: string;
    download: string;
    subtitle: string;
  };
  status: Record<string, string>;
}

interface EditorShellProps {
  copy: EditorCopy;
}

export function EditorShellSimple({ copy }: EditorShellProps) {
  const [isDragging, setDragging] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <section
        className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragging
            ? 'border-success-dark bg-success-light/50'
            : 'border-neutral-dark/20 bg-primary'
        }`}
      >
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          <h2 className="text-2xl font-semibold text-success-dark">{copy.upload.heading}</h2>
          <p className="text-sm text-neutral-dark/80">{copy.upload.description}</p>
          <button
            type="button"
            className="rounded-full bg-success-dark px-6 py-3 text-sm font-semibold text-primary shadow"
          >
            {copy.upload.button}
          </button>
        </div>
      </section>
    </div>
  );
}

export default EditorShellSimple;