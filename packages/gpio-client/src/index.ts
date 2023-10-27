import { io, Socket } from 'socket.io-client';
import rpio from 'rpio';

import { IOEvent } from '@lightshowd/core';
import { log } from './logger';

const { SERVER_URL, CHANNELS, LOG_MESSAGES, CLIENT_ID } = process.env;

let channels: number[] = [];
const notesRegistry: string[][] = [];

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

function toggleChannelByNote(note: string, mode: 'on' | 'off') {
  const activeNotes = notesRegistry[notesRegistry.length - 1];
  const pin = channels[activeNotes.indexOf(note) % channels.length];

  if (!pin) {
    return;
  }

  rpio.write(pin, mode === 'on' ? rpio.HIGH : rpio.LOW);
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
    .on(IOEvent.NoteOn, (note: string) => toggleChannelByNote(note, 'on'))
    .on(IOEvent.NoteOff, (note: string) => toggleChannelByNote(note, 'off'))
    .on(IOEvent.TrackEnd, () => {
      toggleAllChannels('on');
      // Reset to default pins
      if (notesRegistry.length > 1) {
        notesRegistry.pop();
      }
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
