export function getTimeString(seconds: number) {
  if (seconds === Infinity || isNaN(seconds) || seconds <= 0) {
    return '00:00';
  }
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substring(14, 22);
}
