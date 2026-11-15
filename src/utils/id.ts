/**
 * 唯一 ID 生成。
 *
 * 用「时间戳 + 自增计数」而非随机数：同一毫秒内创建多个任务也不会碰撞，
 * 而且测试里是可预测的（便于断言）。
 */

let counter = 0;

export function createId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}`;
}

/** 仅供测试使用：重置自增计数 */
export function resetIdCounter(): void {
  counter = 0;
}
