export async function getAudioMetadata(
  file: File,
): Promise<{ duration: number; sampleRate: number; channels: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
    };
  } finally {
    audioContext.close().catch(() => undefined);
  }
}
