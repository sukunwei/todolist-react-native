import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { NewTaskInput, Task, TaskFilter } from '../types/task';
import { createId } from '../utils/id';
import { selectVisible } from '../utils/sort';
import { AsyncStorage, STORAGE_VERSION, TASK_STORAGE_KEY } from './storage';

export interface TaskState {
  tasks: Task[];
  /** 列表筛选维度（UI 态，不持久化） */
  filter: TaskFilter;
  /** 是否已完成从本地存储恢复。false 时 UI 显示加载态，避免空列表闪烁 */
  hydrated: boolean;

  addTask: (input: NewTaskInput) => string;
  updateTask: (
    id: string,
    patch: Partial<Pick<Task, 'title' | 'notes' | 'priority'>>,
  ) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  setFilter: (filter: TaskFilter) => void;
  /** 上移 / 下移。只在同组（未完成组内部、已完成组内部）相邻任务间移动 */
  moveTask: (id: string, direction: 'up' | 'down') => void;
  clearCompleted: () => void;
  setHydrated: (hydrated: boolean) => void;
}

/** 持久化到 AsyncStorage 的部分：只有任务数据 */
type PersistedTaskState = Pick<TaskState, 'tasks'>;

/**
 * 任务 store。
 *
 * 用 Zustand 而非 Redux：待办列表没有跨页面共享的复杂 action 链，
 * hooks 直读直写更直观；`persist` 中间件自动落盘，不需要手写保存逻辑。
 */
export const useTaskStore = create<TaskState>()(
  persist<TaskState, [], [], PersistedTaskState>(
    (set) => ({
      tasks: [],
      filter: 'all',
      hydrated: false,

      addTask: input => {
        const now = Date.now();
        const id = createId();
        const title = input.title.trim();

        if (!title) {
          return '';
        }

        set(state => {
          // 新任务排在最上方：order 取当前最小值减一。
          // （排序规则里 status 优先于 order，所以未完成的新任务会落在未完成组顶部）
          const minOrder = state.tasks.length
            ? Math.min(...state.tasks.map(task => task.order))
            : 0;

          const task: Task = {
            id,
            title,
            notes: input.notes?.trim() || undefined,
            priority: input.priority ?? 'medium',
            status: 'active',
            order: minOrder - 1,
            createdAt: now,
            updatedAt: now,
          };

          return { ...state, tasks: [...state.tasks, task] };
        });

        return id;
      },

      updateTask: (id, patch) =>
        set(state => ({
          ...state,
          tasks: state.tasks.map(task => {
            if (task.id !== id) {
              return task;
            }
            const next: Task = { ...task, updatedAt: Date.now() };
            if (patch.title !== undefined) {
              next.title = patch.title.trim();
            }
            if (patch.notes !== undefined) {
              next.notes = patch.notes.trim() || undefined;
            }
            if (patch.priority !== undefined) {
              next.priority = patch.priority;
            }
            return next;
          }),
        })),

      deleteTask: id =>
        set(state => ({
          ...state,
          tasks: state.tasks.filter(task => task.id !== id),
        })),

      toggleTask: id =>
        set(state => ({
          ...state,
          tasks: state.tasks.map(task => {
            if (task.id !== id) {
              return task;
            }
            const now = Date.now();
            if (task.status === 'done') {
              // 重新打开：清除完成时间
              const next: Task = { ...task, status: 'active', updatedAt: now };
              delete next.completedAt;
              return next;
            }
            return { ...task, status: 'done', completedAt: now, updatedAt: now };
          }),
        })),

      setFilter: filter => set(state => ({ ...state, filter })),

      moveTask: (id, direction) =>
        set(state => {
          // 按「用户当前看到的筛选视图」移动，而不是全量列表。
          // 否则在「已完成」筛选下，上移会撞上未完成任务而被边界检查拦掉。
          const visible = selectVisible(state.tasks, state.filter);
          const index = visible.findIndex(task => task.id === id);
          if (index === -1) {
            return state;
          }

          const target = index + (direction === 'up' ? -1 : 1);
          if (target < 0 || target >= visible.length) {
            return state;
          }

          // 不允许跨越「未完成 / 已完成」分组边界
          if (visible[target].status !== visible[index].status) {
            return state;
          }

          const next = [...visible];
          const [moved] = next.splice(index, 1);
          next.splice(target, 0, moved);

          // 为可见的这一组重新编号 order。
          // 因为排序先比较 status、再比较 order，两个分组可以各自独立编号，
          // 不会互相干扰。
          const base = Math.min(...visible.map(task => task.order));
          const orderById = new Map<string, number>();
          next.forEach((task, i) => orderById.set(task.id, base + i));

          const now = Date.now();
          const tasks = state.tasks.map(task => {
            const order = orderById.get(task.id);
            if (order === undefined) {
              return task;
            }
            return {
              ...task,
              order,
              updatedAt: task.id === moved.id ? now : task.updatedAt,
            };
          });

          return { ...state, tasks };
        }),

      clearCompleted: () =>
        set(state => ({
          ...state,
          tasks: state.tasks.filter(task => task.status !== 'done'),
        })),

      setHydrated: hydrated => set(state => ({ ...state, hydrated })),
    }),
    {
      name: TASK_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: STORAGE_VERSION,
      // 只持久化 tasks，filter 等纯 UI 态不落盘
      partialize: state => ({ tasks: state.tasks }),
      // 结构变更时在这里做升级。当前只有 v1，原样透传；
      // 将来若改字段结构，按 persistedState.version 写分支转换即可。
      migrate: persistedState => persistedState as PersistedTaskState,
      onRehydrateStorage: () => state => {
        state?.setHydrated(true);
      },
    },
  ),
);

/** 测试用：读取当前 state（不订阅） */
export function getTaskState(): TaskState {
  return useTaskStore.getState();
}
