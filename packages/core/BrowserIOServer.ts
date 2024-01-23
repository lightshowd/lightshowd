export class BrowserIOServer {
  callbackList: { [ev: string]: (() => any)[] } = {};

  on(eventName: string, callback: () => any) {
    const callbacks = this.callbackList[eventName] ?? [];
    callbacks.push(callback);
    this.callbackList[eventName] = callbacks;
    return this;
  }

  emit(eventName: string, ...args: []) {
    this.callbackList[eventName]?.forEach((callback) => {
      callback(...args);
    });
  }

  removeAllListeners() {
    this.callbackList = {};
  }
}

export const io = new BrowserIOServer();
