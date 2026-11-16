import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { NewTaskInput, Task, TaskFilter } from '../types/task';
import { createId } from '../utils/id';
import { selectVisible } from '../utils/sort';
import { AsyncStorage, STORAGE_VERSION, TASK_STORAGE_KEY } from './storage';

export interface TaskState {
  tasks: Task[];
  /** 列表篩選維度（UI 態，不持久化） */
  filter: TaskFilter;
  /** 是否已完成從本機儲存恢復。false 時 UI 顯示載入態，避免空列表閃爍 */
  hydrated: boolean;

  addTask: (input: NewTaskInput) => string;
  updateTask: (
    id: string,
    patch: Partial<Pick<Task, 'title' | 'notes' | 'priority'>>,
  ) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  setFilter: (filter: TaskFilter) => void;
  /** 上移 / 下移。只在同組（未完成組內部、已完成組內部）相鄰任務間移動 */
  moveTask: (id: string, direction: 'up' | 'down') => void;
  clearCompleted: () => void;
  setHydrated: (hydrated: boolean) => void;
}

/** 持久化到 AsyncStorage 的部分：只有任務資料 */
type PersistedTaskState = Pick<TaskState, 'tasks'>;

/**
 * 任務 store。
 *
 * 用 Zustand 而非 Redux：待辦列表沒有跨頁面共享的複雜 action 鏈，
 * hooks 直讀直寫更直觀；`persist` 中間件自動落盤，不需要手寫保存邏輯。
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
          // 新任務排在最上方：order 取當前最小值減一。
          // （排序規則裡 status 優先於 order，所以未完成的新任務會落在未完成組頂部）
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
              // 重新打開：清除完成時間
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
          // 按「使用者當前看到的篩選檢視」移動，而不是全量列表。
          // 否則在「已完成」篩選下，上移會撞上未完成任務而被邊界檢查攔掉。
          const visible = selectVisible(state.tasks, state.filter);
          const index = visible.findIndex(task => task.id === id);
          if (index === -1) {
            return state;
          }

          const target = index + (direction === 'up' ? -1 : 1);
          if (target < 0 || target >= visible.length) {
            return state;
          }

          // 不允許跨越「未完成 / 已完成」分組邊界
          if (visible[target].status !== visible[index].status) {
            return state;
          }

          const next = [...visible];
          const [moved] = next.splice(index, 1);
          next.splice(target, 0, moved);

          // 為可見的這一組重新編號 order。
          // 因為排序先比較 status、再比較 order，兩個分組可以各自獨立編號，
          // 不會互相干擾。
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
      // 只持久化 tasks，filter 等純 UI 態不落盤
      partialize: state => ({ tasks: state.tasks }),
      // 結構變更時在這裡做升級。當前只有 v1，原樣透傳；
      // 將來若改欄位結構，按 persistedState.version 寫分支轉換即可。
      migrate: persistedState => persistedState as PersistedTaskState,
      onRehydrateStorage: () => state => {
        state?.setHydrated(true);
      },
    },
  ),
);

/** 測試用：讀取當前 state（不訂閱） */
export function getTaskState(): TaskState {
  return useTaskStore.getState();
}
