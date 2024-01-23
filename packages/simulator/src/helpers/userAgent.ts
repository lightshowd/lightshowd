export const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

export const isSafari =
  navigator.userAgent.includes('Safari') &&
  !navigator.userAgent.includes('Chrome');

export const isMobile = window.innerWidth < 600;
