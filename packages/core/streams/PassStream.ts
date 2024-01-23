import { PassThrough } from 'stream';

export class PassStream extends PassThrough {
  started: boolean = false;

  constructor() {
    super();
  }
}
