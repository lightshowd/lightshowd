import * as React from 'react';
import { dimmableNotes, getNoteName } from '../Note';

export const useMidi = (isMidi: boolean, space: any) => {
  React.useEffect(() => {
    if (!isMidi || !space) {
      return;
    }
    // @ts-ignore
    window.navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);

    const elements = space.elements || [];

    function onMIDISuccess(midiAccess: any) {
      for (const input of midiAccess.inputs.values())
        input.onmidimessage = getMIDIMessage;
    }

    function getMIDIMessage(midiMessage: any) {
      const [command, note, velocity = 0] = midiMessage.data;

      const noteName = getNoteName(note);
      let noteCommand = command == 144 ? 'note:on' : undefined;

      if (command == 128) {
        noteCommand = 'note:off';
      }

      const noteEls = elements
        .filter((el: any) => el.notes.includes(noteName))
        .map((el: any) => {
          return document.getElementById(el.id);
        })
        .filter((el: any) => el);

      if (noteEls.length) {
        noteEls.forEach((el: any) => {
          const lightEl = el as HTMLElement;
          const fillColor = el.getAttribute('data-light-color');
          const isDimmable = dimmableNotes.includes(note);

          if (length && isDimmable) {
            lightEl.style.transitionDuration = `${length}ms`;
          }

          lightEl.style.fill = fillColor || 'red';
          lightEl.style.fillOpacity = '1';

          if (isDimmable && command == 144) {
            const opacity = (velocity / 127).toFixed(2);
            lightEl.style.fill = fillColor.replace(',1)', `,${opacity})`);
          } else {
            lightEl.style.fill =
              command == 144 ? fillColor || 'red' : 'inherit';
          }
        });
      }
    }

    function onMIDIFailure() {
      console.log('Could not access your MIDI devices.');
    }
  }, [isMidi, space]);
};
