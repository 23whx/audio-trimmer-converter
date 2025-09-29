import { useMemo, useRef, useState } from 'react';
import AudioEditor from './AudioEditor';
import ErrorBoundary from './ErrorBoundary';
import { SubtitleExporter } from './SubtitleExporter';
import { useLocale } from '../../lib/i18n/useLocale';
import { useEditorStore } from '../../lib/stores/editorStore';
import type { SilenceSegment, SubtitleFile, TranscriptSegment } from '../../lib/audio/types';

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
  // copy参数现在是可选的，组件内部会根据当前语言自动生成
  copy?: EditorCopy;
}

function downloadFile(fileName: string, data: Blob | Uint8Array | string, mimeType: string): void {
  let blob: Blob;
  if (data instanceof Blob) {
    blob = data;
  } else if (typeof data === 'string') {
    blob = new Blob([data], { type: mimeType });
  } else {
    blob = new Blob([new Uint8Array(data)], { type: mimeType });
  }
  
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SubtitlesList({ subtitles, label }: { subtitles: SubtitleFile[]; label: string }) {
  if (!subtitles.length) return null;
  return (
    <div className="rounded-lg border border-success/30 bg-success-light/30 p-4">
      <h3 className="text-lg font-semibold text-success-dark">{label}</h3>
      <div className="mt-2 flex flex-wrap gap-3">
        {subtitles.map((subtitle) => (
          <button
            key={subtitle.format}
            type="button"
            className="rounded-full bg-success-dark px-4 py-2 text-sm font-medium text-primary shadow-sm transition hover:bg-success"
            onClick={() =>
              downloadFile(`subtitles.${subtitle.format}`, subtitle.content, 'text/plain')
            }
          >
            {subtitle.format.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function TranscriptView({ transcript, t }: { transcript: TranscriptSegment[], t: any }) {
  if (!transcript.length) return null;
  return (
    <section className="space-y-2 rounded-lg border border-neutral-dark/10 bg-primary/70 p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{t.transcript}</h3>
      <ol className="space-y-2 text-sm leading-relaxed text-neutral-dark/90">
        {transcript.map((segment) => (
          <li key={segment.id} className="flex gap-3">
            <span className="min-w-[90px] text-xs font-semibold text-accent-dark">
              {segment.start.toFixed(1)} - {segment.end.toFixed(1)}
            </span>
            <span>{segment.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SilenceView({ silences, t }: { silences: SilenceSegment[], t: any }) {
  if (!silences.length) return null;
  return (
    <section className="rounded-xl bg-primary p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-success-dark">{t.detectedPauses}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {silences.map((silence, index) => (
          <li
            key={`${silence.start}-${silence.end}`}
            className="flex justify-between rounded-lg bg-success-light/40 px-3 py-2"
          >
            <span className="font-medium text-success-dark">{t.pause} #{index + 1}</span>
            <span className="text-neutral-dark/80">
              {silence.start.toFixed(1)} - {silence.end.toFixed(1)}s ({silence.duration.toFixed(1)}
              s)
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EditorShell({ copy: propsCopy }: EditorShellProps) {
  if (typeof window === 'undefined') {
    // SSR 渲染阶段
    console.log('[EditorShell] SSR render start');
  } else {
    console.log('[EditorShell] CSR mount start');
  }
  
  // 使用useLocale Hook监听语言变化
  const { locale, t } = useLocale();
  
  // 根据当前语言生成copy对象，如果props没有提供的话
  const copy = propsCopy || {
    upload: {
      heading: t.uploadHeading,
      description: t.description,
      button: t.uploadButton,
    },
    timeline: {
      trim: "Trim selection",
      split: "Split automatically", 
      normalize: "Normalize",
      detectSilence: "Detect pauses",
      generateSubtitles: "Generate subtitles",
    },
    export: {
      heading: t.exportSettings,
      format: t.outputFormat,
      quality: "Quality", 
      download: "Download",
      subtitle: t.subtitleExport,
    },
    status: {
      loading: t.loadingEditor,
      splitting: "Splitting large file...", 
      compressing: "Applying lossless compression...",
      "detecting-silence": "Detecting pauses...",
      transcribing: t.generatingSubtitles,
      exporting: t.exporting.replace('{{progress}}', '100'),
      ready: t.fileReady,
      error: "Error",
      idle: "Ready",
    },
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setDragging] = useState(false);
  const status = useEditorStore((s) => s.status);
  const error = useEditorStore((s) => s.error);
  const setSourceFile = useEditorStore((s) => s.setSourceFile);
  const reset = useEditorStore((s) => s.reset);
  const sourceFile = useEditorStore((s) => s.sourceFile);
  const segments = useEditorStore((s) => s.segments);
  const transcript = useEditorStore((s) => s.transcript);
  const silences = useEditorStore((s) => s.silences);
  const subtitles = useEditorStore((s) => s.subtitles);
  const metadata = useEditorStore((s) => s.metadata);

  const statusLabel = useMemo(() => copy.status[status] ?? status, [copy.status, status]);

  console.log('[EditorShell] store snapshot', {
    status,
    error,
    hasSourceFile: Boolean(sourceFile),
    segments: segments.length,
    transcript: transcript.length,
    silences: silences.length,
    subtitles: subtitles.length,
    hasMetadata: Boolean(metadata),
  });

  // 如果已有源文件，切换到波形编辑器视图
  if (sourceFile) {
    // locale已经在上面通过useLocale hook获取了
    console.log('[EditorShell] switching to AudioEditor with file:', sourceFile.name, 'locale:', locale);
    return (
      <div className="min-h-screen bg-neutral-light p-4">
        <ErrorBoundary
          fallback={
            <div className="rounded-lg border border-accent-dark/20 bg-primary p-4 text-sm text-neutral-dark">
              <div className="font-semibold text-accent-dark mb-1">编辑器发生错误</div>
              <button
                type="button"
                className="mt-2 rounded-full bg-success-dark px-4 py-2 text-xs font-semibold text-primary"
                onClick={() => reset()}
              >
                返回上传
              </button>
            </div>
          }
        >
          <AudioEditor
            audioFile={sourceFile}
            onClose={() => {
              console.log('[EditorShell] AudioEditor onClose → reset store');
              reset();
            }}
            locale={locale}
          />
        </ErrorBoundary>
      </div>
    );
  }

  const handleFiles = async (files: FileList | null) => {
    const file = files?.item(0);
    if (!file) return;
    // 默认仅设置源文件，不做重处理；后续由用户点击的动作决定
    setSourceFile(file);
  };

  return (
    <div className="flex flex-col gap-6">
      <section
        className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragging
            ? 'border-success-dark bg-success-light/50'
            : 'border-neutral-dark/20 bg-primary'
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          <h2 className="text-2xl font-semibold text-success-dark">{copy.upload.heading}</h2>
          <p className="text-sm text-neutral-dark/80">{copy.upload.description}</p>
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              className="rounded-full bg-success-dark px-6 py-3 text-sm font-semibold text-primary shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onClick={() => fileInputRef.current?.click()}
            >
              {copy.upload.button}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              hidden
              onChange={(event) => handleFiles(event.target.files)}
            />
            <p className="text-xs text-neutral-dark/60">{statusLabel}</p>
            {error && (
              <p className="text-xs text-accent-dark">
                {copy.status.error}: {error}
              </p>
            )}
          </div>
        </div>
      </section>

      {metadata && (
        <section className="grid gap-4 rounded-xl bg-neutral-light/70 p-4 text-sm text-neutral-dark shadow-sm sm:grid-cols-3">
          <div>
            <p className="font-semibold text-success-dark">{t.duration}</p>
            <p>{metadata.duration.toFixed(2)} s</p>
          </div>
          <div>
            <p className="font-semibold text-success-dark">{t.sampleRate}</p>
            <p>{metadata.sampleRate.toLocaleString()} Hz</p>
          </div>
          <div>
            <p className="font-semibold text-success-dark">{t.channels}</p>
            <p>{metadata.channels}</p>
          </div>
        </section>
      )}

      {segments.length > 0 && (
        <section className="space-y-4 rounded-xl bg-primary p-4 shadow-sm">
          <header className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-success-dark">{t.segments}</h3>
            <span className="text-xs text-neutral-dark/60">{segments.length} parts</span>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            {segments.map((segment) => (
              <article
                key={segment.id}
                className="rounded-lg border border-neutral-dark/10 bg-neutral-light/60 p-4 text-sm"
              >
                <p className="font-semibold text-success-dark">{segment.fileName}</p>
                <p className="mt-1 text-xs text-neutral-dark/70">
                  {segment.start.toFixed(1)}s → {segment.end.toFixed(1)}s
                </p>
                <button
                  type="button"
                  className="mt-3 text-xs font-medium text-accent-dark underline"
                  onClick={() => downloadFile(segment.fileName, segment.data, 'audio/*')}
                >
                  Download
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <SilenceView silences={silences} t={t} />
      <TranscriptView transcript={transcript} t={t} />
      <SubtitlesList subtitles={subtitles} label={copy.export.subtitle} />
    </div>
  );
}

export default EditorShell;
