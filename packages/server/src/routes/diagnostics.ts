import Router from '@koa/router';
import { getNoteNumber, IOEvent } from '@lightshowd/core';
import type { Server as SocketIOServer } from 'socket.io';

export const diagnosticsRouter = new Router();

diagnosticsRouter.get('/diagnostics/io', async (ctx) => {
  const { io }: { io: SocketIOServer } = ctx.state;
  const { note, event, velocity, length, sameNotes, value, clientId } =
    ctx.query;

  if (event === IOEvent.MapNotes) {
    io.emit(IOEvent.MapNotes, clientId, value);
    ctx.body = { clientId, value };
    return;
  }

  if (note) {
    const notes = (note as string).split(',');
    notes.forEach((n) => {
      io.emit(
        event as string,
        n,
        getNoteNumber(n),
        length ? parseInt(length as string) : undefined,
        sameNotes ? (sameNotes as string) : undefined,
        parseInt((velocity as string) || '0')
      );
    });
    ctx.body = {
      event,
      note,
      noteNumber: getNoteNumber(note),
      sameNotes,
      length,
      velocity,
    };
    return;
  }

  const args = [];
  if (value) {
    args.push(value as string);
  }
  io.emit(event as string, ...args);
  ctx.body = { event, value };
});
