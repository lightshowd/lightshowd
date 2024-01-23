import * as React from 'react';
import BezierEasing from 'bezier-easing';
import { IOEvent } from '../IOEvent';

import { io } from 'socket.io-client';
import type Konva from 'konva';
import { Element } from '../Space';
import { EffectType } from '../EffectType';

let socketClient;

const easing = BezierEasing(0.42, 0, 1.0, 1.0);

interface IOCanvasOptions {
  disableDimming?: boolean;
  clientOverride?: any;
}

export const useIOCanvas = ({
  disableDimming,
  clientOverride,
}: IOCanvasOptions = {}) => {
  const trackPlayingRef = React.useRef(false);
  const [elements, setElements] = React.useState<Element[]>([]);

  // Dictionary for fast canvas element access
  const elementCache = React.useRef<{ [id: string]: Konva.Node }>({});

  // Dictionary for rotating elements
  const indexingCache = React.useRef<{
    [id: string]: { offset: number; limit: number; currIndex: number };
  }>({});

  const hideElements = () => {
    Object.values(elementCache.current).forEach((canvasEl) => {
      canvasEl?.to({
        opacity: 0,
        fillOpacity: 0,
        fillPatternOpacity: 0,
        duration: disableDimming ? 0 : 0.1,
      });
    });
  };

  React.useEffect(() => {
    if (!elements.length) {
      return;
    }

    if (clientOverride) {
      socketClient = clientOverride;
    } else if (!socketClient) {
      socketClient = io({});
    }
    elementCache.current = {};
    indexingCache.current = {};

    elements?.forEach((el) => {
      if (el.effect) {
        const itemLimit = el.node?.children?.length;
        indexingCache.current[el.id] = {
          limit: itemLimit,
          offset: el.offset || 0,
          currIndex: el.offset || 0,
        };

        new Array(itemLimit)
          .fill(0)
          .map((_, i) => i + (el.offset || 0))
          .forEach((elNumber) => {
            elementCache.current[`${el.id}:${elNumber}`] =
              el.node?.children[elNumber];
            elementCache.current[`${el.id}:${elNumber}`].cache();
          });

        return;
      }
      const canvasEl = el.node;
      canvasEl.cache();
      elementCache.current[el.id] = canvasEl;
    });

    if (trackPlayingRef.current) {
      hideElements();
    }

    socketClient
      .on(IOEvent.TrackStart, () => {
        trackPlayingRef.current = true;
        cloneGroupEls(elements, elementCache);
        hideElements();
      })
      .on(IOEvent.TrackEnd, () => {
        trackPlayingRef.current = false;
        Object.values(elementCache.current).forEach((canvasEl) => {
          canvasEl.to({
            opacity: 1,
            duration: disableDimming ? 0 : 0.1,
          });
        });
        destroyClones(elements, elementCache);
      })
      .on(IOEvent.NoteOn, (note, velocity, length = 0, sameNotes) => {
        const notes = [note];
        if (sameNotes) {
          notes.push(...sameNotes);
        }
        const noteEls = elements.filter((el) =>
          el.notes.some((n) => notes.includes(n))
        );

        if (noteEls?.length) {
          const isDimmable = noteEls.some((el) =>
            el.dimmableNotes?.includes(note)
          );

          noteEls.forEach((el) => {
            let canvasEl;

            const indexingRecord = indexingCache.current[el.id];

            if (indexingRecord && el.effect === EffectType.Cycle) {
              canvasEl =
                elementCache.current[`${el.id}:${indexingRecord.currIndex}`];
            } else {
              canvasEl = elementCache.current[el.id];
            }

            if (indexingRecord && isDimmable && el.effect) {
              strobePixels(indexingCache, elementCache, el, length);
              return;
            }

            canvasEl?.to({
              opacity: 1,
              duration: isDimmable && !disableDimming ? length * 0.001 : 0,
            });
          });

          return;
        }
      })
      .on(IOEvent.NoteOff, (note) => {
        const noteEls = elements.filter((el) => el.notes.includes(note));

        noteEls?.forEach((el) => {
          let canvasEl;

          const indexingRecord = indexingCache.current[el.id];

          if (indexingRecord && el.effect === EffectType.Cycle) {
            canvasEl =
              elementCache.current[`${el.id}:${indexingRecord.currIndex}`];
            indexingRecord.currIndex =
              ((indexingRecord.currIndex + 1) % indexingRecord.limit) +
              indexingRecord.offset;
          } else {
            canvasEl = elementCache.current[el.id];
          }

          canvasEl?.to({
            opacity: 0,
            duration: 0,
          });
        });
      });
    return () => {
      socketClient.removeAllListeners();
    };
  }, [elements]);

  return { setElements };
};

function cloneGroupEls(elements, elementCache) {
  elements
    .filter((el) => el.effect)
    .forEach((el) => {
      elementCache.current[el.id] = el.node?.clone();
      el.node?.getLayer().add(elementCache.current[el.id]);
    });
}

function destroyClones(elements, elementCache) {
  elements
    .filter((el) => el.effect)
    .forEach((el) => {
      elementCache.current[el.id]?.destroy();
      elementCache.current[el.id] = null;
    });
}

function strobePixels(indexingCache, elementCache, el, duration) {
  const childCount = el.node.children.length;
  const interval = duration / childCount;
  const indexingRecord = indexingCache.current[el.id];

  let currEl;
  let accum = 0;

  const allKeys = Object.keys(elementCache.current).filter((k) =>
    k.startsWith(`${el.id}:`)
  );

  allKeys.forEach((k) => {
    elementCache.current[k]?.to({
      opacity: el.effect === EffectType.WipeDown ? 1 : 0,
      duration: 0,
    });
  });

  const strobeEl = () => {
    if (el.effect === EffectType.Cycle) {
      currEl?.to({
        opacity: 0,
        duration: 0,
      });
    }
    currEl = elementCache.current[`${el.id}:${indexingRecord.currIndex}`];
    currEl?.to({
      opacity: el.effect === EffectType.Cycle ? 1 : 0,
      duration: 0,
    });

    indexingRecord.currIndex =
      ((indexingRecord.currIndex + 1) % indexingRecord.limit) +
      indexingRecord.offset;

    if (accum < duration) {
      const easeValue = easing(indexingRecord.currIndex / childCount);

      accum += interval;

      setTimeout(strobeEl, interval * (1 - easeValue));
    } else {
      allKeys.forEach((k) => {
        elementCache.current[k]?.to({
          opacity: 0,
          duration: 0,
        });
      });
    }
  };

  setTimeout(strobeEl);
}
