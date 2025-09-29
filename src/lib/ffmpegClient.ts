import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let ready = false;

export async function getFFmpeg() {
  console.log('[FFmpegClient] getFFmpeg called', { ready });
  if (ready && ffmpeg) {
    console.log('[FFmpegClient] returning cached instance');
    return ffmpeg;
  }

  console.log('[FFmpegClient] creating new FFmpeg instance');
  ffmpeg = new FFmpeg();
  const base = '/ffmpeg';
  console.log('[FFmpegClient] loading core assets', { base });

  const workerURL = await toBlobURL(`${base}/worker.js`, 'text/javascript');
  const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript');
  const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm');

  await ffmpeg.load({
    workerURL,
    coreURL,
    wasmURL,
  });

  ready = true;
  console.log('[FFmpegClient] FFmpeg ready');
  return ffmpeg;
}

export function resetFFmpeg() {
  if (ffmpeg) {
    console.log('[FFmpegClient] resetFFmpeg invoked, terminating instance');
    ffmpeg.terminate();
    ffmpeg = null;
    ready = false;
  } else {
    console.log('[FFmpegClient] resetFFmpeg invoked with no active instance');
  }
}

