/**
 * 相對時間格式化，用於任務行下方的「3 分鐘前」這類輔助文案。
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diff = now - timestamp;

  if (diff < MINUTE) {
    return '剛剛';
  }
  if (diff < HOUR) {
    return `${Math.floor(diff / MINUTE)} 分鐘前`;
  }
  if (diff < DAY) {
    return `${Math.floor(diff / HOUR)} 小時前`;
  }
  if (diff < 30 * DAY) {
    return `${Math.floor(diff / DAY)} 天前`;
  }
  return formatDate(timestamp);
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${date.getFullYear()}/${month}/${day}`;
}
