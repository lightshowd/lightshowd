import Router from '@koa/router';
import type { ControlCenter, Logger } from '@lightshowd/core';

export const controlCenterRouter = new Router();

controlCenterRouter.get('/control-center/disable-notes', async (ctx) => {
  const { notes } = ctx.query;
  const { controlCenter }: { controlCenter: ControlCenter } = ctx.state;
  controlCenter.setDisabledNotes((notes as string).split(','));
  ctx.body = { disabled: notes };
});

controlCenterRouter.get('/control-center/track/play', async (ctx) => {
  const { track: trackName } = ctx.query;

  const { controlCenter, logger }: { controlCenter: ControlCenter; logger: Logger } =
    ctx.state;

  const track = controlCenter.playlist.getTrack(trackName as string);

  if (track) {
    await controlCenter.loadTrack({ track });
    try {
      controlCenter.playTrack();

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

controlCenterRouter.get('/control-center/track/load', async (ctx) => {
  const { track: trackName, format } = ctx.query;

  const { controlCenter, logger }: { controlCenter: ControlCenter; logger: Logger } =
    ctx.state;

  const track = controlCenter.playlist.getTrack(trackName as string);

  if (track) {
    await controlCenter.loadTrack({
      track,
      formats: format ? [format as 'audio' | 'midi'] : undefined,
    });
    ctx.body = `Track loaded`;
  }
  ctx.body = `Track "${trackName}" not found.`;
});

controlCenterRouter.get('/control-center/track/stop', async (ctx) => {
  const { controlCenter, logger }: { controlCenter: ControlCenter; logger: Logger } =
    ctx.state;

  if (controlCenter.playlist.currentTrack) {
    try {
      const { name, artist } = controlCenter.playlist.currentTrack;
      controlCenter.stopTrack();

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
