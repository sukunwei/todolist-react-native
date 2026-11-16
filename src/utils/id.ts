/**
 * 唯一 ID 生成。
 *
 * 用「時間戳 + 自增計數」而非隨機數：同一毫秒內創建多個任務也不會碰撞，
 * 而且測試裡是可預測的（便於斷言）。
 */

let counter = 0;

export function createId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}

/** 僅供測試使用：重置自增計數 */
export function resetIdCounter(): void {
  counter = 0;
}
