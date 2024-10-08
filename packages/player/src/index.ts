import next from 'next';
import { NextServer } from 'next/dist/server/next';
import { resolve } from 'path';
// @ts-ignore
import { basePath } from '../next.config';

export default class Player {
  nextApp: NextServer;
  handler: ReturnType<NextServer['getRequestHandler']> = async () =>
    await void null;
  basePath: string;
  constructor() {
    this.nextApp = next({
      dev: process.env.NODE_ENV === 'development',
      dir: resolve(`${__dirname}/..`),
    });
    this.basePath = basePath;
  }

  async prepare() {
    await this.nextApp.prepare();
    this.handler = this.nextApp.getRequestHandler();
  }
}
