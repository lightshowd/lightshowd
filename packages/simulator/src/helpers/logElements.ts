import groupBy from 'lodash.groupby';

export function logElements(elements) {
  const groupedElements = groupBy(
    elements.map((el) => {
      const { id, ...rest } = el;
      return rest;
    }),
    'box'
  );

  Object.keys(groupedElements).forEach((box) => {
    groupedElements[box] = {
      elements: groupedElements[box].map((el) => {
        const { box, notes, ...rest } = el;
        return rest;
      }),
    };
  });

  console.log(JSON.stringify(groupedElements, null, 2));
}
