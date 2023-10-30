import type { ControlCenter, Logger } from './';

export interface SMSConfig {
  provider: 'twilio' | 'custom' | 'none';
  accountId?: string;
  authToken?: string;
  telNumber?: string;
  webhookUrl?: string;
  ccNumber?: string;
  raw?: any;
}

export type SMSHandlerContext = {
  request: {
    body: { [key: string]: any };
    headers: { [key: string]: string };
    socket: { remoteAddress: 'string' };
  };
  status?: number;
  type?: string;
  body: string;
};
export type SMSHandler = (ctx: SMSHandlerContext) => void;

export interface SMSController {
  readonly logger: Logger;
  readonly controlCenter: ControlCenter;
  readonly config: SMSConfig;

  constructor: Function;

  getWebhookHandler(): {
    method: 'GET' | 'POST';
    path: string;
    handler: SMSHandler;
  };
}
