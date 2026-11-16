import { PRIORITY_WEIGHT, type Task, type TaskFilter } from '../types/task';

/**
 * 任務排序的權威實現。
 *
 * 規則（與開發計劃 §6.2 一致）：
 *   1. 未完成在前，已完成沉底（status 優先於一切）
 *   2. 組內按 order 升序
 *   3. order 相同時，優先級高的在前（high → medium → low）
 *   4. 仍相同時，創建時間新的在前
 *
 * 元件裡不要另寫排序邏輯，一律調用這裡。
 */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'active' ? -1 : 1;
    }
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    const weightDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (weightDiff !== 0) {
      return weightDiff;
    }
    return b.createdAt - a.createdAt;
  });
}

/**
 * 按篩選維度過濾。空狀態的文案分支依賴它，所以放在這裡統一處理。
 */
export function filterTasks(tasks: Task[], filter: Task['status'] | 'all'): Task[] {
  if (filter === 'all') {
    return tasks;
  }
  return tasks.filter(task => task.status === filter);
}

/**
 * 列表統計摘要，用於頂部概覽條。
 */
export function summarize(tasks: Task[]) {
  const total = tasks.length;
  const done = tasks.filter(task => task.status === 'done').length;
  const active = total - done;
  const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, active, completionRate };
}

/**
 * 篩選 + 排序一步到位。
 *
 * 元件裡請用這個函數配合 useMemo，不要把結果直接作為 zustand 的 selector
 * 返回——那樣每次 getSnapshot 都會拿到新數組引用，在 zustand v5 + React 18
 * 的 useSyncExternalStore 下會觸發無限重渲染。
 */
export function selectVisible(tasks: Task[], filter: TaskFilter): Task[] {
  return sortTasks(filterTasks(tasks, filter));
}
