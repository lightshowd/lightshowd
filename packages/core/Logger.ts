const timeFormat = new Intl.DateTimeFormat('en', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
});

export type LogLevel = 'debug' | 'info' | 'error' | 'verbose' | '*';
export type LogPayload =
  | string
  | Error
  | Record<string, any>
  | { [key: string]: any };

export class Logger {
  public levels: LogLevel[];
  public formatters: {
    [transport: string]: ({
      level,
      payload,
      group,
    }: {
      level: LogLevel;
      payload: LogPayload;
      group?: string;
    }) => void;
  } = {
    console: ({ level, payload, group }) => {
      let formattedPayload = payload;
      if (typeof payload !== 'string') {
        formattedPayload = JSON.stringify(payload);
      }
      return `[${timeFormat.format(new Date())}]-[${level}] ${
        group ? `<${group}> ` : ''
      }${formattedPayload}`;
    },
  };

  constructor({
    level,
    formatters,
  }: {
    level: LogLevel | LogLevel[];
    formatters?: Logger['formatters'];
  }) {
    if (level === '*') {
      level = ['debug', 'info', 'error'];
    }
    this.levels = Array.isArray(level) ? level : [level];
    if (formatters) {
      this.formatters = { ...this.formatters, ...formatters };
    }
  }

  log({
    level,
    payload,
    group,
  }: {
    level: LogLevel;
    payload: LogPayload;
    group?: string;
  }) {
    if (!this.levels.includes(level)) {
      return;
    }

    const formattedLog = this.formatters.console({ level, group, payload });

    if (level === 'error') {
      console.error(formattedLog);
      return;
    }

    if (level === 'info') {
      console.info(formattedLog);
      return;
    }

    console.log(formattedLog);
  }

  verbose(payload: LogPayload) {
    this.log({ level: 'verbose', payload });
  }

  debug(payload: LogPayload) {
    this.log({ level: 'debug', payload });
  }

  info(payload: LogPayload) {
    this.log({ level: 'info', payload });
  }

  error(payload: LogPayload) {
    this.log({ level: 'error', payload });
  }

  getGroupLogger(group: string) {
    const proxyProps = ['debug', 'error', 'info'];
    const groupHandler = {
      get: function (target: Logger, prop: LogLevel, args: any) {
        if (!proxyProps.includes(prop)) {
          return Reflect.get(target, prop, args);
        }

        return (payload: LogPayload) => {
          target.log({ level: prop, payload, group });
        };
      },
    };

    return new Proxy(this, groupHandler);
  }
}
