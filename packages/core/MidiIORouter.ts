import { IOEvent } from './IOEvent';
import { getNoteName } from './Note';

export class MidiIORouter {
  constructor() {
    // @ts-ignore
    if (!window.navigator.userAgent.includes('Safari')) {
      // @ts-ignore
      window.navigator.requestMIDIAccess().then(
        (access) => {
          this.onMIDISuccess(access);
        },
        (err) => {
          this.onMIDIFailure();
        }
      );
    }
  }

  onMIDISuccess(midiAccess: any) {
    for (const input of midiAccess.inputs.values())
      input.onmidimessage = (message) => {
        this.getMIDIMessage(message);
      };
  }

  getMIDIMessage(midiMessage: any) {
    const [command, note, velocity = 0] = midiMessage.data;

    const noteName = getNoteName(note);
    let noteCommand = command == 144 ? IOEvent.NoteOn : undefined;

    if (command == 128 || (noteCommand === IOEvent.NoteOn && velocity === 0)) {
      noteCommand = IOEvent.NoteOff;
    }

    if (noteCommand) {
      this.emit(
        noteCommand,
        noteName,
        note,
        undefined,
        undefined,
        // auto off (for dimmer notes)
        velocity < 125 ? 0 : 1
      );
    } else {
      console.log(command);
    }
  }

  callbackList: { [ev: string]: ((...args: any[]) => any)[] } = {};

  on(eventName: string, callback: (...params: any) => any) {
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

  onMIDIFailure() {
    console.log('Could not access your MIDI devices.');
  }
}
