import Konva from 'konva';

type NodeAttribute =
  | 'width'
  | 'height'
  | 'x'
  | 'y'
  | 'rotation'
  | 'scaleX'
  | 'scaleY'
  | 'id'
  | 'fillPatternOffsetY';

export const getNodeAttributes = (
  node: Konva.Node,
  attributes: NodeAttribute[] = [
    'width',
    'height',
    'x',
    'y',
    'rotation',
    'scaleX',
    'scaleY',
    'id',
    'fillPatternOffsetY',
  ]
) => {
  const attributePairs = attributes
    .map((attr) => {
      let value = node[attr];
      if (typeof value === 'function') {
        value = node[attr]();
      }
      if (value === 0) {
        return;
      }

      if ((attr === 'scaleX' || attr === 'scaleY') && value === 1) {
        return;
      }

      return [attr, value];
    })
    .filter((pair) => pair);

  return Object.fromEntries(attributePairs);
};
