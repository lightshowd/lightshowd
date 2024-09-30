const {
  LAST_PLAY_RANGE = '0',
  FREQUENCY,
  BAND = 'FM',
  MESSAGE_THANK_YOU,
  MESSAGE_WELCOME = '',
  SOX_PATH,
} = process.env;
import * as fs from 'fs';
import { execFileSync } from 'child_process';
import { resolve, basename } from 'path';
import type { Logger } from './Logger';

const lastPlayRangeMS = parseInt(LAST_PLAY_RANGE) * 1000;

export interface Track {
  name: string;
  artist: string;
  file: string;
  disabled?: boolean;
  noteMappings?: {
    [deviceName: string]: {
      notes: string;
      dimmableNotes: string;
      noteNumbers?: string;
      dimmableNoteNumbers?: string;
    };
  };
  velocityOverride?: number;
  audio?: string;
  midi?: string;
  midiEncoded?: string;
  background?: boolean;
  pad?: number;
}

type TrackLog = {
  [file: string]: Track & { plays: number; lastPlayTime?: number };
};

export class Playlist {
  public tracks: Track[] = [];
  public logger: Logger;
  public currentTrack: Track | null = null;
  public path: string;
  public trackLog: TrackLog;
  /**
   * A formatted message reflecting the last playlist action (e.g. "track is playing", "track cannot be played")
   */
  public currentMessage: string = '';

  constructor({ path, logger }: { path: string; logger: Logger }) {
    this.path = path;
    this.trackLog = {};
    this.logger = logger.getGroupLogger('Playlist');
  }

  loadPlaylist(
    file: string = 'playlist.json',
    options: { showDisabled?: boolean; format?: 'wav' | 'mp3' } = {}
  ) {
    const playlistPath = resolve(this.path, file);

    if (!fs.existsSync(playlistPath)) {
      throw new Error(`Playlist file not found: ${playlistPath}`);
    }

    const baseFolder = basename(this.path);

    let tracks = require(playlistPath) as Track[];
    tracks = tracks
      .filter((t) => options?.showDisabled || !t.disabled)
      .map((t) => {
        const midiPath = this.getFilePath(t, 'midi');
        const audioPath = this.getFilePath(t, 'audio', options.format);
        if (midiPath) {
          t.midi = midiPath.split(`${baseFolder}/`)[1];
        }
        if (audioPath) {
          t.audio = audioPath.split(`${baseFolder}/`)[1];
        }
        return t;
      });

    if (!options.format) {
      this.tracks = tracks;
    }

    this.logger.info({ msg: 'Playlist loaded', payload: tracks });
    return tracks;
  }

  getTrack(trackName: string) {
    return this.tracks.find(
      (t) => t.name.toLowerCase() === trackName.trim().toLowerCase()
    );
  }

  findTrack(query: string) {
    const formattedQuery = query.trim();
    if (/^[0-9]+$/.test(formattedQuery)) {
      const trackNumber = parseInt(formattedQuery);
      if (trackNumber > this.tracks.length) {
        return; // no match
      }
      return this.tracks[trackNumber - 1];
    }

    return this.tracks.find((s) =>
      s.name.toLowerCase().includes(formattedQuery.toLowerCase())
    );
  }
  getPlaylistTextMessage() {
    const messageParts = [
      MESSAGE_WELCOME,
      `Text the song number to play and tune to ${FREQUENCY} ${BAND}.`,
      `\n`,
    ];
    messageParts.push(
      ...this.tracks
        .filter((t) => !t.disabled)
        .map((t, index) => {
          return `${index + 1}. ${t.name} - ${t.artist}`;
        })
    );

    return messageParts.join('\n');
  }

  canPlayTrack(track: Track) {
    if (this.currentTrack) {
      this.currentMessage = `${this.currentTrack.name} is currently playing on ${FREQUENCY} ${BAND}`;
      return false;
    }

    const timeStamp = new Date().valueOf();
    const trackLogRecord = this.trackLog[track.file];
    if (
      !trackLogRecord?.lastPlayTime ||
      timeStamp - trackLogRecord.lastPlayTime > lastPlayRangeMS
    ) {
      return true;
    }

    this.currentMessage = 'This track was recently played. Pick another?';
    return false;
  }

  setCurrentTrack(track: Track) {
    this.currentTrack = track;
    let trackLogRecord = this.trackLog[track.file];
    if (!trackLogRecord) {
      trackLogRecord = { ...track, plays: 0 };
      this.trackLog[track.file] = trackLogRecord;
    }

    this.currentMessage = `${MESSAGE_THANK_YOU}`;
  }

  clearCurrentTrack(logPlay?: boolean) {
    if (!this.currentTrack) {
      return;
    }
    this.trackLog[this.currentTrack.file].lastPlayTime = new Date().valueOf();
    this.trackLog[this.currentTrack.file].plays += 1;

    this.currentTrack = null;
  }

  getFilePath(
    track: Track,
    type: 'audio' | 'midi',
    preferredFormat?: 'wav' | 'mp3'
  ) {
    const basePath = resolve(this.path, track.file);

    let filePath;
    if (type === 'audio') {
      if (preferredFormat) {
        filePath = `${basePath}.${preferredFormat}`;
        if (fs.existsSync(filePath)) {
          return filePath;
        }
      }

      filePath = `${basePath}.wav`;
      if (fs.existsSync(filePath)) {
        return filePath;
      }

      // Convert mp3 to wav (and pad) by default
      filePath = `${basePath}.mp3`;
      if (fs.existsSync(`${basePath}.orig.mp3`) || fs.existsSync(filePath)) {
        if (!fs.existsSync(`${basePath}.orig.mp3`)) {
          fs.copyFileSync(filePath, `${basePath}.orig.mp3`);
        }
        this.logger.info({ msg: 'Converting MP3 to WAV...', payload: track });
        const args = [`${basePath}.orig.mp3`, `${basePath}.wav`];
        if (track.pad) {
          this.logger.info({ msg: 'Adding padding...', payload: track });
          args.push(...['pad', track.pad.toString()]);
        }
        execFileSync(SOX_PATH!.replace('/play', '/sox'), args);

        // Convert wav back to mp3
        const mp3Args = [`${basePath}.wav`, `${basePath}.mp3`];
        execFileSync(SOX_PATH!.replace('/play', '/lame'), mp3Args);
        this.logger.info({ msg: 'Conversion complete', payload: track });
        return `${basePath}.wav`;
      }

      return;
    }

    if (type === 'midi') {
      filePath = `${basePath}.mid`;
      if (fs.existsSync(filePath)) {
        return filePath;
      }
      return;
    }
  }

  getCurrentMessage() {
    return this.currentMessage;
  }
}
