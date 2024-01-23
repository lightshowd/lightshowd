import { Writable } from 'stream';
import { SoxStream } from './SoxStream';

export interface PlayOptions {
  start?: number;
  end?: number;
  type: 'wav' | 'mp3';
}

interface AudioStreamOptions {
  type: 'sox' | 'speaker';
  soxPath?: string;
  options?: PlayOptions;
}

export function AudioStream(
  options: AudioStreamOptions
): Writable & { currentTime?: number } {
  const { type = 'sox', options: soxOptions } = options;
  if (type === 'sox') {
    return new SoxStream({
      path: options.soxPath || process.env.SOX_PATH,
      options: soxOptions,
    });
  }

  throw new Error('"type" is not set');
}
