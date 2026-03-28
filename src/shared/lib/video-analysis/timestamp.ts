const TIMESTAMP_RANGE_REGEX =
  /^\[?((?:\d{1,2}:)?\d{1,2}:\d{1,2})-((?:\d{1,2}:)?\d{1,2}:\d{1,2})\]?$/;

export function parseTimestamp(timestamp: string): number | null {
  const match = String(timestamp || '')
    .trim()
    .match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})$/);

  if (!match) return null;

  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    hours < 0 ||
    minutes < 0 ||
    minutes >= 60 ||
    seconds < 0 ||
    seconds >= 60
  ) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

export function formatTimestamp(totalSeconds: number) {
  const safeTotal = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeTotal / 3600);
  const minutes = Math.floor((safeTotal % 3600) / 60);
  const seconds = safeTotal % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatSrtTimestamp(totalSeconds: number) {
  const safeTotal = Math.max(0, totalSeconds);
  const hours = Math.floor(safeTotal / 3600);
  const minutes = Math.floor((safeTotal % 3600) / 60);
  const seconds = Math.floor(safeTotal % 60);
  const milliseconds = Math.floor((safeTotal - Math.floor(safeTotal)) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

export function parseTimestampRange(range: string) {
  const trimmed = String(range || '').trim();
  const match = trimmed.match(TIMESTAMP_RANGE_REGEX);

  if (!match) return null;

  const start = parseTimestamp(match[1]);
  const end = parseTimestamp(match[2]);

  if (start === null || end === null || end <= start) {
    return null;
  }

  return { start, end };
}
