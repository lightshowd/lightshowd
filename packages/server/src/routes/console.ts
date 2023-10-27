import Router from '@koa/router';
import type { Console, Logger } from '@lightshowd/core';

export const consoleRouter = new Router();

consoleRouter.get('/console/disable-notes', async (ctx) => {
  const { notes } = ctx.query;
  const { trackConsole }: { trackConsole: Console } = ctx.state;
  trackConsole.setDisabledNotes((notes as string).split(','));
  ctx.body = { disabled: notes };
});

consoleRouter.get('/console/track/play', async (ctx) => {
  const { track: trackName } = ctx.query;

  const { trackConsole, logger }: { trackConsole: Console; logger: Logger } =
    ctx.state;

  const track = trackConsole.playlist.getTrack(trackName as string);

  if (track) {
    await trackConsole.loadTrack({ track });
    try {
      trackConsole.playTrack();

      ctx.body = `Now playing "${track.name}" by ${track.artist}`;
    } catch (err: any) {
      logger.error(err);
      ctx.status = 400;
      ctx.body = err?.message;
    }

    return;
  }

  ctx.body = `Track "${trackName}" not found.`;
});

consoleRouter.get('/console/track/load', async (ctx) => {
  const { track: trackName, format } = ctx.query;

  const { trackConsole, logger }: { trackConsole: Console; logger: Logger } =
    ctx.state;

  const track = trackConsole.playlist.getTrack(trackName as string);

  if (track) {
    await trackConsole.loadTrack({
      track,
      formats: format ? [format as 'audio' | 'midi'] : undefined,
    });
    ctx.body = `Track loaded`;
  }
  ctx.body = `Track "${trackName}" not found.`;
});

consoleRouter.get('/console/track/stop', async (ctx) => {
  const { trackConsole, logger }: { trackConsole: Console; logger: Logger } =
    ctx.state;

  if (trackConsole.playlist.currentTrack) {
    try {
      const { name, artist } = trackConsole.playlist.currentTrack;
      trackConsole.stopTrack();

      ctx.body = `Now playing "${name}" by ${artist}`;
    } catch (err: any) {
      logger.error(err);
      ctx.status = 400;
      ctx.body = err?.message;
    }
  } else {
    ctx.body = `No track is currently playing.`;
  }
});
