import * as React from 'react';

import { useIOCanvas } from '@lightshowd/core/hooks';
import { io as ioClient } from 'socket.io-client';

import Konva from 'konva';

import { SpaceCanvas } from './SpaceCanvas';
import { CanvasAction } from './SpaceCanvas/types';

import { ElementSettingsPopover } from './ElementSettingsPopover';

import { initialMappings, initialElements, initialLayout } from '../_defaults';
import { scaleVideo, isMobile } from '../helpers';
import { Box } from '@mui/material';
import { LoadingModal } from './LoadingModal';
import PlayCircleIcon from '@mui/icons-material/PlayCircleOutline';
import { PlayerContainer } from '@lightshowd/player/components/PlayerContainer';

const io = ioClient('http://localhost:3000');

const SpaceDesigner: React.FC<{
  space: any;
  editable?: boolean;
}> = ({ space, editable = false }) => {
  const editMode = React.useRef<'drawing' | 'pan' | 'settings'>('drawing');

  const [tool, setTool] = React.useState<string>('pen');
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
  const [isPlaying, setIsPlaying] = React.useState(false);
  // Is the canvas untouched?
  const isInitialStateRef = React.useRef(false);

  const userActionRef = React.useRef<CanvasAction>();
  const mappedChannelsRef = React.useRef([]);
  const playerRef = React.useRef<any>();

  const { setElements: setIOElements } = useIOCanvas({
    clientOverride: io,
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

      const serializedCanvasLayout = window.localStorage.getItem(
        `space:${space.id}:layout`
      );

      if (serializedCanvasLayout) {
        const deserializedLayout = JSON.parse(serializedCanvasLayout);
        if (!deserializedLayout.video) {
          deserializedLayout.video = scaleVideo(window);
        }
        setCanvasLayoutState(deserializedLayout);
        setCanvasLayoutRefreshState(deserializedLayout);
      } else {
        isInitialStateRef.current = true;
        setCanvasLayoutState({ ...initialLayout, video: scaleVideo(window) });
        setCanvasLayoutRefreshState({
          ...initialLayout,
          video: scaleVideo(window),
        });
      }

      const serializedCanvasElements = window.localStorage.getItem(
        `space:${space.id}:elements`
      );

      if (serializedCanvasElements) {
        const deserializedElements = JSON.parse(serializedCanvasElements);
        setCanvasElementsState(deserializedElements);
        setCanvasElementsRefreshState(deserializedElements);
      } else {
        setCanvasElementsState(initialElements);
        setCanvasElementsRefreshState(initialElements);
      }

      const serializedMappings = window.localStorage.getItem(
        `space:${space.id}:mappings`
      );

      if (serializedMappings) {
        setMappingsState(JSON.parse(serializedMappings));
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
      window.localStorage.setItem(
        `space:${space.id}:elements`,
        JSON.stringify(canvasElementsState)
      );
    }
  }, [canvasElementsState]);

  React.useMemo(() => {
    if (userActionRef.current) {
      window.localStorage.setItem(
        `space:${space.id}:mappings`,
        JSON.stringify(mappingsState)
      );
    }
  }, [mappingsState]);

  React.useMemo(() => {
    if (userActionRef.current) {
      window.localStorage.setItem(
        `space:${space.id}:layout`,
        JSON.stringify(canvasLayoutState)
      );
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
              // display: 'flex',
              // flexDirection: 'column',
              // justifyContent: 'center',
            }}
          >
            <SpaceCanvas
              space={space}
              editMode={tool === 'pen' ? 'drawing' : tool}
              elements={canvasElementsRefreshState}
              layout={canvasLayoutRefreshState}
              isPlaying={isPlaying}
              onChange={handleCanvasChange}
            />
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {!isPlaying && isMobile && isInitialStateRef.current === true && (
                <PlayCircleIcon
                  aria-role="button"
                  onClick={() => {
                    if (playerRef.current) {
                      playerRef.current.playVideo();
                    }
                  }}
                  sx={{
                    color: 'white',
                    opacity: 0.5,
                    fontSize: 64,
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 1,
                    },
                  }}
                />
              )}
            </Box>
          </Box>
          {/* <YTPortal
            {...canvasLayoutRefreshState?.video}
            onChange={(_, { action, payload }) => {
              if (action === 'playing') {
                setIsPlaying(payload as boolean);
                return;
              }

              if (action === 'move') {
                setCanvasLayoutState({
                  ...canvasLayoutState,
                  video: { ...payload },
                });
              }

              if (action === 'load') {
                playerRef.current = payload;
              }
            }}
          /> */}
          {/* @ts-ignore */}
          <PlayerContainer />
          <LoadingModal open={loadingModal} />
        </>
      )}
    </>
  );
};

export default SpaceDesigner;
