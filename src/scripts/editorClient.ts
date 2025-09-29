const STATUS_ICONS = {
  info: "??",
  error: "?",
  success: "?",
} as const;

const PROCESSING_POLL_INTERVAL = 100;
const MAX_FILE_SIZE = 30 * 1024 * 1024;

type FFmpegModule = typeof import('../lib/ffmpegClient');
type FFmpegInstance = Awaited<ReturnType<FFmpegModule['getFFmpeg']>>;
type WindowWithAudio = Window & { currentAudioFile?: File };

let isProcessing = false;
let ffmpegInstance: FFmpegInstance | null = null;
let ffmpegLoading = false;

async function loadFFmpeg(): Promise<FFmpegInstance | null> {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoading) {
    while (ffmpegLoading) {
      await new Promise((resolve) => setTimeout(resolve, PROCESSING_POLL_INTERVAL));
    }
    return ffmpegInstance;
  }

  ffmpegLoading = true;
  try {
    const { getFFmpeg } = await import('../lib/ffmpegClient');
    ffmpegInstance = await getFFmpeg();
    return ffmpegInstance;
  } catch (error) {
    console.error('[Editor] failed to load FFmpeg module', error);
    return null;
  } finally {
    ffmpegLoading = false;
  }
}

function showStatus(message: string, type: keyof typeof STATUS_ICONS = 'info') {
  const uploadArea = document.getElementById('uploadArea');
  if (!uploadArea) return;

  const icon = STATUS_ICONS[type];
  const colorClass =
    type === 'error'
      ? 'text-error-dark'
      : type === 'success'
        ? 'text-success-dark'
        : 'text-accent-dark';
  const spinnerClass = type === 'info' ? 'animate-spin' : '';

  uploadArea.innerHTML = `
    <div class="mx-auto flex max-w-lg flex-col gap-4">
      <div class="text-2xl ${spinnerClass}">${icon}</div>
      <h2 class="text-2xl font-semibold ${colorClass}">${message}</h2>
      ${
        type === 'error'
          ? '<button onclick="location.reload()" class="rounded-full bg-accent-dark px-6 py-3 text-sm font-semibold text-primary">重试</button>'
          : ''
      }
    </div>
  `;
}

async function handleFile(file: File | undefined | null) {
  if (!file || isProcessing) return;

  isProcessing = true;

  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');

  if (!isVideo && !isAudio) {
    showStatus('请选择音频或视频文件', 'error');
    isProcessing = false;
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showStatus(`文件过大 (${(file.size / 1024 / 1024).toFixed(1)}MB)，请选择小于30MB的文件`, 'error');
    isProcessing = false;
    return;
  }

  try {
    let finalFile = file;

    if (isVideo) {
      showStatus('正在从视频中提取音频...', 'info');

      const ffmpeg = await loadFFmpeg();
      if (!ffmpeg) {
        throw new Error('FFmpeg 未能加载');
      }

      const { fetchFile } = await import('@ffmpeg/util');

      const inputName = `input.${file.name.split('.').pop()}`;
      const outputName = 'output.mp3';

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      await ffmpeg.exec(['-i', inputName, '-q:a', '2', '-map', 'a', outputName]);

      const audioData = await ffmpeg.readFile(outputName);
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      finalFile = new File([audioBlob], file.name.replace(/\.[^/.]+$/, '.mp3'), { type: 'audio/mpeg' });

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    }

    showStatus(`文件准备完成: ${finalFile.name}`, 'success');
    (window as WindowWithAudio).currentAudioFile = finalFile;

    setTimeout(() => {
      alert(`音频文件已准备完成！\n文件名: ${finalFile.name}\n大小: ${(finalFile.size / 1024 / 1024).toFixed(2)}MB`);
    }, 1000);
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[Editor] 处理失败', error);
    showStatus(`处理失败: ${message}`, 'error');
  } finally {
    isProcessing = false;
  }
}

function registerInteractions() {
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
  const uploadArea = document.getElementById('uploadArea');

  uploadBtn?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) handleFile(file);
  });

  uploadArea?.addEventListener('dragover', (event) => {
    event.preventDefault();
    uploadArea.classList.add('border-success-dark', 'bg-success-light/20');
  });

  uploadArea?.addEventListener('dragleave', () => {
    uploadArea.classList.remove('border-success-dark', 'bg-success-light/20');
  });

  uploadArea?.addEventListener('drop', (event) => {
    event.preventDefault();
    uploadArea.classList.remove('border-success-dark', 'bg-success-light/20');
    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });
}

export function initEditorPage() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerInteractions, { once: true });
  } else {
    registerInteractions();
  }
}

export type { FFmpegInstance };
