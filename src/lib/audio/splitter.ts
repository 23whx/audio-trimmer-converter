import { fetchFile } from '@ffmpeg/util';
import { getFfmpeg } from '../ffmpeg/ffmpegClient';
import { getAudioMetadata } from './metadata';
import type { AudioSegment } from './types';

export interface SplitOptions {
  maxSegmentDuration?: number;
  maxSegmentBytes?: number;
}

function getFileExtension(fileName: string): string {
  const index = fileName.lastIndexOf('.');
  return index > -1 ? fileName.slice(index + 1).toLowerCase() : 'mp3';
}

export async function splitIfNeeded(
  file: File,
  options: SplitOptions = {},
): Promise<{
  segments: AudioSegment[];
  metadata: { duration: number; sampleRate: number; channels: number };
}> {
  const maxBytes = options.maxSegmentBytes ?? 100 * 1024 * 1024; // 100MB chunks
  const inputExt = getFileExtension(file.name);
  const metadata = await getAudioMetadata(file);

  if (file.size <= maxBytes) {
    const data = new Uint8Array(await file.arrayBuffer());
    return {
      segments: [
        {
          id: crypto.randomUUID(),
          start: 0,
          end: metadata.duration,
          fileName: file.name,
          format: inputExt,
          data,
        },
      ],
      metadata,
    };
  }

  const ffmpeg = await getFfmpeg();
  const inputName = `input.${inputExt}`;
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const estimatedSegments = Math.ceil(file.size / maxBytes);
  const segmentDuration = Math.max(
    options.maxSegmentDuration ?? 300,
    Math.ceil(metadata.duration / estimatedSegments),
  );

  const outputPattern = `segment_%03d.${inputExt}`;
  await ffmpeg.exec([
    '-hide_banner',
    '-i',
    inputName,
    '-c',
    'copy',
    '-f',
    'segment',
    '-segment_time',
    `${segmentDuration}`,
    '-reset_timestamps',
    '1',
    outputPattern,
  ]);

  const segments: AudioSegment[] = [];
  const dirEntries = await ffmpeg
    .listDir('.')
    .then((entries) => entries.filter((entry) => entry.name.startsWith('segment_')))
    .catch(() => []);

  for (const entry of dirEntries) {
    const bytes = (await ffmpeg.readFile(entry.name)) as Uint8Array;
    const index = parseInt(entry.name.match(/segment_(\d+)\./)?.[1] ?? '0', 10);
    const start = index * segmentDuration;
    const end = Math.min(start + segmentDuration, metadata.duration);

    segments.push({
      id: crypto.randomUUID(),
      start,
      end,
      fileName: `${file.name.replace(/\.[^.]+$/, '')}_part_${index + 1}.${inputExt}`,
      format: inputExt,
      data: bytes,
    });

    await ffmpeg.deleteFile(entry.name);
  }

  await ffmpeg.deleteFile(inputName).catch(() => undefined);

  // Sort by start time to ensure playback order
  segments.sort((a, b) => a.start - b.start);

  return { segments, metadata };
}
