/**
 * 任務（Task）領域模型。
 *
 * 所有類型都保持「結構化 + 可序列化」，這樣整個 tasks 數組可以原樣存進
 * AsyncStorage，不需要額外的序列化層。
 */

export type Priority = 'high' | 'medium' | 'low';

export type TaskStatus = 'active' | 'done';

/** 列表篩選維度 */
export type TaskFilter = 'all' | 'active' | 'done';

export interface Task {
  id: string;
  title: string;
  notes?: string;
  /** 優先級，恆有值，預設 'medium'——不存 undefined，避免排序時出現空洞 */
  priority: Priority;
  status: TaskStatus;
  /**
   * 排序鍵，升序（值越小越靠上）。
   *
   * 渲染順序規則見 `src/utils/sort.ts`：先按 status 分組（已完成永遠沉底），
   * 組內按 order 升序，order 相同時再按優先級、創建時間兜底。
   */
  order: number;
  /** epoch ms */
  createdAt: number;
  updatedAt: number;
  /** 完成時間；重新打開任務時清除 */
  completedAt?: number;
}

/** 新增任務的入參 */
export interface NewTaskInput {
  title: string;
  notes?: string;
  priority?: Priority;
}

/** 優先級對應的權重，數值越小越優先 */
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};
