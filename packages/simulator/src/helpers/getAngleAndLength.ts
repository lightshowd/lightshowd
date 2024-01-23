export const getAngleAndLength = (point1, point2) => {
  const angle =
    Math.atan2(point2.y - point1.y, point2.x - point1.x) * (180 / Math.PI) +
    270;

  const length = Math.sqrt(
    (point2.x - point1.x) * (point2.x - point1.x) +
      (point2.y - point1.y) * (point2.y - point1.y)
  );
  const offsetX = -(point2.x - point1.x) / 2;
  const offsetY = -(point2.y - point1.y) / 2;

  return { angle, length, offsetX, offsetY };
};
