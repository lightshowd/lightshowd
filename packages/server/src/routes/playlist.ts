import Router from '@koa/router';
import type { Playlist } from '@lightshowd/core/Playlist';
import * as fs from 'fs';

export const playlistRouter = new Router();

playlistRouter.get('/playlist', async (ctx) => {
  const showDisabled = ctx.query.showDisabled === 'true';
  const { playlist }: { playlist: Playlist } = ctx.state;
  if (showDisabled) {
    playlist.loadPlaylist('playlist.json', showDisabled);
  }
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
