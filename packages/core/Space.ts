import * as fs from 'fs';
import { resolve } from 'path';
import { Logger } from './Logger';
import { EffectType } from './EffectType';
import { orderBy } from 'lodash';

export interface Element {
  id: string;
  notes: string[];
  dimmableNotes?: string[];
  type: string;
  channel: number;
  x?: number | string;
  y?: number | string;
  rotation?: number;
  width?: number;
  height?: number;
  src?: string;
  /**
   * @deprecated
   * Use clientId instead
   */
  box?: string;
  clientId?: string;
  maxChannels?: number;
  limit?: number;
  offset?: number;
  isDimmable?: boolean;
  effect?: EffectType;
  node?: any;
}

export interface SpaceClient {
  id: string;
  type?: 'pi' | 'esp' | 'arduino';
  octave?: string | number;
  channels: number | { notes: string[]; channel: number }[];
  notes?: string[][];
  dimmableNotes?: string[][];
  elements?: Partial<Element>[];
}

export interface Space {
  id: string;
  baseNotes: string[];
  boxes: SpaceClient[];
  width?: number;
  height?: number;
  elements: Element[];
}

export class SpaceCache {
  public spaces: Space[] = [];
  public path: string;
  public logger: Logger;
  public clients: SpaceClient[] = [];

  constructor({ path, logger }: { path: string; logger: Logger }) {
    this.path = path;
    this.logger = logger.getGroupLogger('SpaceCache');
  }

  loadSpaces(file: string) {
    const spacePath = resolve(this.path, file);

    if (!fs.existsSync(spacePath)) {
      throw new Error(`Space file not found: ${spacePath}`);
    }

    this.spaces = require(spacePath) as Space[];
    this.clients = this.spaces.map((s) => s.boxes).flat();
    this.logger.info({ msg: 'Spaces loaded', payload: this.spaces });
  }

  getClient(id: string) {
    const client = this.clients.find((c) => c.id === id);
    if (!client) {
      return;
    }

    if (client.notes) {
      return client;
    }

    const channelNoteArrays: string[][] = [];

    const maxChannelNumber =
      typeof client.channels === 'number'
        ? client.channels
        : orderBy(client.channels, 'channel', 'desc')[0].channel;

    (client.channels as { notes: string[]; channel: number }[]).forEach((c) => {
      c.notes.forEach((n, index) => {
        if (!channelNoteArrays[index]) {
          channelNoteArrays[index] = new Array(maxChannelNumber).fill(
            undefined
          );
        }

        channelNoteArrays[index][c.channel - 1] = n;
      });
    });

    client.notes = channelNoteArrays;
    return client;
  }

  getSpaces() {
    return this.spaces;
  }
}
