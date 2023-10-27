import SerialPort from 'serialport';
import { io, Socket } from 'socket.io-client';
import { IOEvent } from '@lightshowd/core';

import { log } from './logger';
const {
  SERVER_URL,
  LOG_MESSAGES,
  PORT_ADDRESS = '/dev/ttyUSB0',
  BAUD_RATE = '256000',
  CHANNELS = '1,2,4,8,16,32,64,128',
  CLIENT_ID,
} = process.env;

const port = new SerialPort(PORT_ADDRESS, { baudRate: parseInt(BAUD_RATE) });

const channels: number[] = [];

port.on('open', () => {
  startUp();
});

port.on('data', (data) => {
  console.log('Data:', data.toString('utf8'));
});

const minLevel = 85;
const maxLevel = 35;

const notesRegistry: string[][] = [];

/**
 * Track last note on. If it has length > 1 it is dimmable and we know not turn it off
 */
let lengthCache: { [note: string]: number } = {};

function startUp() {
  parseChannels();
  log(`Channels initialized:`, channels);

  setTimeout(() => {
    toggleAllChannels('on');
  }, 2000);

  let socket: Socket;
  if (!SERVER_URL) {
    throw new Error('SERVER_URL must be configured');
  } else {
    socket = io(SERVER_URL);
  }

  listenForNoteMessages(socket);
  registerClient(socket);
}

function registerClient(socket: Socket) {
  socket.emit(IOEvent.ClientRegister, CLIENT_ID);
}

function parseChannels() {
  CHANNELS.split(',')
    .map((c) => parseInt(c.trim()))
    .forEach((mc) => channels.push(mc));
}

function toggleAllChannels(mode: 'on' | 'off') {
  if (!channels.length) {
    throw new Error('No channels mapped. Please configure CHANNELS.');
  }

  const pinBits = getSum(channels);

  const endLevel = mode === 'on' ? maxLevel : minLevel;
  const startLevel = mode === 'on' ? minLevel : maxLevel;
  const payload = `${pinBits}${startLevel}${endLevel}00`;

  port.write(`${payload}\n`);
}

function listenForNoteMessages(socket: Socket) {
  socket
    .on(IOEvent.MapNotes, (clientId, notes, _, isPrimary) => {
      if (clientId !== CLIENT_ID) {
        return;
      }
      if (notes) {
        const mappedNotes = parseNotes(notes);
        if (notesRegistry.length > 1) {
          notesRegistry.pop();
        }

        if (isPrimary) {
          // clear all entries if primary registration
          notesRegistry.length = 0;
        }
        notesRegistry.push(mappedNotes);
        log({ notesRegistry });
      }
    })
    .on(IOEvent.TrackStart, () => toggleAllChannels('off'))
    .on(
      IOEvent.NoteOn,
      (note: string, _, length: number, sameNotes, velocity) => {
        const notes = [note];
        if (sameNotes?.length) {
          notes.push(...sameNotes);
        }

        // Get latest activeNotes from notes:map event
        const activeNotes = notesRegistry[notesRegistry.length - 1];

        if (!activeNotes) {
          log('No activeNotes mapped!');
          return;
        }

        const pins = notes
          .map((n) => channels[activeNotes.indexOf(n) % channels.length])
          .filter((p) => p);

        if (!pins.length || !velocity) {
          return;
        }

        const binaryPins = getSum(pins);
        if (isNaN(parseInt(binaryPins))) {
          log(notes, pins);
          return;
        }

        let startLevel = minLevel;
        let endLevel = maxLevel;

        const autoOff = velocity >= 80 ? 1 : 0;
        const dimUp = velocity % 20 > 10;

        if (!dimUp) {
          startLevel = maxLevel;
          endLevel = minLevel;
        }

        const payload = `${binaryPins}${startLevel}${endLevel}${autoOff}${
          length || 0
        }`;
        port.write(`${payload}\n`);

        // Track dimmable notes with length, we don't turn them off
        if (length > 1) {
          notes.forEach((n) => {
            lengthCache[n] = length;
          });
        }
      }
    )
    .on(IOEvent.NoteOff, (note: string) => {
      if (lengthCache[note]) {
        return;
      }

      const activeNotes = notesRegistry[notesRegistry.length - 1];
      const pin = channels[activeNotes.indexOf(note) % channels.length];

      if (!pin) {
        return;
      }

      const payload = `${getSum([pin])}${maxLevel}${minLevel}00`;
      port.write(`${payload}\n`);
    })
    .on(IOEvent.TrackEnd, () => {
      setTimeout(() => toggleAllChannels('on'), 100);
      if (notesRegistry.length > 1) {
        notesRegistry.pop();
      }
      // Clear dimmer length cache
      lengthCache = {};
    });

  if (LOG_MESSAGES === 'true') {
    socket.onAny((...args) => {
      log(args);
    });
  }
}

function parseNotes(notes: string) {
  return notes
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n);
}

function getSum(pinValues: number[]) {
  return pinValues
    .reduce((t, v) => t + v, 0)
    .toString()
    .padStart(3, '0');
}
