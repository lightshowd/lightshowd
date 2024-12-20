import * as fs from 'fs';
import EventEmitter from 'events';

import { AudioStream, PlayOptions, PassStream } from './streams';
import { Midi, MidiPlayerEvent } from './Midi';
import { getNoteNumbersString, getNotesString, mergeNotes } from './Note';
import { SpaceCache } from './Space';
import type { Server as SocketIOServer, Socket } from 'socket.io';

import { Playlist, Track, CurrentTrack } from './Playlist';
import { IOEvent } from './IOEvent';
import { Logger } from './Logger';
import { setTimeout as awaitSetTimeout } from 'timers/promises';
import { merge } from 'lodash';

export class ControlCenter extends EventEmitter {
  public playlist: Playlist;
  public io: SocketIOServer;
  public spaceCache: SpaceCache;
  public logger: Logger;
  public disabledNotes: string[] = [];
  public dimmableNotes: string[] = [];
  public logGroup = 'ControlCenter';
  private currentTrack: CurrentTrack | null = null;

  private audioFile: string | null | undefined = null;
  private midiFile: string | null | undefined = null;
  private midiPlayer: Midi | null = null;
  private audioFileStream: fs.ReadStream | null = null;
  private audioStream: ReturnType<typeof AudioStream> | null = null;
  private passStream: PassStream | null = null;
  private activePlayer: string | null = null;
  private audioFileType: 'wav' | 'mp3' = 'wav';

  constructor({
    playlist,
    io,
    logger,
    spaceCache,
  }: {
    playlist: Playlist;
    io: SocketIOServer;
    logger: Logger;
    spaceCache: SpaceCache;
  }) {
    super();
    this.playlist = playlist;
    this.io = io;
    this.spaceCache = spaceCache;
    this.logger = logger.getGroupLogger(this.logGroup);
    this.io.on('connection', (socket: Socket) => {
      if (socket.handshake.auth?.id === 'player') {
        this.logger.info({ msg: 'Registering player' });
        this.bindPlayerSocketEvents(socket);
        return;
      }

      if (socket.handshake.auth?.id === 'listener') {
        this.logger.info({ msg: 'Registering listener' });
        this.bindListenerSocketEvents(socket);
        return;
      }

      if (socket.handshake.auth?.id === 'leaf') {
        this.logger.info({ msg: 'Registering leaf node' });
        this.bindLeafServerEvents(socket);
        return;
      }

      if (socket.handshake.auth?.id === 'passthrough') {
        this.logger.info({ msg: 'Registering pass through emitter' });
        this.bindPassThroughEvents(socket);
        return;
      }

      socket.once(IOEvent.ClientRegister, async (clientId) => {
        this.logger.info({ msg: 'Client registered', clientId });
        const spaceClient = this.spaceCache.getClient(clientId);
        await awaitSetTimeout(300);

        let notesString = '';
        let noteNumbersString = '';

        // Map overrides if track is playing
        if (this.currentTrack?.noteMappings?.[clientId]) {
          notesString = this.currentTrack.noteMappings[clientId].notes;
          noteNumbersString = getNoteNumbersString(notesString);
        } else if (spaceClient?.notes) {
          notesString = getNotesString(spaceClient.notes);
          noteNumbersString = getNoteNumbersString(spaceClient.notes);
        }

        if (notesString) {
          logger.debug({
            msg: 'mapping notes',
            notesString,
            noteNumbersString,
            isPlaying: this.currentTrack ? 1 : 0,
          });

          this.io.emit(
            IOEvent.MapNotes,
            clientId,
            notesString,
            `${noteNumbersString},`, // cheap trailing comma for Arduino C parsing
            this.currentTrack ? 1 : 0
          );
        }
      });
    });
  }

  async loadTrack({
    track,
    disabledNotes,
    formats = ['audio', 'midi'],
    loadEmitTimes = 3,
  }: {
    track: Track;
    disabledNotes?: string[];
    formats?: ('audio' | 'midi')[];
    loadEmitTimes?: number;
  }) {
    this.currentTrack = track;

    this.clearCaches();

    // Emit multiple load events
    for (let i = 0; i < loadEmitTimes; ++i) {
      this.io.emit(IOEvent.TrackLoad, track.name);
      await awaitSetTimeout(1000);
    }

    if (formats.includes('audio')) {
      this.audioFile = this.playlist.getFilePath(track, 'audio');
      if (this.audioFile?.endsWith('.mp3')) {
        this.audioFileType = 'mp3';
      }
      this.logger.debug('Audio file loaded.');
    }

    if (formats.includes('midi')) {
      this.midiFile = this.playlist.getFilePath(track, 'midi');
      this.logger.debug('Midi file loaded.');
    }

    if (this.midiFile) {
      const mappedClientIds: string[] = [];
      if (track.noteMappings) {
        Object.entries(track.noteMappings).forEach(([clientId, mappings]) => {
          const { notes, merge: mergeChannels } = mappings;
          mappedClientIds.push(clientId);

          let notesString = notes;
          let noteNumbersString = getNoteNumbersString(notes);

          if (mergeChannels === true) {
            const spaceClient = this.spaceCache.getClient(clientId);

            const clientNotesString = getNotesString(spaceClient?.notes ?? []);
            const clientNoteNumbersString = getNotesString(
              spaceClient?.notes ?? []
            );
            notesString = merge(
              clientNotesString.split(','),
              notes.split(',').map((n) => (!n ? undefined : n))
            ).join(',');
            noteNumbersString = merge(
              clientNoteNumbersString.split(','),
              noteNumbersString.split(',').map((n) => (!n ? undefined : n))
            ).join(',');
          }

          this.logger.info({
            msg: 'mapping track notes',
            clientId,
            notesString,
            noteNumbersString,
          });

          this.io.emit(
            IOEvent.MapNotes,
            clientId,
            notesString,
            `${noteNumbersString},`, // cheap trailing comma for Arduino C parsing
            undefined // dimmableNotes ? getNotesString(dimmableNotes) : undefined
          );
        });
      }

      this.spaceCache.clients
        .filter((c) => !mappedClientIds.includes(c.id))
        .forEach(({ id: clientId }) => {
          const spaceClient = this.spaceCache.getClient(clientId);

          if (spaceClient?.notes) {
            const notesString = getNotesString(spaceClient.notes);
            const noteNumbersString = getNoteNumbersString(spaceClient.notes);

            this.logger.info({
              msg: 'Remapping notes',
              clientId: clientId,
              noteNumbersString,
            });

            this.io.emit(
              IOEvent.MapNotes,
              clientId,
              notesString,
              `${noteNumbersString},`, // cheap trailing comma for Arduino C parsing
              !!this.currentTrack
            );
          }
        });

      this.midiPlayer = new Midi({
        io: this.io,
        disabledNotes: disabledNotes || this.disabledNotes,
        dimmableNotes: this.dimmableNotes,
        logger: this.logger,
        velocityOverride: track.velocityOverride,
      });

      this.midiPlayer.loadFile({ file: this.midiFile });
    }

    if (!this.audioFile && !this.midiFile) {
      throw new Error(`No files found for track ${track.name}`);
    }

    this.playlist.setCurrentTrack(track);

    this.logger.debug('Track loaded.');
  }

  playTrack(delay?: number) {
    if (!this.currentTrack) {
      throw new Error('No track loaded.');
    }

    const track = this.currentTrack;

    if (this.audioFile) {
      this.pipeAudio(track, { start: 0, type: this.audioFileType });
    }
    // If playing a midi file only
    else if (this.midiPlayer) {
      this.logger.debug('Playing midi only.');
      this.midiPlayer.midiPlayer.on(MidiPlayerEvent.EndOfFile, () => {
        this.emitTrackEnd(track);
      });

      if (!track.background) {
        this.io.emit(IOEvent.TrackStart, track.file);
      }
      this.midiPlayer.play({ loop: !!track.background });
      this.currentTrack.startTime = new Date().toISOString();
    }
  }

  stopTrack() {
    if (this.currentTrack) {
      this.emitTrackEnd(this.currentTrack);
    }
    this.logger.debug(`Stopping track started by ${this.activePlayer}`);
    if (this.audioFileStream) {
      this.audioFileStream.unpipe();
      this.audioFileStream.destroy();
    }
    this.activePlayer = null;
    this.midiPlayer?.stop();
  }

  private pipeAudio(track: Track, options?: PlayOptions) {
    if (this.audioFile) {
      this.logger.debug(`Creating read stream for ${this.audioFile}`);
      this.audioFileStream = fs.createReadStream(this.audioFile);
      this.audioStream = AudioStream({ type: 'sox', options });

      this.audioStream
        .on('close', () => {
          this.midiPlayer?.stop();
          this.logger.debug('Audio stream closed and MIDI play stopped.');
          this.emitTrackEnd(track);
        })
        .on('error', (err: Error) => {
          this.midiPlayer?.stop();
          this.logger.error({
            message: 'File stream error and MIDI play stopped.',
            err: err.message,
            stack: err.stack,
          });
          this.emitTrackEnd(track);
        });

      this.audioStream.once('time', (d) => {
        this.currentTrack!.startTime = new Date().toISOString();
        this.io.emit(
          IOEvent.TrackStart,
          track.file,
          this.currentTrack!.startTime
        );

        if (this.midiPlayer) {
          this.logger.debug('MIDI play started.');
          this.midiPlayer.play({ loop: false });

          // Send a follow up to leaf nodes to sync if they started late
          setTimeout(() => {
            this.io.emit(IOEvent.TrackSync, {
              tick: this.midiPlayer?.getCurrentTick(),
              startTime: this.currentTrack?.startTime,
              currentTime: new Date().toISOString(),
            });
          }, 3000);

          setTimeout(() => {
            this.io.emit(IOEvent.TrackSync, {
              tick: this.midiPlayer?.getCurrentTick(),
              startTime: this.currentTrack?.startTime,
              currentTime: new Date().toISOString(),
            });
          }, 6000);
        }
      });

      this.audioStream.on('time', (timeData) => {
        this.io.emit(IOEvent.TrackTimeChange, timeData);
      });

      this.audioFileStream.pipe(this.audioStream);
    }
  }

  pauseTrack() {
    if (this.audioFileStream) {
      this.audioFileStream.pause();
      this.audioFileStream.unpipe();
      this.passStream!.unpipe();
      this.audioStream?.destroy();
    }

    if (this.midiPlayer) {
      this.midiPlayer.midiPlayer.pause();
    }

    this.io.emit(IOEvent.TrackPause);
    this.logger.debug('Track paused.');
  }

  resumeTrack(time: number) {
    if (!this.currentTrack) {
      this.logger.error(`Cannot resume - no current track`);
      return;
    }

    this.seekTrack(time);
  }

  seekTrack(time: number) {
    this.logger.debug(`Seeking to ${time}`);
    if (!this.currentTrack) {
      return;
    }

    if (this.midiPlayer) {
      this.midiPlayer.seek(time);

      if (!this.audioFile) {
        this.midiPlayer.play();
        this.io.emit(IOEvent.TrackResume);
        return;
      }
    }

    if (this.audioFile) {
      this.pipeAudio(this.currentTrack!, {
        start: time + 0.3,
        type: this.audioFileType,
      });
      this.io.emit(IOEvent.TrackResume);
    }
  }

  seekMidiByTick(tick: number) {
    this.logger.debug(`Seeking to ${tick} tick`);
    if (!this.currentTrack) {
      return;
    }

    if (this.midiPlayer) {
      this.midiPlayer.seekByTick(tick);
      this.midiPlayer.play();
      this.io.emit(IOEvent.TrackResume);
    }
  }

  emitTrackEnd(track: Track) {
    if (!track.background) {
      this.io.emit(IOEvent.TrackEnd, track);
      // Reinforce track end in case it was dropped;
      setTimeout(() => {
        this.io.emit(IOEvent.TrackEnd, track);
        this.io.emit(IOEvent.TrackEnd, track);
      }, 1000);
    }
    this.emit(IOEvent.TrackEnd, track);
    this.playlist.clearCurrentTrack();
    this.currentTrack = null;
  }

  setDisabledNotes(disabledNotes: string[]) {
    this.disabledNotes = disabledNotes;
  }

  private clearCaches() {
    this.midiPlayer?.stop();
    this.midiPlayer = null;
    this.audioFileStream = null;
    this.audioStream = null;
    this.audioFile = null;
    this.midiFile = null;
    this.passStream = null;
    this.dimmableNotes = [];
  }

  private bindPlayerSocketEvents(socket: Socket) {
    if (!this.activePlayer) {
      this.logger.debug('Socket connection for player controls established.');
      socket.on(IOEvent.TrackSeek, (time: number) => {
        this.activePlayer = socket.handshake.address;
        this.seekTrack(time);
      });
      socket.on(IOEvent.TrackPause, () => this.pauseTrack());
      socket.on(IOEvent.TrackResume, (time: number) => this.resumeTrack(time));
      socket.on(IOEvent.TrackPlay, () => {
        this.activePlayer = socket.handshake.address;
        this.playTrack();
      });
      socket.on(IOEvent.TrackStop, () => this.stopTrack());

      socket.on('disconnect', () => {
        this.logger.debug('Player disconnected.');
        this.activePlayer = null;
      });

      this.bindListenerSocketEvents(socket);
    }
  }

  private bindListenerSocketEvents(socket: Socket) {
    socket.on(IOEvent.TrackStatus, () => {
      if (!this.currentTrack) {
        return;
      }
      socket.emit(IOEvent.TrackStatus, this.currentTrack);
      console.log('emitting track status', this.currentTrack);
    });
  }

  private bindPassThroughEvents(socket: Socket) {
    this.logger.debug(
      'Socket connection for passthrough controls established.'
    );
    socket.onAny((event, ...args) => {
      this.io.emit(event, ...args);
    });

    socket.on('disconnect', () => {
      this.logger.debug('Pass through disconnected.');
    });
  }

  private bindLeafServerEvents(socket: Socket) {}
}
