import * as React from 'react';

import { useIOCanvas } from '@lightshowd/core/hooks';
import { io as ioClient } from 'socket.io-client';
import { MidiIORouter } from '@lightshowd/core/MidiIORouter';

import Konva from 'konva';

import { SpaceCanvas } from './SpaceCanvas';
import { CanvasAction } from './SpaceCanvas/types';

import { ElementSettingsPopover } from './ElementSettingsPopover';

import { initialMappings, initialElements, initialLayout } from '../_defaults';
import { scaleVideo, isMobile } from '../helpers';
import { Box } from '@mui/material';
import { LoadingModal } from './LoadingModal';
import { useStorage } from '../hooks/useStorage';

const io = ioClient('http://localhost:3000');
const midiIO = new MidiIORouter();

const SpaceDesigner: React.FC<{
  space: any;
  input: 'midi' | 'player';
  editable?: boolean;
}> = ({ space, input = 'player', editable = false }) => {
  const [loadingModal, setLoadingModal] = React.useState(false);
  // Layout state persisted to storage
  const [canvasLayoutState, setCanvasLayoutState] = React.useState<{
    [attr: string]: any;
  }>();
  // Elements state persisted to storage
  const [canvasElementsState, setCanvasElementsState] = React.useState([]);
  // Elements to channel mappings persisted to storage
  const [mappingsState, setMappingsState] = React.useState<
    { id: string; channel: number; box: string }[]
  >([]);

  // State passed to Canvas component for initial load and targeted refresh
  const [canvasElementsRefreshState, setCanvasElementsRefreshState] =
    React.useState([]);

  const [canvasLayoutRefreshState, setCanvasLayoutRefreshState] =
    React.useState<{ [attr: string]: any }>({});

  const [stageState, setStageState] = React.useState<Konva.Stage>();
  const [selectedGroupState, setSelectedGroupState] = React.useState<string>();
  const [selectedGroupPosition, setSelectedGroupPosition] = React.useState<{
    y: number;
    x: number;
    width: number;
    height: number;
    top: number;
    left: number;
  }>();

  const [isGroupDragging, setIsGroupDragging] = React.useState(false);

  // Is the canvas untouched?
  const isInitialStateRef = React.useRef(false);

  const userActionRef = React.useRef<CanvasAction>();
  const mappedChannelsRef = React.useRef([]);

  const { getItem, storeItem } = useStorage({ spaceId: space.id });

  const ioInput = React.useMemo(() => {
    const newInput = input === 'midi' ? midiIO : io;
    newInput.removeAllListeners();

    return newInput;
  }, [input]);

  const { setElements: setIOElements } = useIOCanvas({
    clientOverride: ioInput,
  });

  const selectedMapping = mappingsState?.find(
    (mapping) => mapping.id === selectedGroupState
  );

  React.useMemo(() => {
    if (space.id) {
      mappedChannelsRef.current = space.mappedChannels
        .map((mc) =>
          mc.channels.map((channel) => ({
            ...channel,
            box: { id: mc.box.id },
          }))
        )
        .flat();

      const savedLayout = getItem('layout');
      const savedElements = getItem('elements');
      const savedMappings = getItem('mappings');

      if (savedLayout) {
        if (!savedLayout.video) {
          savedLayout.video = scaleVideo(window);
        }
        setCanvasLayoutState(savedLayout);
        setCanvasLayoutRefreshState(savedLayout);
      } else {
        isInitialStateRef.current = true;
        setCanvasLayoutState({ ...initialLayout, video: scaleVideo(window) });
        setCanvasLayoutRefreshState({
          ...initialLayout,
          video: scaleVideo(window),
        });
      }

      if (savedElements) {
        setCanvasElementsState(savedElements);
        setCanvasElementsRefreshState(savedElements);
      } else {
        setCanvasElementsState(initialElements);
        setCanvasElementsRefreshState(initialElements);
      }

      if (savedMappings) {
        setMappingsState(savedMappings);
      } else {
        setMappingsState(initialMappings);
      }
    }
  }, [space]);

  React.useEffect(() => {
    if (!stageState || !mappingsState.length) {
      return;
    }

    const elements = mappingsState.map(({ id, channel, box }) => {
      const channelConfig = mappedChannelsRef.current.find(
        (c) => c.channel === channel && c.box.id == box
      );
      return {
        channel,
        notes: channelConfig.notes,
        dimmableNotes: channelConfig.dimmableNotes,
        id,
        type: 'custom',
        node: stageState.findOne(`#${id}`),
      };
    });

    setIOElements(elements);
  }, [mappingsState, stageState]);

  const updateGroupPosition = (rect) => {
    const position = { ...rect };

    position.left = position.x + position.width + 8;
    position.top = position.y;
    if (position.left > window.innerWidth - 100) {
      position.left = position.x;
      position.top = position.y + position.height + 8;
    }

    if (position.top > window.innerHeight - 100) {
      position.top = position.y;
    }

    setSelectedGroupPosition(position);
  };

  const handleCanvasChange = (e, { action, payload }) => {
    userActionRef.current = action;

    if (action === CanvasAction.StageLoad) {
      setStageState(payload.node);
      return;
    }

    if (action === CanvasAction.GroupSelect) {
      setSelectedGroupState(payload.id);
      updateGroupPosition(payload.rect);
      return;
    }

    if (action === CanvasAction.StageUpdate) {
      setCanvasLayoutState({ ...payload });
      return;
    }

    if (action === CanvasAction.StageProcessing) {
      setLoadingModal(payload as boolean);
      return;
    }

    if (action === CanvasAction.GroupCreate) {
      setMappingsState((currentMappings) => {
        const freeChannel =
          mappedChannelsRef.current.find(
            (c) =>
              !currentMappings.some(
                (cc) => cc.channel === c.channel && cc.box === c.box.id
              )
          ) || mappedChannelsRef.current[0];

        return [
          ...currentMappings,
          {
            id: payload.id,
            channel: freeChannel.channel,
            box: freeChannel.box.id,
          },
        ];
      });

      setCanvasElementsState((currentElements) => {
        return [...currentElements, { ...payload }];
      });
      return;
    }

    if (action === CanvasAction.StageReset) {
      setMappingsState([]);
      setCanvasLayoutState({
        width: payload.width,
        height: payload.height,
      });
      setCanvasElementsState([]);

      return;
    }

    if (action === CanvasAction.GroupDelete) {
      setMappingsState((currentMappings) => {
        return currentMappings.filter((mapping) => mapping.id !== payload.id);
      });

      setCanvasElementsState((currentElements) => {
        return currentElements.filter((el) => el.id !== payload.id);
      });
      return;
    }

    if (action === CanvasAction.GroupDragStart) {
      setIsGroupDragging(true);
    }

    if (action === CanvasAction.GroupTransform) {
      setCanvasElementsState((currentElements) => {
        const elIndex = currentElements.findIndex((el) => el.id === payload.id);

        return currentElements.map((el) => {
          if (el.id !== payload.id) {
            return el;
          }
          return { ...payload };
        });
      });

      updateGroupPosition(payload.rect);
      setIsGroupDragging(false);
      return;
    }

    if (action === CanvasAction.Import) {
      const {
        contents: {
          mappings: importedMappings,
          elements: importedElements,
          layout: importedLayout,
        },
        spaceId,
      } = payload;
      if (importedLayout) {
        storeItem('layout', importedLayout);
        setCanvasLayoutState(importedLayout);
        setCanvasLayoutRefreshState(importedLayout);
      }

      if (importedElements) {
        storeItem('elements', importedElements);
        setCanvasElementsState(importedElements);
        setCanvasElementsRefreshState(importedElements);
      }

      if (importedMappings) {
        storeItem('mappings', importedMappings);
        setMappingsState(importedMappings);
      }
    }
  };

  const updateMappings = React.useCallback(
    (e, newValues) => {
      const newMappings = [...mappingsState];
      const mappingToUpdate = newMappings.find(
        (m) => m.id === selectedGroupState
      );

      if (mappingToUpdate) {
        Object.assign(mappingToUpdate, newValues);
      }
      setMappingsState(newMappings);
    },
    [mappingsState, selectedGroupState]
  );

  React.useMemo(() => {
    if (userActionRef.current) {
      storeItem('elements', canvasElementsState);
    }
  }, [canvasElementsState]);

  React.useMemo(() => {
    if (userActionRef.current) {
      storeItem('mappings', mappingsState);
    }
  }, [mappingsState]);

  React.useMemo(() => {
    if (userActionRef.current) {
      storeItem('layout', canvasLayoutState);
    }
  }, [canvasLayoutState]);

  return (
    <>
      {selectedGroupState && selectedMapping && !isGroupDragging && (
        <ElementSettingsPopover
          top={selectedGroupPosition.top}
          left={selectedGroupPosition.left}
          box={selectedMapping.box}
          channel={selectedMapping.channel}
          channels={mappedChannelsRef.current}
          forceOpen={true}
          onChange={updateMappings}
        />
      )}
      {space && (
        <>
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: { xs: -200, sm: 0 },
              bottom: 0,
              right: 0,
            }}
          >
            <SpaceCanvas
              space={space}
              editMode={'drawing'}
              elements={canvasElementsRefreshState}
              layout={canvasLayoutRefreshState}
              onChange={handleCanvasChange}
            />
          </Box>
          <LoadingModal open={loadingModal} />
        </>
      )}
    </>
  );
};

export default SpaceDesigner;
