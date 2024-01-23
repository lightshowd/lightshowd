export function processImage(img: HTMLImageElement) {
  const { innerWidth } = window;
  let canvas = document.createElement('canvas');
  const scale = innerWidth / img.naturalWidth;
  canvas.width = innerWidth;
  canvas.height = img.naturalHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function processImagePaste(e, callback) {
  // @ts-ignore
  const dT = e.clipboardData || window.clipboardData;

  const file = dT.items[dT.items.length - 1];
  var blob = file.getAsFile();

  try {
    const blobUrl = window.URL.createObjectURL(blob);
    const img = new Image();
    img.src = blobUrl;

    img.addEventListener('load', () => {
      window.URL.revokeObjectURL(blobUrl);

      const canvas = processImage(img);

      canvas.toBlob(
        (blob) => {
          const reader = new FileReader();
          reader.addEventListener('load', () => {
            const { width, height } = canvas;
            callback(null, { width, height, src: reader.result });
          });

          reader.readAsDataURL(blob);

          // Handle the compressed image
        },
        'image/jpeg',
        '0.75'
      );
    });
  } catch (e) {
    callback(e);
  }
}
