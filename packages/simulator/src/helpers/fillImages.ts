import { basePath } from '../../next.config';

export const fillImages = {
  multicolor: {
    src: `${basePath}/img/lightfills/multicolor.png`,
    image: new Image(),
  },
  white: { src: `${basePath}/img/lightfills/white.png`, image: new Image() },
  green: { src: `${basePath}/img/lightfills/green.png`, image: new Image() },
  red: { src: `${basePath}/img/lightfills/red.png`, image: new Image() },
  yellow: { src: `${basePath}/img/lightfills/yellow.png`, image: new Image() },
  orange: { src: `${basePath}/img/lightfills/orange.png`, image: new Image() },
} as const;

export type FillImageType = keyof typeof fillImages;

Object.entries(fillImages).forEach(([key, fi]) => {
  fi.image.src = fi.src;
  fi.image.alt = key;
});

export const getFillImage = (type: FillImageType) => {
  return fillImages[type].image as HTMLImageElement;
};

export const getFillImagesStatus = async () => {
  const imgLoadPromises = Object.values(fillImages).map(({ image }) => {
    return new Promise((resolve, reject) => {
      if (image.complete) {
        resolve(true);
        return;
      }

      image.addEventListener(
        'load',
        () => {
          resolve(true);
        },
        { once: true }
      );

      image.addEventListener(
        'error',
        (e) => {
          reject(e);
        },
        { once: true }
      );
    });
  });

  const results = await Promise.all(imgLoadPromises);
  return results.every((r) => r === true);
};
