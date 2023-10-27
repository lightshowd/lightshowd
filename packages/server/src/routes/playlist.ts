import Router from '@koa/router';
import type { Playlist, Console, Logger } from '@lightshowd/core';
import * as fs from 'fs';

export const playlistRouter = new Router();

playlistRouter.get('/playlist', async (ctx) => {
  const { playlist }: { playlist: Playlist } = ctx.state;
  ctx.body = playlist.tracks;
});

playlistRouter.get('/playlist/:track/download', async (ctx) => {
  const { track: trackName } = ctx.params;
  const { playlist }: { playlist: Playlist } = ctx.state;

  const track = playlist.findTrack(trackName);
  if (track) {
    ctx.body = fs.createReadStream(
      playlist.getFilePath(track, 'audio') as fs.PathLike
    );
  }
});
