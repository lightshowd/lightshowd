import * as React from 'react';
import Konva from 'konva';
import throttle from 'lodash.throttle';
import {
  randomId,
  getFillImage,
  getFillImagesStatus,
  getAngleAndLength,
  getNodeAttributes,
  isMobile,
} from '../../helpers';

import { processImagePaste } from './processImage';
import { CanvasAction } from './types';
import { ContextMenu } from '../ContextMenu';

const DIFF_WIDTH = 4;
const MAX_LENGTH = 6;

const LOGGING_ENABLED = false;

const BACKGROUND_URL_REGEX = /url\(['"]?([^'"]*)['"]?\)/;

const MASKS = {
  on: 'linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85))',
  off: 'linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65))',
};

export const SpaceCanvas: React.FC<{
  space: any;
  editMode: string;
  elements: any[];
  layout?: { [attr: string]: any };
  isPlaying?: boolean;
  onChange: (
    e:
      | Konva.KonvaEventObject<Konva.KonvaPointerEvent>
      | KeyboardEvent
      | ClipboardEvent
      | Event,
    message: { action: CanvasAction; payload: any; snapshot: string }
  ) => void;
}> = ({ space, editMode, elements, layout, isPlaying, onChange }) => {
  const layerRef = React.useRef<Konva.Layer>();
  const stageRef = React.useRef<Konva.Stage>();
  const transRef = React.useRef<Konva.Transformer>();
  const activeGroup = React.useRef<Konva.Group>();
  const clipboardGroup = React.useRef<Konva.Group>();
  const activeShape = React.useRef<Konva.Rect>();
  const isDrawing = React.useRef(false);
  const editModeRef = React.useRef(editMode);
  const altKeyPressedRef = React.useRef(false);

  const stageStyleRef = React.useRef<Partial<React.CSSProperties>>();
  /**
   * initial size tracking for scale
   */
  const stageLayoutRef = React.useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const pointsQueueRef = React.useRef<{ x: number; y: number }[]>([]);

  const pointsQueueProcessingRef = React.useRef(false);

  const [fillImagesLoaded, setFillImagesLoaded] =
    React.useState<boolean>(false);

  const fillImageRef = React.useRef<HTMLImageElement>(
    getFillImage('multicolor')
  );

  const handleSpaceChange = (
    e:
      | Konva.KonvaEventObject<Konva.KonvaPointerEvent>
      | KeyboardEvent
      | ClipboardEvent
      | Event
      | null,
    message: {
      action: CanvasAction;
      payload: any;
    }
  ) => {
    const snapshot = stageRef.current.toJSON();
    onChange(e, { ...message, snapshot });
  };

  const commitGroup = (e?: any) => {
    isDrawing.current = false;
    if (!activeGroup.current) {
      return;
    }

    const groupNode = activeGroup.current;
    groupNode.draggable(true);
    groupNode
      .on('dragstart', handleDragSetup)
      .on('dragend transformend', handleTransform);

    handleSpaceChange(e, {
      action: CanvasAction.GroupCreate,
      payload: {
        ...getNodeAttributes(groupNode),
        fillPattern: fillImageRef.current.alt,
        elements: groupNode.getChildren().map((c) => {
          return getNodeAttributes(c);
        }),
      },
    });

    selectActiveGroup(e, groupNode);
  };

  const applyStageStyles = (styles: Partial<React.CSSProperties>) => {
    const container = stageRef.current.container();
    Object.entries(styles).forEach(([key, value]) => {
      if (key !== 'background') {
        container.style[key] = value;
      }
    });
  };

  React.useEffect(() => {
    editModeRef.current = editMode;
    // If mode is switched while drawing - finish it
    if (editMode !== 'drawing' && isDrawing.current) {
      commitGroup();
    }
    setCursor(editMode);
  }, [editMode]);

  React.useEffect(() => {
    if (stageRef.current) {
      const container = stageRef.current.container();
      container.style.background = `${isPlaying ? MASKS.on : MASKS.off}, ${
        stageStyleRef.current.background
      }`;

      applyStageStyles(stageStyleRef.current);
    }
  }, [isPlaying]);

  const setCursor = (editMode) => {
    if (stageRef.current) {
      stageRef.current.container().style.cursor =
        editMode === 'drawing'
          ? 'crosshair'
          : editMode === 'pan'
          ? 'grab'
          : 'pointer';
    }
  };

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button > 0) {
      return;
    }
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      // only clear active group if we are not currently drawing (basic deselect)
      clearTransformSelect({ clearGroup: !isDrawing.current });
    }

    if (!clickedOnEmpty && !isDrawing.current) {
      handleTransformSetup(e);
      return;
    }

    const pos = stageRef.current.getRelativePointerPosition();
    clearTransformSelect();

    let group;

    if (!isDrawing.current) {
      group = new Konva.Group({
        id: randomId(),
        draggable: false,
      });

      layerRef.current.add(group);
      activeGroup.current = group;
    } else {
      group = activeGroup.current;
    }

    isDrawing.current = true;

    const shapeConfig = {
      id: randomId(),
      name: group.id(),
      x: pos.x,
      y: pos.y,
      width: DIFF_WIDTH,
      height: 1,
    };

    const rect = new Konva.Rect({
      ...shapeConfig,
      fillPatternImage: fillImageRef.current,
    });

    activeShape.current = rect;
    group.add(rect);
  };

  const handleStageMouseMove = (e) => {
    if (!isDrawing.current || !activeShape.current) {
      return;
    }

    const point = stageRef.current.getRelativePointerPosition();

    if (altKeyPressedRef.current) {
      pointsQueueRef.current.push(point);
      if (!pointsQueueProcessingRef.current) {
        pointsQueueProcessingRef.current = true;
        setTimeout(processQueuedPoints, 10);
      }
      return;
    }

    const drawingShape = activeShape.current;

    const { angle, length } = getAngleAndLength(
      {
        x: drawingShape.x(),
        y: drawingShape.y(),
      },
      point
    );

    if (!altKeyPressedRef.current || length <= MAX_LENGTH) {
      drawingShape.height(length);
      drawingShape.rotation(angle);
    } else {
      const shapeConfig = {
        id: randomId(),
        name: activeGroup.current.id(),
        x: point.x,
        y: point.y,
        width: DIFF_WIDTH,
        height: 1,
      };

      const rect = new Konva.Rect({
        ...shapeConfig,
        fillPatternImage: fillImageRef.current,
        fillPatternOffsetY:
          (activeGroup.current.children.length * MAX_LENGTH) % 30,
      });

      activeShape.current = rect;
      activeGroup.current.add(rect);
    }
  };

  const processQueuedPoints = () => {
    if (!pointsQueueRef.current.length) {
      pointsQueueProcessingRef.current = false;
      return;
    }

    const point = pointsQueueRef.current.shift();

    const drawingShape = activeShape.current;

    const { angle, length } = getAngleAndLength(
      {
        x: drawingShape.x(),
        y: drawingShape.y(),
      },
      point
    );

    if (length <= MAX_LENGTH) {
      drawingShape.height(length);
      drawingShape.rotation(angle);
    } else {
      drawingShape.height(MAX_LENGTH);

      const shapeConfig = {
        id: randomId(),
        name: activeGroup.current.id(),
        x: point.x,
        y: point.y,
        width: DIFF_WIDTH,
        height: length - MAX_LENGTH,
        rotation: angle,
      };

      const rect = new Konva.Rect({
        ...shapeConfig,
        fillPatternImage: fillImageRef.current,
        fillPatternOffsetY:
          (activeGroup.current.children.length * MAX_LENGTH) % 30,
      });

      activeShape.current = rect;
      activeGroup.current.add(rect);
    }

    setTimeout(processQueuedPoints, 5);
  };

  const handleStageMouseUp = () => {
    if (!isDrawing.current) {
      return;
    }

    if (pointsQueueRef.current.length) {
      console.log([...pointsQueueRef.current]);
      pointsQueueRef.current = [];
    }

    if (activeShape.current?.height() < 2) {
      activeShape.current.remove();
      if (!activeGroup.current.hasChildren()) {
        activeGroup.current.remove();
        activeGroup.current = null;
        isDrawing.current = false;
      }
    }

    logStage('shapeAdd');

    activeShape.current = null;
  };

  const handleTransformSetup = (e) => {
    if (isDrawing.current) {
      return;
    }

    if (e.target.parent?.id() === '__transformer') {
      return;
    }

    const group = stageRef.current.findOne<Konva.Group>(`#${e.target.name()}`);
    selectActiveGroup(e, group);
  };

  const handleDragSetup = (e) => {
    const groupNode = activeGroup.current;
    handleSpaceChange(e, {
      action: CanvasAction.GroupDragStart,
      payload: {
        id: groupNode.id(),
        rect: groupNode.getClientRect(),
      },
    });
  };

  const handleTransform = (e) => {
    const groupNode = activeGroup.current;

    const fillPattern = (
      (
        groupNode.children[0] as Konva.Rect
      ).fillPatternImage() as HTMLImageElement
    ).alt;

    handleSpaceChange(e, {
      action: CanvasAction.GroupTransform,
      payload: {
        ...getNodeAttributes(groupNode),
        fillPattern,
        rect: groupNode.getClientRect(),
        elements: groupNode.getChildren().map((c) => {
          return getNodeAttributes(c);
        }),
      },
    });
  };

  const selectActiveGroup = (e, group: Konva.Group) => {
    const [currentGroup] = transRef.current.nodes();

    // if transform is already drawn
    if (currentGroup?.id() === group.id()) {
      return;
    }

    transRef.current.nodes([group]);
    layerRef.current.batchDraw();

    activeGroup.current = group;

    handleSpaceChange(e, {
      action: CanvasAction.GroupSelect,
      payload: {
        id: group.id(),
        rect: group.getClientRect(),
      },
    });
  };

  const clearTransformSelect = (
    { clearGroup }: { clearGroup: boolean } = { clearGroup: false }
  ) => {
    transRef.current.nodes([]);
    transRef.current.getLayer().batchDraw();

    if (clearGroup && activeGroup.current) {
      activeGroup.current = null;
      handleSpaceChange(null, {
        action: CanvasAction.GroupSelect,
        payload: {
          id: null,
        },
      });
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    // Set for curve drawing
    altKeyPressedRef.current = e.altKey;

    if (e.key === 'Escape' && isDrawing.current) {
      commitGroup(e);
      return;
    }

    if (e.key === 'Backspace') {
      if (e.ctrlKey || e.metaKey) {
        layerRef.current.clear();
        const groups = layerRef.current.getChildren(
          (node) => node.id() !== '__transformer'
        );
        groups.forEach((g) => g.destroy());
        stageRef.current.width(window.innerWidth);
        stageRef.current.height(window.innerHeight);
        stageRef.current.scale({ x: 1, y: 1 });

        const container = stageRef.current.container();
        container.style.background = 'none';

        stageStyleRef.current = {};
        stageLayoutRef.current = {
          width: window.innerWidth,
          height: window.innerHeight,
        };

        activeGroup.current = null;
        isDrawing.current = false;

        handleSpaceChange(e, {
          action: CanvasAction.StageReset,
          payload: {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        });
        return;
      }

      if (activeGroup.current) {
        const groupNode = activeGroup.current;
        const deletePayload = {
          ...getNodeAttributes(groupNode, ['id']),
          elements: groupNode.getChildren().map((c) => {
            return getNodeAttributes(c, ['id']);
          }),
        };

        activeGroup.current.remove();
        isDrawing.current = null;

        handleSpaceChange(e, {
          action: CanvasAction.GroupDelete,
          payload: deletePayload,
        });

        activeGroup.current = null;
        clearTransformSelect();
      }

      return;
    }

    if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      if (activeGroup.current) {
        clipboardGroup.current = activeGroup.current;
      }
      return;
    }

    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      if (clipboardGroup.current) {
        const groupNode = clipboardGroup.current;
        activeGroup.current = null;

        const newGroupId = randomId();

        const newGroup = groupNode.clone({ id: newGroupId });
        newGroup.getChildren().forEach((child) => {
          child.id(randomId());
          child.name(newGroupId);
        });

        layerRef.current.add(newGroup);
        layerRef.current.batchDraw();
        const fillPattern = (
          (
            newGroup.children[0] as Konva.Rect
          ).fillPatternImage() as HTMLImageElement
        ).alt;
        handleSpaceChange(e, {
          action: CanvasAction.GroupCreate,
          payload: {
            ...getNodeAttributes(newGroup),
            fillPattern,
            elements: newGroup.getChildren().map((c) => {
              return getNodeAttributes(c);
            }),
          },
        });

        selectActiveGroup(e, newGroup);
      }
    }
  };

  const handleWindowResize = throttle(() => {
    const { innerWidth } = window;

    const { width, height } = stageLayoutRef.current;

    let scale = 1;
    if (width && height) {
      scale = innerWidth / width;
    }

    stageRef.current.size({ width: width * scale, height: height * scale });
    stageRef.current.scale({ x: scale, y: scale });
    logStage('windowResize');
  }, 50);

  React.useEffect(() => {
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keyup', () => {
      altKeyPressedRef.current = false;
    });

    document.addEventListener('paste', (e) => {
      if (clipboardGroup.current) {
        return;
      }
      handleSpaceChange(e, {
        action: CanvasAction.StageProcessing,
        payload: true,
      });
      processImagePaste(e, (err, { width, height, src }) => {
        if (err) {
          console.log(err);
          handleSpaceChange(e, {
            action: CanvasAction.StageProcessing,
            payload: false,
          });
          return;
        }

        stageRef.current.size({
          width,
          height,
        });

        stageLayoutRef.current = {
          width,
          height,
        };

        stageRef.current.scale({ x: 1, y: 1 });
        stageRef.current.batchDraw();

        stageStyleRef.current.background = `url('${src}')`;
        stageStyleRef.current.backgroundRepeat = 'no-repeat';
        stageStyleRef.current.backgroundSize = '100vw';
        stageStyleRef.current.backgroundPosition = 'center';

        handleSpaceChange(e, {
          action: CanvasAction.StageUpdate,
          payload: {
            style: { ...stageStyleRef.current },
            width,
            height,
          },
        });

        const stageContainerEl = stageRef.current.container();

        stageContainerEl.style.background = `${MASKS.off}, ${stageStyleRef.current.background}`;
        stageContainerEl.style.transition = 'background-color linear 0.3s';

        applyStageStyles(stageStyleRef.current);

        logStage('paste', {
          canvasWidth: width,
          canvasHeight: height,
        });

        handleSpaceChange(e, {
          action: CanvasAction.StageProcessing,
          payload: false,
        });
      });
    });

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  React.useEffect(() => {
    const stage = new Konva.Stage({
      container: 'space-canvas',
      listening: !isMobile,
    });

    if (!isMobile) {
      stage
        .on('mousedown', handleStageMouseDown)
        .on('mousemove', handleStageMouseMove)
        .on('mouseup', handleStageMouseUp);
    }

    stageRef.current = stage;

    addLayer();

    handleSpaceChange(null, {
      action: CanvasAction.StageCreate,
      payload: {
        node: stageRef.current,
      },
    });
  }, []);

  const addLayer = () => {
    const layer = new Konva.Layer();
    layerRef.current = layer;

    stageRef.current.add(layer);

    setCursor(editModeRef.current);

    const transformer = new Konva.Transformer({
      id: '__transformer',
      useSingleNodeRotation: false,
      flipEnabled: true,
      boundBoxFunc: (oldBox, newBox) => {
        // if (newBox.width < 5 || newBox.height < 5) {
        //   return oldBox;
        // }
        return newBox;
      },
    });

    transRef.current = transformer;

    layer.add(transformer);
  };

  React.useEffect(() => {
    if (!fillImagesLoaded) {
      return;
    }
    if (!elements?.length) {
      handleSpaceChange(null, {
        action: CanvasAction.StageLoad,
        payload: {
          node: stageRef.current,
        },
      });
      return;
    }

    elements.forEach((group) => {
      const { elements, fillPattern, ...groupAttributes } = group;
      const groupNode = new Konva.Group(groupAttributes);
      elements.forEach((elConfig) => {
        const node = new Konva.Rect({
          ...elConfig,
          name: groupAttributes.id,
          fillPatternImage: getFillImage(fillPattern || 'multicolor'),
        });
        groupNode.add(node);
      });

      groupNode.draggable(true);
      groupNode
        .on('dragstart', handleDragSetup)
        .on('dragend transformend', handleTransform);

      layerRef.current.add(groupNode);
    });

    handleSpaceChange(null, {
      action: CanvasAction.StageLoad,
      payload: {
        node: stageRef.current,
      },
    });
  }, [elements, fillImagesLoaded]);

  React.useEffect(() => {
    let {
      width = window.innerWidth,
      height = window.innerHeight,
      style,
    } = layout || {};
    if (!style) {
      style = space.style;
    }

    stageLayoutRef.current = { width, height };

    const stageContainerEl = stageRef.current.container();

    if (style) {
      stageStyleRef.current = { ...style };

      stageContainerEl.style.background = `${MASKS.off}, ${style.background}`;
      stageContainerEl.style.transition = 'background-color linear 0.3s';

      applyStageStyles(style);
    }

    const { innerWidth } = window;
    const scale = innerWidth / width;

    stageRef.current.size({ width: width * scale, height: height * scale });
    stageRef.current.scale({ x: scale, y: scale });
    stageRef.current.batchDraw();

    logStage('layoutRefresh', {
      originalWidth: width,
      originalHeight: height,
      layout,
    });
  }, [layout]);

  React.useEffect(() => {
    getFillImagesStatus().then((isLoaded) => {
      setFillImagesLoaded(isLoaded);
    });
  }, []);

  const logStage = (evName, extras = {}) => {
    if (!LOGGING_ENABLED) {
      return;
    }
    console.log(evName, {
      scaleX: stageRef.current.scaleX(),
      scaleY: stageRef.current.scaleY(),
      absScale: stageRef.current.getAbsoluteScale(),
      size: stageRef.current.getSize(),
      ...extras,
    });
  };

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
        }}
        id="space-canvas"
      />
      <ContextMenu
        onChange={(e, { action, payload }) => {
          if (action === 'fill') {
            fillImageRef.current = getFillImage(payload);
            if (activeGroup.current) {
              activeGroup.current.getChildren().forEach((c: Konva.Rect) => {
                c.fillPatternImage(fillImageRef.current);
              });

              activeGroup.current.clearCache();
              activeGroup.current.draw();

              handleSpaceChange(e.nativeEvent, {
                action: CanvasAction.GroupTransform,
                payload: {
                  ...getNodeAttributes(activeGroup.current),
                  fillPattern: payload,
                  rect: activeGroup.current.getClientRect(),
                  elements: activeGroup.current.getChildren().map((c) => {
                    return getNodeAttributes(c);
                  }),
                },
              });
            }
          }
        }}
      />
    </>
  );
};
