export enum CanvasAction {
  GroupSelect = 'group:select',
  GroupCreate = 'group:create',
  GroupDelete = 'group:delete',
  GroupDragStart = 'group:dragstart',
  GroupDragEnd = 'group:dragend',
  GroupTransform = 'group:transform',
  StageCreate = 'stage:create',
  StageUpdate = 'stage:update',
  StageReset = 'stage:reset',
  /**
   * Trigger when all elements are loaded into the stage
   */
  StageLoad = 'stage:load',
  StageProcessing = 'stage:processing',
}
