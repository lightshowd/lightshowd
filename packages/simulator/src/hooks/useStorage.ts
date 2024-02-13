import React from 'react';

type StorageKey = 'elements' | 'layout' | 'mappings';

export function useStorage({ spaceId }) {
  const getItem = (key: StorageKey) => {
    const serializedItem = window.localStorage.getItem(
      `space:${spaceId}:${key}`
    );
    if (!serializedItem) {
      return null;
    }
    try {
      return JSON.parse(serializedItem);
    } catch (err) {
      console.error('Error parsing item from local storage');
      return null;
    }
  };

  const storeItem = (key: StorageKey, value: any) => {
    const serializedItem = JSON.stringify(value);
    window.localStorage.setItem(`space:${spaceId}:${key}`, serializedItem);
  };

  const exportSpace = React.useCallback(() => {
    const elements = getItem('elements');
    const layout = getItem('layout');
    const mappings = getItem('mappings');

    const data = {
      elements,
      layout,
      mappings,
    };

    const blob = new Blob([JSON.stringify(data)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spaceId}.space.json`;
    a.click();
  }, [spaceId]);

  const onKeyPress = React.useCallback((ev) => {
    if (ev.ctrlKey) {
      if (ev.key === 'e') {
        exportSpace();
      }
    }
  }, []);

  React.useEffect(() => {
    window.addEventListener('keypress', onKeyPress);

    return () => {
      window.removeEventListener('keypress', onKeyPress);
    };
  }, []);

  return { getItem, storeItem };
}
