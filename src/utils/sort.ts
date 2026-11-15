import { PRIORITY_WEIGHT, type Task, type TaskFilter } from '../types/task';

/**
 * 任务排序的权威实现。
 *
 * 规则（与开发计划 §6.2 一致）：
 *   1. 未完成在前，已完成沉底（status 优先于一切）
 *   2. 组内按 order 升序
 *   3. order 相同时，优先级高的在前（high → medium → low）
 *   4. 仍相同时，创建时间新的在前
 *
 * 组件里不要另写排序逻辑，一律调用这里。
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
 * 按筛选维度过滤。空状态的文案分支依赖它，所以放在这里统一处理。
 */
export function filterTasks(tasks: Task[], filter: Task['status'] | 'all'): Task[] {
  if (filter === 'all') {
    return tasks;
  }
  return tasks.filter(task => task.status === filter);
}

/**
 * 列表统计摘要，用于顶部概览条。
 */
export function summarize(tasks: Task[]) {
  const total = tasks.length;
  const done = tasks.filter(task => task.status === 'done').length;
  const active = total - done;
  const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, active, completionRate };
}

/**
 * 筛选 + 排序一步到位。
 *
 * 组件里请用这个函数配合 useMemo，不要把结果直接作为 zustand 的 selector
 * 返回——那样每次 getSnapshot 都会拿到新数组引用，在 zustand v5 + React 18
 * 的 useSyncExternalStore 下会触发无限重渲染。
 */
export function selectVisible(tasks: Task[], filter: TaskFilter): Task[] {
  return sortTasks(filterTasks(tasks, filter));
}
