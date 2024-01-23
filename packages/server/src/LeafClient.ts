import { io, Socket } from 'socket.io-client';

import { IOEvent } from '@lightshowd/core/IOEvent';
import { ControlCenter } from '@lightshowd/core/ControlCenter';

export class LeafClient {
  public socketClient: Socket;
  public controlCenter: ControlCenter;
  public trackLoaded = false;

  constructor({
    controlCenter,
    serverAddress,
  }: {
    controlCenter: ControlCenter;
    serverAddress: string;
  }) {
    this.socketClient = io(serverAddress, { auth: { id: 'leaf' } });
    this.controlCenter = controlCenter;
    this.bindEvents();
  }

  bindEvents() {
    const client = this.socketClient;
    const controlCenter = this.controlCenter;

    controlCenter.on(IOEvent.TrackEnd, () => {
      this.trackLoaded = false;
    });

    client.on(IOEvent.TrackLoad, (trackName: string) => {
      if (this.trackLoaded) {
        return;
      }
      const track = this.controlCenter.playlist.getTrack(trackName);
      if (!track) {
        controlCenter.logger.error({ msg: 'Track not found', trackName });
        return;
      }
      this.trackLoaded = true;
      controlCenter.logger.info({ msg: 'Track loaded', track });
      controlCenter.loadTrack({ track, formats: ['midi'] });
    });

    client.on(IOEvent.TrackStart, () => {
      controlCenter.logger.info({ msg: 'Track playing' });
      controlCenter.playTrack();
    });

    client.on(IOEvent.MidiSync, (tick: number) => {
      controlCenter.seekMidiByTick(tick);
    });

    client.on(IOEvent.TrackEnd, () => {
      controlCenter.stopTrack();
    });
  }
}
