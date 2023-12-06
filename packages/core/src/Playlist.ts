const {
  LAST_PLAY_RANGE = '0',
  FREQUENCY,
  BAND = 'FM',
  MESSAGE_THANK_YOU,
  MESSAGE_WELCOME = '',
} = process.env;
import * as fs from 'fs';
import { resolve, basename } from 'path';

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
}

type TrackLog = {
  [file: string]: Track & { plays: number; lastPlayTime?: number };
};

export class Playlist {
  public tracks: Track[] = [];
  public currentTrack: Track | null = null;
  public path: string;
  public trackLog: TrackLog;
  /**
   * A formatted message reflecting the last playlist action (e.g. "track is playing", "track cannot be played")
   */
  public currentMessage: string = '';

  constructor({ path }: { path: string }) {
    this.path = path;
    this.trackLog = {};
  }

  loadPlaylist(file: string = 'playlist.json', showDisabled = false) {
    const playlistPath = resolve(this.path, file);

    if (!fs.existsSync(playlistPath)) {
      throw new Error(`Playlist file not found: ${playlistPath}`);
    }

    const baseFolder = basename(this.path);

    this.tracks = require(playlistPath) as Track[];
    this.tracks = this.tracks
      .filter((t) => showDisabled || !t.disabled)
      .map((t) => {
        const midiPath = this.getFilePath(t, 'midi');
        const audioPath = this.getFilePath(t, 'audio');
        if (midiPath) {
          t.midi = midiPath.split(`${baseFolder}/`)[1];
        }
        if (audioPath) {
          t.audio = audioPath.split(`${baseFolder}/`)[1];
        }
        return t;
      });
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

  getFilePath(track: Track, type: 'audio' | 'midi') {
    const basePath = resolve(this.path, track.file);

    let filePath;
    if (type === 'audio') {
      filePath = `${basePath}.mp3`;
      if (fs.existsSync(filePath)) {
        return filePath;
      }

      filePath = `${basePath}.wav`;
      if (fs.existsSync(filePath)) {
        return filePath;
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
