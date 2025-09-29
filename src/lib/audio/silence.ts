import type { SilenceSegment } from './types';

export interface SilenceDetectionOptions {
  thresholdDb?: number;
  minSilenceDuration?: number;
  analysisWindow?: number;
}

/**
 * Detect silence segments using RMS energy with configurable decibel threshold.
 */
export async function detectSilences(
  file: File,
  options: SilenceDetectionOptions = {},
): Promise<SilenceSegment[]> {
  const thresholdDb = options.thresholdDb ?? -45;
  const minSilence = options.minSilenceDuration ?? 0.6; // seconds
  const windowSizeSeconds = options.analysisWindow ?? 0.02;

  const audioContext = new AudioContext();
  try {
    const buffer = await audioContext.decodeAudioData(await file.arrayBuffer());
    const sampleRate = buffer.sampleRate;
    const windowSize = Math.max(1, Math.floor(sampleRate * windowSizeSeconds));
    const channelData = buffer.getChannelData(0);
    const totalSamples = channelData.length;

    const silences: SilenceSegment[] = [];
    let currentSilenceStart: number | null = null;

    for (let i = 0; i < totalSamples; i += windowSize) {
      const windowEnd = Math.min(i + windowSize, totalSamples);
      let sumSquares = 0;
      for (let j = i; j < windowEnd; j += 1) {
        const sample = channelData[j];
        sumSquares += sample * sample;
      }
      const rms = Math.sqrt(sumSquares / (windowEnd - i));
      const db = 20 * Math.log10(rms || Number.EPSILON);
      const time = i / sampleRate;

      if (db < thresholdDb) {
        if (currentSilenceStart === null) {
          currentSilenceStart = time;
        }
      } else if (currentSilenceStart !== null) {
        const end = time;
        if (end - currentSilenceStart >= minSilence) {
          silences.push({
            start: currentSilenceStart,
            end,
            duration: end - currentSilenceStart,
          });
        }
        currentSilenceStart = null;
      }
    }

    if (currentSilenceStart !== null) {
      const end = totalSamples / sampleRate;
      if (end - currentSilenceStart >= minSilence) {
        silences.push({
          start: currentSilenceStart,
          end,
          duration: end - currentSilenceStart,
        });
      }
    }

    return silences;
  } finally {
    await audioContext.close().catch(() => undefined);
  }
}
