import { fetchFile } from '@ffmpeg/util';
import { getFfmpeg } from '../ffmpeg/ffmpegClient';
import type { AudioSegment } from './types';

export interface CompressionOptions {
  targetFormat?: 'flac' | 'alac' | 'wav';
  keepOriginal?: boolean;
}

export async function compressLossless(
  file: File,
  options: CompressionOptions = {},
): Promise<Uint8Array> {
  const ffmpeg = await getFfmpeg();
  const inputExt = file.name.split('.').pop()?.toLowerCase() ?? 'wav';
  const inputName = `source.${inputExt}`;
  const targetFormat = options.targetFormat ?? 'flac';
  const outputName = `compressed.${targetFormat}`;

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const args = ['-hide_banner', '-i', inputName];

  if (targetFormat === 'flac') {
    args.push('-c:a', 'flac');
  } else if (targetFormat === 'alac') {
    args.push('-c:a', 'alac');
  } else {
    args.push('-c:a', 'pcm_s16le');
  }

  args.push(outputName);

  await ffmpeg.exec(args);

  const outputData = (await ffmpeg.readFile(outputName)) as Uint8Array;

  await ffmpeg.deleteFile(inputName).catch(() => undefined);
  await ffmpeg.deleteFile(outputName).catch(() => undefined);

  if (options.keepOriginal) {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
  }

  return outputData;
}

export async function compressSegmentsLossless(
  segments: AudioSegment[],
  targetFormat: CompressionOptions['targetFormat'] = 'flac',
): Promise<AudioSegment[]> {
  const ffmpeg = await getFfmpeg();
  const results: AudioSegment[] = [];

  for (const segment of segments) {
    const inputName = `${segment.id}.${segment.format}`;
    const outputName = `${segment.id}.${targetFormat ?? 'flac'}`;
    await ffmpeg.writeFile(inputName, segment.data);

    const args = ['-hide_banner', '-i', inputName];
    if (targetFormat === 'flac') {
      args.push('-c:a', 'flac');
    } else if (targetFormat === 'alac') {
      args.push('-c:a', 'alac');
    } else {
      args.push('-c:a', 'pcm_s16le');
    }
    args.push(outputName);

    await ffmpeg.exec(args);
    const data = (await ffmpeg.readFile(outputName)) as Uint8Array;

    results.push({
      ...segment,
      format: targetFormat ?? 'flac',
      data,
    });

    await ffmpeg.deleteFile(inputName).catch(() => undefined);
    await ffmpeg.deleteFile(outputName).catch(() => undefined);
  }

  return results;
}
