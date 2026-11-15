/**
 * 任务（Task）领域模型。
 *
 * 所有类型都保持「结构化 + 可序列化」，这样整个 tasks 数组可以原样存进
 * AsyncStorage，不需要额外的序列化层。
 */

export type Priority = 'high' | 'medium' | 'low';

export type TaskStatus = 'active' | 'done';

/** 列表筛选维度 */
export type TaskFilter = 'all' | 'active' | 'done';

export interface Task {
  id: string;
  title: string;
  notes?: string;
  /** 优先级，恒有值，默认 'medium'——不存 undefined，避免排序时出现空洞 */
  priority: Priority;
  status: TaskStatus;
  /**
   * 排序键，升序（值越小越靠上）。
   *
   * 渲染顺序规则见 `src/utils/sort.ts`：先按 status 分组（已完成永远沉底），
   * 组内按 order 升序，order 相同时再按优先级、创建时间兜底。
   */
  order: number;
  /** epoch ms */
  createdAt: number;
  updatedAt: number;
  /** 完成时间；重新打开任务时清除 */
  completedAt?: number;
}

/** 新建任务的入参 */
export interface NewTaskInput {
  title: string;
  notes?: string;
  priority?: Priority;
}

/** 优先级对应的权重，数值越小越优先 */
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
