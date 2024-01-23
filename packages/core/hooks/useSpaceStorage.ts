import * as React from 'react';
import { isEqual, clone } from 'lodash';
import type { Space } from '../Space';

import type Konva from 'konva';

export function useSpaceStorage() {
  const [space, initializeSpace] = React.useState<Space>();
  const [initialized, setInitialized] = React.useState(false);
  const [spaceConfig, setSpaceConfig] = React.useState<Space>();

  const validateSpace = (baseSpace: Space, localSpace: Space) => {
    const { elements } = baseSpace;

    const baseElements = elements.map(({ id, type, notes }: any) => ({
      id,
      type,
      notes,
    }));

    const cachedBaseElements = localSpace.elements?.map(
      ({ id, type, notes }) => ({
        id,
        type,
        notes,
      })
    );

    // reset if core elements changed
    // @TODO - this is deprecated
    if (!isEqual(baseElements, cachedBaseElements)) {
      setSpaceConfig(clone(baseSpace));
      return;
    }

    if (!isEqual(elements, localSpace.elements)) {
      const mappedElements = elements.map((el: any) => {
        const cachedEl = localSpace.elements.find(
          (cel: any) => cel.id === el.id
        );
        if (!cachedEl) {
          return el;
        }

        const { x, y, width, height, rotation } = cachedEl;
        return { ...el, x, y, width, height, rotation };
      });

      setSpaceConfig({ ...localSpace, elements: mappedElements });
    }
  };

  React.useEffect(() => {
    if (space) {
      const storedValue = window.localStorage.getItem(space.id);
      if (storedValue) {
        const localSpace = JSON.parse(storedValue);
        setSpaceConfig(localSpace);
        validateSpace(space, localSpace);
      } else {
        setSpaceConfig(clone(space));
      }
      setInitialized(true);
    }
  }, [space]);

  const handleChange = (
    changeEventType: 'drag' | 'transform',
    node: Konva.Node
  ) => {
    const updatedSpaceConfig = clone(spaceConfig);
    const baseElId = node.id().split(':').slice(0, 2).join(':');
    const el = updatedSpaceConfig!.elements.find((el) => el.id === baseElId);
    if (!el) {
      return;
    }

    if (changeEventType === 'drag') {
      el.x = node.x();
      el.y = node.y();
    } else if (changeEventType === 'transform') {
      el.x = node.x();
      el.y = node.y();

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      // reset
      node.scaleX(1);
      node.scaleY(1);

      (el.width = node.width() * scaleX),
        (el.height = node.height() * scaleY),
        (el.rotation = node.rotation());
    }

    setSpaceConfig(updatedSpaceConfig);
    window.localStorage.setItem(space!.id, JSON.stringify(updatedSpaceConfig));
  };

  return { spaceConfig, handleChange, initializeSpace };
}
