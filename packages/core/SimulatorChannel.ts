export class SimulatorChannel {
  static channel: BroadcastChannel = new BroadcastChannel('simulator');
  static requested: boolean = false;
  static worker: Worker | null;
  static callbackRefs: ((e: any) => void)[] = [];
  static requestSpace(callback) {
    SimulatorChannel.send('space:request', null);
    SimulatorChannel.listen((event, data) => {
      if (event === 'space:response') {
        SimulatorChannel.requested = true;
        callback(data);
      }
    });

    setTimeout(() => {
      if (!SimulatorChannel.requested) {
        callback({ boxes: [], notes: [] });
      }
    }, 1000);
  }

  static send(event: string, data?: any) {
    if (!data) {
      SimulatorChannel.channel.postMessage({ event });
      if (SimulatorChannel.worker) {
        SimulatorChannel.worker.postMessage({ type: event });
      }
      return;
    }
    SimulatorChannel.channel.postMessage({ event, data });

    if (SimulatorChannel.worker) {
      SimulatorChannel.worker.postMessage({ type: event, params: data });
    }
  }

  static emit(event: string, ...params: any[]) {
    SimulatorChannel.send(event, params);
  }

  static listen(callback: (event: string, data: any) => void) {
    const callbackRef = (e) => {
      const { event, data } = e.data;
      callback(event, data);
    };
    SimulatorChannel.channel.addEventListener('message', callbackRef);
    // SimulatorChannel.callbackRefs.push(callbackRef);
    return callbackRef;
  }

  static removeListener(callbackRef: (e: any) => void) {
    SimulatorChannel.channel.removeEventListener('message', callbackRef);
  }

  static onWorkerMessage = (e) => {
    console.log(e);
  };

  static bindWorker(worker: Worker) {
    SimulatorChannel.unbindWorker();
    SimulatorChannel.worker = worker;
    // SimulatorChannel.worker.addEventListener(
    //   'message',
    //   SimulatorChannel.onWorkerMessage
    // );
  }

  static unbindWorker() {
    if (SimulatorChannel.worker) {
      // SimulatorChannel.worker.removeEventListener(
      //   'message',
      //   SimulatorChannel.onWorkerMessage
      // );
      SimulatorChannel.worker = null;
    }
  }
}

export class SimulatorChannelRouter {
  constructor() {
    SimulatorChannel.channel.addEventListener('message', (e) => {
      const { event, data } = e.data;
      if (Array.isArray(data)) {
        this.emit(event, ...data);
      } else {
        this.emit(event);
      }
    });
  }

  callbackList: { [ev: string]: ((...args: any[]) => any)[] } = {};

  on(eventName: string, callback: (...params: any) => any) {
    console.log({ eventName });
    const callbacks = this.callbackList[eventName] ?? [];
    callbacks.push(callback);
    this.callbackList[eventName] = callbacks;
    return this;
  }

  emit(eventName: string, ...args: any[]) {
    this.callbackList[eventName]?.forEach((callback) => {
      callback(...args);
    });
  }

  removeAllListeners() {
    this.callbackList = {};
  }

  getChannel() {
    return SimulatorChannel.channel;
  }
}
