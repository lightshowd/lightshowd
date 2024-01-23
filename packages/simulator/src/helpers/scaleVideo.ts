const boxPadding = 24;
export const scaleVideo = (window: Window) => {
  let newWidth = 300;
  let newHeight = 178;
  let newX = window.innerWidth - newWidth - boxPadding * 1.5;
  let newY = window.innerHeight - newHeight - boxPadding * 1.5;
  if (window.innerWidth < 600) {
    newWidth = window.innerWidth - boxPadding * 2;

    newX = boxPadding / 2;
    newY -= 75;
  }

  return {
    width: newWidth,
    height: newHeight,
    x: newX,
    y: newY,
  };
};
