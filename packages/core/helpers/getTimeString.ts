export function getTimeString(seconds: number) {
  if (!(seconds > 0)) {
    return '00:00';
  }
  const date = new Date(0);
  date.setSeconds(Math.floor(seconds));
  return date.toISOString().substring(14, 19);
}
