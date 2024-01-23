import next from 'next';
import { NextServer } from 'next/dist/server/next';
import { resolve } from 'path';
// @ts-ignore
import { basePath } from '../next.config';

export default class Preview {
  nextApp: NextServer;
  basePath: string;
  handler: ReturnType<NextServer['getRequestHandler']> = async () =>
    await void null;
  constructor() {
    this.nextApp = next({
      dev: process.env.NODE_ENV !== 'production',
      dir: resolve(`${__dirname}/..`),
    });
    this.basePath = basePath;
  }

  async prepare() {
    await this.nextApp.prepare();
    this.handler = this.nextApp.getRequestHandler();
  }
}
