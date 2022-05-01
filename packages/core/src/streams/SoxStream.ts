import { Writable } from 'stream';
import { ChildProcess, spawn } from 'child_process';

import type { PlayOptions } from './AudioStream';

const metaProps = [
  'encoding',
  'channels',
  'samplerate',
  'replaygain',
  'duration',
];

export class SoxStream extends Writable {
  soxProcess: ChildProcess | null;
  soxPath: string = '/usr/local/bin/sox';
  playOptions?: PlayOptions;
  currentTime: number = 0;
  duration: number = 0;

  meta: Record<string, string> = {};

  constructor({ path, options }: { path?: string; options?: PlayOptions }) {
    super();
    this.soxProcess = null;
    if (path) {
      this.soxPath = path;
    }

    if (options) {
      this.playOptions = options;
    }
  }

  _construct(callback: Function) {
    const trimArgs = [];
    if (this.playOptions?.start || this.playOptions?.end) {
      trimArgs.push('trim');
      this.currentTime = this.playOptions.start || 0;
      trimArgs.push(this.currentTime.toString());
      if (this.playOptions?.end) {
        trimArgs.push(this.playOptions.end.toString());
      }
    }

    const soxArgs = ['-', '-d'].concat(trimArgs);

    this.soxProcess = spawn(this.soxPath, soxArgs);

    this.soxProcess.stderr?.on('data', (data) => {
      this.onSoxStdOut(data);
    });

    this.soxProcess.stdout?.on(
      'error',
      (err: NodeJS.ErrnoException | null | undefined) => {
        if (err?.code === 'EPIPE') {
          return;
        }
      }
    );

    callback();
  }

  _write(
    chunk: Buffer | string | any,
    encoding: string,
    callback: (error?: Error | null | undefined) => void
  ) {
    if (chunk) {
      this.soxProcess?.stdin?.write(chunk, callback);
    }
  }

  _destroy(
    err: NodeJS.ErrnoException | null | undefined,
    callback: (error?: Error | null | undefined) => void
  ) {
    if (this.soxProcess) {
      this.soxProcess.kill();
    }

    if (err?.code === 'EPIPE') {
      callback();
      return;
    }

    callback(err);
  }

  onSoxStdOut(data: Buffer) {
    const msg = data.toString().trim();

    if (!msg.startsWith('In:')) {
      const metaParts = msg
        .replace(/\n/g, ': ')
        .split(': ')
        .map((p) => p.trim());

      metaParts.forEach((p, i) => {
        if (metaProps.includes(p.toLowerCase())) {
          this.meta[p.toLowerCase()] = metaParts[i + 1];
        }
      });

      if (this.meta.duration) {
        this.duration = convertTimeStringtoSeconds(this.meta.duration);
      }
    }

    const [, currentTime] = msg.split(' ');
    this.currentTime = convertTimeStringtoSeconds(currentTime);
    // Log time stamp
    this.emit('time', { time: this.currentTime, duration: this.duration });
  }
}

function convertTimeStringtoSeconds(timeString: string) {
  return timeString
    .split(':')
    .reverse()
    .reduce(
      (val, chunk, index) => val + parseFloat(chunk) * (60 * index || 1),
      0
    );
}
