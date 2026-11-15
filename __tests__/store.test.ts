import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTaskStore } from '../src/store/useTaskStore';
import type { Task } from '../src/types/task';
import { selectVisible } from '../src/utils/sort';

const store = () => useTaskStore.getState();

/** 直接塞任务，绕开 addTask 的 order 分配逻辑 */
function seed(tasks: Task[]) {
  useTaskStore.setState({ tasks, filter: 'all', hydrated: true });
}

describe('task store', () => {
  beforeEach(async () => {
    // 先让 persist 的 rehydrate 完成，避免它随后把状态覆盖回空数组
    await AsyncStorage.clear();
    useTaskStore.setState({ tasks: [], filter: 'all', hydrated: true });
  });

  describe('addTask', () => {
    it('创建任务并去掉标题首尾空白', () => {
      const id = store().addTask({ title: '  买牛奶  ' });

      const task = store().tasks.find(t => t.id === id);
      expect(task?.title).toBe('买牛奶');
    });

    it('默认优先级为 medium，状态为 active', () => {
      const id = store().addTask({ title: '买牛奶' });

      const task = store().tasks.find(t => t.id === id);
      expect(task?.priority).toBe('medium');
      expect(task?.status).toBe('active');
    });

    it('标题为空时拒绝创建', () => {
      const id = store().addTask({ title: '   ' });

      expect(id).toBe('');
      expect(store().tasks).toHaveLength(0);
    });

    it('新任务的 order 小于已有任务，从而排在最上方', () => {
      const first = store().addTask({ title: '第一条' });
      const second = store().addTask({ title: '第二条' });

      const tasks = store().tasks;
      expect(tasks.find(t => t.id === second)!.order).toBeLessThan(
        tasks.find(t => t.id === first)!.order,
      );
      expect(selectVisible(tasks, 'active').map(t => t.title)).toEqual([
        '第二条',
        '第一条',
      ]);
    });
  });

  describe('toggleTask', () => {
    it('标记完成时写入 completedAt', () => {
      const id = store().addTask({ title: '买牛奶' });

      store().toggleTask(id);

      const task = store().tasks[0];
      expect(task.status).toBe('done');
      expect(task.completedAt).toBeGreaterThan(0);
    });

    it('取消完成时清除 completedAt', () => {
      const id = store().addTask({ title: '买牛奶' });

      store().toggleTask(id);
      store().toggleTask(id);

      const task = store().tasks[0];
      expect(task.status).toBe('active');
      expect(task.completedAt).toBeUndefined();
    });
  });

  describe('updateTask', () => {
    it('更新标题、备注与优先级', () => {
      const id = store().addTask({ title: '买牛奶' });

      store().updateTask(id, { title: '买豆浆', notes: '无糖', priority: 'high' });

      const task = store().tasks[0];
      expect(task.title).toBe('买豆浆');
      expect(task.notes).toBe('无糖');
      expect(task.priority).toBe('high');
    });

    it('清空备注时写成 undefined 而不是空字符串', () => {
      const id = store().addTask({ title: '买牛奶', notes: '原来的' });

      store().updateTask(id, { notes: '   ' });

      expect(store().tasks[0].notes).toBeUndefined();
    });
  });

  describe('deleteTask', () => {
    it('删除指定任务', () => {
      const id = store().addTask({ title: '买牛奶' });
      store().addTask({ title: '写代码' });

      store().deleteTask(id);

      expect(store().tasks.map(t => t.title)).toEqual(['写代码']);
    });
  });

  describe('clearCompleted', () => {
    it('只清除已完成的任务', () => {
      const done = store().addTask({ title: '已完成' });
      store().addTask({ title: '未完成' });
      store().toggleTask(done);

      store().clearCompleted();

      expect(store().tasks.map(t => t.title)).toEqual(['未完成']);
    });
  });

  describe('moveTask', () => {
    function seedThree() {
      seed([
        {
          id: 'a',
          title: 'A',
          priority: 'medium',
          status: 'active',
          order: 0,
          createdAt: 1,
          updatedAt: 1,
        },
        {
          id: 'b',
          title: 'B',
          priority: 'medium',
          status: 'active',
          order: 1,
          createdAt: 2,
          updatedAt: 2,
        },
        {
          id: 'c',
          title: 'C',
          priority: 'medium',
          status: 'active',
          order: 2,
          createdAt: 3,
          updatedAt: 3,
        },
      ]);
    }

    it('上移与相邻任务交换顺序', () => {
      seedThree();

      store().moveTask('b', 'up');

      expect(selectVisible(store().tasks, 'all').map(t => t.id)).toEqual([
        'b',
        'a',
        'c',
      ]);
    });

    it('下移与相邻任务交换顺序', () => {
      seedThree();

      store().moveTask('b', 'down');

      expect(selectVisible(store().tasks, 'all').map(t => t.id)).toEqual([
        'a',
        'c',
        'b',
      ]);
    });

    it('已经在最上方时上移是空操作', () => {
      seedThree();

      store().moveTask('a', 'up');

      expect(selectVisible(store().tasks, 'all').map(t => t.id)).toEqual([
        'a',
        'b',
        'c',
      ]);
    });

    it('已经在最下方时下移是空操作', () => {
      seedThree();

      store().moveTask('c', 'down');

      expect(selectVisible(store().tasks, 'all').map(t => t.id)).toEqual([
        'a',
        'b',
        'c',
      ]);
    });

    it('不允许跨越「未完成 / 已完成」分组边界', () => {
      seed([
        {
          id: 'active1',
          title: '未完成',
          priority: 'medium',
          status: 'active',
          order: 0,
          createdAt: 1,
          updatedAt: 1,
        },
        {
          id: 'done1',
          title: '已完成',
          priority: 'medium',
          status: 'done',
          order: 1,
          createdAt: 2,
          updatedAt: 2,
        },
      ]);

      store().moveTask('done1', 'up');

      // 仍然是「未完成在前，已完成在后」，没有被移动到未完成组
      expect(selectVisible(store().tasks, 'all').map(t => t.id)).toEqual([
        'active1',
        'done1',
      ]);
    });

    it('在「已完成」筛选下依然可以下移（按可见视图移动）', () => {
      seed([
        {
          id: 'active1',
          title: '未完成',
          priority: 'medium',
          status: 'active',
          order: 0,
          createdAt: 1,
          updatedAt: 1,
        },
        {
          id: 'done1',
          title: '已完成1',
          priority: 'medium',
          status: 'done',
          order: 1,
          createdAt: 2,
          updatedAt: 2,
        },
        {
          id: 'done2',
          title: '已完成2',
          priority: 'medium',
          status: 'done',
          order: 2,
          createdAt: 3,
          updatedAt: 3,
        },
      ]);
      store().setFilter('done');

      store().moveTask('done1', 'down');

      expect(selectVisible(store().tasks, 'done').map(t => t.id)).toEqual([
        'done2',
        'done1',
      ]);
    });
  });

  describe('持久化', () => {
    it('只序列化 tasks，不包含 filter 等 UI 态', async () => {
      const id = store().addTask({ title: '买牛奶' });
      store().setFilter('done');

      // persist 中间件是异步写入的，等一个微任务让写盘完成
      await Promise.resolve();
      await Promise.resolve();

      const raw = await AsyncStorage.getItem('@todolist/tasks/v1');
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw as string);
      expect(parsed.state.tasks).toHaveLength(1);
      expect(parsed.state.tasks[0].id).toBe(id);
      expect(parsed.state.filter).toBeUndefined();
    });
  });
});
