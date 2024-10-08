import Koa from 'koa';
import http from 'http';

import { Server as SocketIOServer } from 'socket.io';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import path from 'path';
import fs from 'fs';

import { loadPlugins } from './loader';
import { LeafClient } from './LeafClient';

import { Logger } from '@lightshowd/core/Logger';
import { ControlCenter } from '@lightshowd/core/ControlCenter';
import { Playlist } from '@lightshowd/core/Playlist';
import { SpaceCache } from '@lightshowd/core/Space';
import { SMSConfig } from '@lightshowd/core/SMSController';
import { LogLevel } from '@lightshowd/core/Logger';

import {
  playlistRouter,
  controlCenterRouter,
  diagnosticsRouter,
} from './routes';

const plugins = loadPlugins();

const {
  SMS_PROVIDER = 'none',
  TRACKS_PATH = './tracks',
  ELEMENTS_PATH = './elements',
  SPACES_PATH = './spaces',
  SPACE_FILE = 'spaces.json',
  PORT = '3000',
  LOG_LEVELS = '*',
  HUB_ADDRESS,
} = process.env;

let leafClient: LeafClient;

const logger = new Logger({
  level:
    LOG_LEVELS !== '*'
      ? (LOG_LEVELS.split(',') as LogLevel[])
      : ('*' as LogLevel),
});

(async () => {
  checkAndInitFolders();
  const nextPlugins = plugins.filter((p) => p.type === 'nextjs');

  for (const nextPlugin of nextPlugins) {
    await nextPlugin.instance?.prepare();
  }

  const playlist = new Playlist({ path: TRACKS_PATH, logger });

  try {
    playlist.loadPlaylist();
  } catch (err) {
    console.error(err);
    return;
  }

  const app = new Koa();
  const router = new Router();
  const server = http.createServer(app.callback());
  const io = new SocketIOServer(server);

  const spaceCache = new SpaceCache({ path: SPACES_PATH, logger });
  spaceCache.loadSpaces(SPACE_FILE);

  const controlCenter = new ControlCenter({ io, playlist, logger, spaceCache });

  // Only one SMS plugin will be instantiated
  const smsPlugin = plugins.find((p) => p.type === 'sms');

  const smsController = smsPlugin?.module({
    config: { provider: SMS_PROVIDER as SMSConfig['provider'] },
    controlCenter,
    logger,
  });

  if (smsController) {
    const webhookHandler = smsController.getWebhookHandler();
    logger.debug({
      msg: 'Registering SMS webhook route',
      path: webhookHandler.path,
    });
    router.register(
      webhookHandler.path,
      [webhookHandler.method],
      webhookHandler.handler
    );
  }

  if (HUB_ADDRESS) {
    leafClient = new LeafClient({
      controlCenter,
      serverAddress: HUB_ADDRESS,
    });
    logger.info({ msg: 'Registering as leaf node', ip: HUB_ADDRESS });
  }

  router.all('(.*)', async (ctx) => {
    const referer = ctx.headers.referer;
    for (const nextPlugin of nextPlugins) {
      if (
        ctx.path.startsWith(nextPlugin.instance?.basePath) ||
        referer?.startsWith(nextPlugin.instance?.basePath)
      ) {
        await nextPlugin.instance?.handler(ctx.req, ctx.res);
      }
    }

    ctx.respond = false;
  });

  playlistRouter.prefix('/api');
  controlCenterRouter.prefix('/api');
  diagnosticsRouter.prefix('/api');

  const elementsServeHandler = serve(path.resolve(ELEMENTS_PATH));

  app
    .use(bodyParser())
    .use(async (ctx, next) => {
      if (smsController?.validateWebhookRequest(ctx) === false) {
        ctx.res.statusCode = 404;
        return;
      }

      ctx.res.statusCode = 200;
      if (ctx.path === '/') {
        ctx.body = 'Welcome to @lightshowd';
        return;
      }
      await next();
    })
    .use(async (ctx, next) => {
      ctx.state.playlist = playlist;
      ctx.state.logger = logger;
      ctx.state.controlCenter = controlCenter;
      ctx.state.io = io;
      await next();
    })
    .use(playlistRouter.routes())
    .use(controlCenterRouter.routes())
    .use(diagnosticsRouter.routes())
    .use(async (ctx, next) => {
      if (ctx.path.startsWith('/audio')) {
        ctx.path = ctx.path.replace('/audio', '');

        // console.log({ range: ctx.request.get('range'), ip: ctx.request.ip });
        const requestedRange = ctx.request.get('range');
        const mp3Path = path.resolve(path.join(TRACKS_PATH, ctx.path));
        const length = fs.statSync(mp3Path).size;
        const [start = 0, end = length - 1] = requestedRange
          .replace('bytes=', '')
          .split('-')
          .map((s) => (s ? parseInt(s) : undefined));

        ctx.set('Content-Type', 'audio/mpeg');
        ctx.set('Content-Transfer-Encoding', 'binary');
        ctx.status = 206;

        if (requestedRange === 'bytes=0-1') {
          ctx.set('Content-Range', `bytes 0-1/${length}`);
          ctx.set('Content-Length', '2');

          ctx.body = fs.createReadStream(mp3Path, { start, end });

          return;
        } else {
          ctx.set('Content-Length', (end - start + 1).toString());
          ctx.set('Content-Range', `bytes ${start}-${end}/${length}`);

          ctx.body = fs.createReadStream(mp3Path, { start, end });
          return;
        }
      } else if (ctx.path.startsWith('/elements')) {
        ctx.path = ctx.path.replace('/elements', '');

        await elementsServeHandler(ctx, next);
        return;
      } else {
        await next();
      }
    })
    // this should be last
    .use(router.routes());

  await server.listen(Number(PORT));
  logger.info({ msg: 'Server started', port: PORT });
})();

function checkAndInitFolders() {
  if (!fs.existsSync(TRACKS_PATH)) {
    fs.mkdirSync(TRACKS_PATH, { recursive: true });
    fs.writeFileSync(
      `${TRACKS_PATH}/playlist.json`,
      JSON.stringify([], null, 2)
    );

    logger.info({
      msg: 'Created tracks folder. Remember to add tracks to playlist.json!',
      path: TRACKS_PATH,
    });
  }

  if (!fs.existsSync(SPACES_PATH)) {
    fs.mkdirSync(SPACES_PATH, { recursive: true });

    fs.writeFileSync(`${SPACES_PATH}/spaces.json`, JSON.stringify([], null, 2));

    logger.info({
      msg: 'Created spaces folder. Remember to download a spaces.json file from the simulator!',
      path: SPACES_PATH,
    });
  }
}
