import { selectVisible, sortTasks, summarize } from '../src/utils/sort';
import type { Task } from '../src/types/task';

function makeTask(partial: Partial<Task> & { id: string }): Task {
  return {
    title: partial.id,
    notes: undefined,
    priority: 'medium',
    status: 'active',
    order: 0,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...partial,
  };
}

describe('sortTasks', () => {
  it('未完成的任務排在已完成之前', () => {
    const done = makeTask({ id: 'done', status: 'done', order: 0 });
    const active = makeTask({ id: 'active', status: 'active', order: 5 });

    const sorted = sortTasks([done, active]);

    expect(sorted.map(t => t.id)).toEqual(['active', 'done']);
  });

  it('同組內按 order 升序', () => {
    const a = makeTask({ id: 'a', order: 2 });
    const b = makeTask({ id: 'b', order: 1 });
    const c = makeTask({ id: 'c', order: 3 });

    expect(sortTasks([a, b, c]).map(t => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('order 相同時按優先級（高 → 中 → 低）', () => {
    const low = makeTask({ id: 'low', order: 1, priority: 'low' });
    const high = makeTask({ id: 'high', order: 1, priority: 'high' });
    const medium = makeTask({ id: 'medium', order: 1, priority: 'medium' });

    expect(sortTasks([low, high, medium]).map(t => t.id)).toEqual([
      'high',
      'medium',
      'low',
    ]);
  });

  it('order 與優先級都相同時按創建時間倒序', () => {
    const older = makeTask({ id: 'older', order: 1, createdAt: 100 });
    const newer = makeTask({ id: 'newer', order: 1, createdAt: 200 });

    expect(sortTasks([older, newer]).map(t => t.id)).toEqual(['newer', 'older']);
  });

  it('不修改傳入的數組', () => {
    const original = [makeTask({ id: 'b', order: 2 }), makeTask({ id: 'a', order: 1 })];
    const snapshot = original.map(t => t.id);

    sortTasks(original);

    expect(original.map(t => t.id)).toEqual(snapshot);
  });
});

describe('selectVisible', () => {
  const tasks = [
    makeTask({ id: 'a1', status: 'active', order: 1 }),
    makeTask({ id: 'a2', status: 'active', order: 2 }),
    makeTask({ id: 'd1', status: 'done', order: 3 }),
  ];

  it('篩選 all 返回全部並排序', () => {
    expect(selectVisible(tasks, 'all').map(t => t.id)).toEqual(['a1', 'a2', 'd1']);
  });

  it('篩選 active 只返回未完成', () => {
    expect(selectVisible(tasks, 'active').map(t => t.id)).toEqual(['a1', 'a2']);
  });

  it('篩選 done 只返回已完成', () => {
    expect(selectVisible(tasks, 'done').map(t => t.id)).toEqual(['d1']);
  });
});

describe('summarize', () => {
  it('空列表的完成率為 0 而不是 NaN', () => {
    expect(summarize([])).toEqual({
      total: 0,
      done: 0,
      active: 0,
      completionRate: 0,
    });
  });

  it('正確統計各狀態數量與完成率', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'active' }),
      makeTask({ id: 'b', status: 'done' }),
      makeTask({ id: 'c', status: 'done' }),
    ];

    expect(summarize(tasks)).toEqual({
      total: 3,
      done: 2,
      active: 1,
      completionRate: 67,
    });
  });
});
