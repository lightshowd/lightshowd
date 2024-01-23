import type { Space } from '@lightshowd/core/Space';

/**
 * Get a flattened map of elements with notes
 */
export function scaleElements(
  spaceConfig: Space,
  screenWidth: number,
  screenHeight: number
) {
  const maxX =
    spaceConfig.width ??
    Math.max(
      ...spaceConfig.elements.map(
        ({ width = 0, x = 0 }) =>
          width + (typeof x === 'string' || x < 1 ? 40 : (x as number))
      )
    );
  const maxY =
    spaceConfig.height ??
    Math.max(
      ...spaceConfig.elements.map(
        ({ height = 0, y = 0 }) =>
          height + (typeof y === 'string' || y < 1 ? 40 : (y as number))
      )
    );

  if (!maxX || !maxY) {
    return;
  }

  const xFactor = screenWidth / maxX;
  const yFactor = screenHeight / maxY;

  const primaryFactor = Math.min(yFactor, xFactor);

  spaceConfig.elements.forEach((el) => {
    if (el.width) {
      el.width = el.width * primaryFactor;
    }

    if (el.x === 'center') {
      el.x = screenWidth / 2 - el.width / 2;
    } else if ((el.x as number) < 1) {
      el.x = screenWidth * (el.x as number) - el.width / 2;
    } else {
      el.x = (el.x as number) * xFactor;
    }

    if (el.height) {
      el.height = el.height * primaryFactor;
    }

    if (el.y === 'center') {
      el.y = screenHeight / 2 - el.height / 2;
    } else if ((el.y as number) < 1) {
      el.y = screenHeight * (el.y as number) - el.width / 2;
    } else {
      el.y = (el.y as number) * yFactor;
    }
  });
}
