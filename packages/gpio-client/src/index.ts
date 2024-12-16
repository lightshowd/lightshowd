import { io, Socket } from 'socket.io-client';
import rpio from 'rpio';

import { IOEvent } from '@lightshowd/core/IOEvent';
import { log } from './logger';

const { SERVER_URL, CHANNELS, LOG_MESSAGES, CLIENT_ID } = process.env;

let channels: number[] = [];
const notesRegistry: number[][] = [];
let isEnabled = true;

startUp();

function startUp() {
  let socket: Socket;

  initializeChannels();
  log(`Channels initialized:`, channels);
  toggleAllChannels('on');

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

function initializeChannels() {
  if (!CHANNELS) {
    throw new Error('No pins mapped. Please configure CHANNELS.');
  }
  channels = CHANNELS.split(',').map((c) => parseInt(c));

  channels.forEach((c) => {
    rpio.open(c, rpio.OUTPUT);
  });
}

function toggleAllChannels(mode: 'on' | 'off') {
  if (!channels) {
    throw new Error('No channels mapped. Please configure CHANNELS.');
  }
  channels.forEach((p) => {
    rpio.write(p, mode === 'on' ? rpio.HIGH : rpio.LOW);
  });
}

function toggleChannelByNote(notes: number[], mode: 'on' | 'off') {
  const activeNotes = notesRegistry[notesRegistry.length - 1];

  const pins = activeNotes
    .map((n, i) => (notes.includes(n) ? i : -1))
    .filter((i) => i !== -1);

  if (!pins.length) {
    return;
  }

  pins.forEach((pin) => {
    rpio.write(pin, mode === 'on' ? rpio.HIGH : rpio.LOW);
  });
}

function listenForNoteMessages(socket: Socket) {
  socket
    .on(IOEvent.MapNotes, (clientId, _, noteNumbers, isPrimary) => {
      if (clientId !== CLIENT_ID) {
        return;
      }

      if (noteNumbers) {
        const mappedNotes = parseNotes(noteNumbers);
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
    .on(IOEvent.TrackStart, () => {
      if (!isEnabled) {
        return;
      }
      toggleAllChannels('off');
    })
    .on(IOEvent.NoteOn, (notes: number[]) => {
      if (!isEnabled) {
        return;
      }
      toggleChannelByNote(notes, 'on');
    })
    .on(IOEvent.NoteOff, (notes: number[]) => {
      if (!isEnabled) {
        return;
      }
      toggleChannelByNote(notes, 'off');
    })
    .on(IOEvent.TrackEnd, () => {
      toggleAllChannels('on');
      // Reset to default pins
      if (notesRegistry.length > 1) {
        notesRegistry.pop();
      }
    })
    .on(IOEvent.ClientEnable, (clientId) => {
      if (clientId !== CLIENT_ID) {
        return;
      }
      isEnabled = true;
    })
    .on(IOEvent.ClientDisable, (clientId) => {
      if (clientId !== CLIENT_ID) {
        return;
      }
      isEnabled = false;
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
    .map((n) => parseInt(n.trim()))
    .filter((n) => !isNaN(n));
}
