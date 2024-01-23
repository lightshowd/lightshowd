const DEFAULT_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb', 'B'];
import type { Space } from '../Space';

/**
 *
 * Flatten channels with notes
 */
export function mapChannels(spaceConfig: Space) {
  const noteLetters = spaceConfig.baseNotes || DEFAULT_NOTES;

  if (!spaceConfig.boxes) {
    return [];
  }

  return spaceConfig.boxes.map((b) => {
    const channels = [...new Array(b.channels)].map(
      (_, index) =>
        ({
          channel: index + 1,
          notes: [],
          dimmableNotes: [],
        } as { channel: number; notes: string[]; dimmableNotes: string[] })
    );

    b.notes.forEach((range) => {
      range.forEach((n, index) => {
        const [note, octave] = n.split('');
        if (note === '*') {
          channels.forEach((c, index) => {
            c.notes.push(`${noteLetters[index]}${octave}`);
          });
        } else {
          channels[index].notes.push(n);
        }
      });
    });

    b.dimmableNotes?.forEach((range) => {
      range.forEach((n, index) => {
        const [note, octave] = n.split('');
        if (note === '*') {
          channels.forEach((c, index) => {
            c.dimmableNotes.push(`${noteLetters[index]}${octave}`);
          });
        } else {
          channels[index].dimmableNotes.push(n);
        }
      });
    });

    return { box: b, channels };
  });
}

/**
 * Get a flattened map of elements with notes
 */
export function mapElements(spaceConfig: Space) {
  const noteLetters = spaceConfig.baseNotes || DEFAULT_NOTES;

  if (!spaceConfig.boxes) {
    return [];
  }

  return spaceConfig.boxes
    .map((b) => {
      const channels = [...new Array(b.channels)].map(
        (_, index) =>
          ({
            channel: index + 1,
            notes: [],
            dimmableNotes: [],
          } as { channel: number; notes: string[]; dimmableNotes: string[] })
      );

      b.notes.forEach((range) => {
        range.forEach((n, index) => {
          const [note, octave] = n.split('');
          if (note === '*') {
            channels.forEach((c, index) => {
              c.notes.push(`${noteLetters[index]}${octave}`);
            });
          } else {
            channels[index].notes.push(n);
          }
        });
      });

      b.dimmableNotes?.forEach((range) => {
        range.forEach((n, index) => {
          const [note, octave] = n.split('');
          if (note === '*') {
            channels.forEach((c, index) => {
              c.dimmableNotes.push(`${noteLetters[index]}${octave}`);
            });
          } else {
            channels[index].dimmableNotes.push(n);
          }
        });
      });

      return b.elements.map((el) => ({
        box: b.id,
        id: `${b.id}:${el.channel}`,
        ...el,
        notes: channels.find((c) => c.channel === el.channel)?.notes || [],
        dimmableNotes:
          channels.find((c) => c.channel === el.channel)?.dimmableNotes || [],
      }));
    })
    .flat()
    .filter((el) => el);
}
