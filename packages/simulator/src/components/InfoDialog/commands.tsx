export const commands = [
  ['mousedown', 'Start a line'],
  ['mousemove', 'Draw a straight line'],
  [
    'Cmd+mousemove',
    <>
      Draw a freehand line (<i>tip: drag slowly</i>)
    </>,
  ],
  ['mouseup', 'Finish line'],
  ['Esc', 'Save one or more lines as an element'],
  ['mouseclick', 'Select an element to transform, copy/paste or delete'],
  ['Cmd+C', 'Copy a selected element'],
  ['Cmd+V', 'Paste a selected element'],
  ['Delete', 'Delete a selected element'],
  ['Cmd+Delete', 'Clear/reset the space'],
  ['Cmd+V (clipboard)', 'Paste in a new background image'],
  ['Ctrl+W', 'Hide all emements'],
  ['Ctrl+Shift+W', 'Show all elements'],
];
