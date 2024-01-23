import { union } from 'lodash';
const NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const dimmableNotes = [
  'C5',
  'D5',
  'E5',
  'F5',
  'Gb5',
  'G5',
  'A5',
  'B5',
  'C6',
  'E6',
  'F6',
  'Gb6',
  'G6',
  'A6',
  'B6',
];

export function getNoteName(noteNumber) {
  const octave = Math.floor(noteNumber / 12) - 1;
  const note = NOTES[noteNumber % 12];
  return `${note}${octave}`;
}

export function getNoteNumber(noteName) {
  const octave = Number(noteName.replace(/[a-g]+/i, ''));
  const noteIndex = NOTES.findIndex((n) => noteName.includes(n));
  return octave * 12 + 12 + noteIndex;
}

export function getNotesString(notes: string | string[][]) {
  if (typeof notes === 'string') {
    return notes;
  }
  return notes.flat().join(',');
}

export function getNotesArray(notes: string | string[][]) {
  if (typeof notes === 'string') {
    return notes.split(',');
  }
  return notes.flat();
}

export function mergeNotes(destination: string[], source: string | string[][]) {
  const sourceArray = getNotesArray(source);
  return union(destination, sourceArray);
}
export function getNoteNumbersString(notes: string | string[][]) {
  if (typeof notes === 'string') {
    return notes
      .split(',')
      .map((n) => getNoteNumber(n))
      .join(',');
  }
  return notes
    .flat()
    .map((n) => getNoteNumber(n))
    .join(',');
}

export const dimmableRange = dimmableNotes.map((n) => getNoteNumber(n));
