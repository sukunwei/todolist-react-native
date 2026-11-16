import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTaskStore } from '../src/store/useTaskStore';
import type { Task } from '../src/types/task';
import { selectVisible } from '../src/utils/sort';

const store = () => useTaskStore.getState();

/** 直接塞任務，繞開 addTask 的 order 分配邏輯 */
function seed(tasks: Task[]) {
  useTaskStore.setState({ tasks, filter: 'all', hydrated: true });
}

describe('task store', () => {
  beforeEach(async () => {
    // 先讓 persist 的 rehydrate 完成，避免它隨後把狀態覆蓋回空數組
    await AsyncStorage.clear();
    useTaskStore.setState({ tasks: [], filter: 'all', hydrated: true });
  });

  describe('addTask', () => {
    it('創建任務並去掉標題首尾空白', () => {
      const id = store().addTask({ title: '  買牛奶  ' });

      const task = store().tasks.find(t => t.id === id);
      expect(task?.title).toBe('買牛奶');
    });

    it('預設優先級為 medium，狀態為 active', () => {
      const id = store().addTask({ title: '買牛奶' });

      const task = store().tasks.find(t => t.id === id);
      expect(task?.priority).toBe('medium');
      expect(task?.status).toBe('active');
    });

    it('標題為空時拒絕創建', () => {
      const id = store().addTask({ title: '   ' });

      expect(id).toBe('');
      expect(store().tasks).toHaveLength(0);
    });

    it('新任務的 order 小於已有任務，從而排在最上方', () => {
      const first = store().addTask({ title: '第一條' });
      const second = store().addTask({ title: '第二條' });

      const tasks = store().tasks;
      expect(tasks.find(t => t.id === second)!.order).toBeLessThan(
        tasks.find(t => t.id === first)!.order,
      );
      expect(selectVisible(tasks, 'active').map(t => t.title)).toEqual([
        '第二條',
        '第一條',
      ]);
    });
  });

  describe('toggleTask', () => {
    it('標記完成時寫入 completedAt', () => {
      const id = store().addTask({ title: '買牛奶' });

      store().toggleTask(id);

      const task = store().tasks[0];
      expect(task.status).toBe('done');
      expect(task.completedAt).toBeGreaterThan(0);
    });

    it('取消完成時清除 completedAt', () => {
      const id = store().addTask({ title: '買牛奶' });

      store().toggleTask(id);
      store().toggleTask(id);

      const task = store().tasks[0];
      expect(task.status).toBe('active');
      expect(task.completedAt).toBeUndefined();
    });
  });

  describe('updateTask', () => {
    it('更新標題、備註與優先級', () => {
      const id = store().addTask({ title: '買牛奶' });

      store().updateTask(id, { title: '買豆漿', notes: '無糖', priority: 'high' });

      const task = store().tasks[0];
      expect(task.title).toBe('買豆漿');
      expect(task.notes).toBe('無糖');
      expect(task.priority).toBe('high');
    });

    it('清空備註時寫成 undefined 而不是空字元串', () => {
      const id = store().addTask({ title: '買牛奶', notes: '原來的' });

      store().updateTask(id, { notes: '   ' });

      expect(store().tasks[0].notes).toBeUndefined();
    });
  });

  describe('deleteTask', () => {
    it('刪除指定任務', () => {
      const id = store().addTask({ title: '買牛奶' });
      store().addTask({ title: '寫程式碼' });

      store().deleteTask(id);

      expect(store().tasks.map(t => t.title)).toEqual(['寫程式碼']);
    });
  });

  describe('clearCompleted', () => {
    it('只清除已完成的任務', () => {
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

    it('上移與相鄰任務交換順序', () => {
      seedThree();

      store().moveTask('b', 'up');

      expect(selectVisible(store().tasks, 'all').map(t => t.id)).toEqual([
        'b',
        'a',
        'c',
      ]);
    });

    it('下移與相鄰任務交換順序', () => {
      seedThree();

      store().moveTask('b', 'down');

      expect(selectVisible(store().tasks, 'all').map(t => t.id)).toEqual([
        'a',
        'c',
        'b',
      ]);
    });

    it('已經在最上方時上移是空操作', () => {
      seedThree();

      store().moveTask('a', 'up');

      expect(selectVisible(store().tasks, 'all').map(t => t.id)).toEqual([
        'a',
        'b',
        'c',
      ]);
    });

    it('已經在最下方時下移是空操作', () => {
      seedThree();

      store().moveTask('c', 'down');

      expect(selectVisible(store().tasks, 'all').map(t => t.id)).toEqual([
        'a',
        'b',
        'c',
      ]);
    });

    it('不允許跨越「未完成 / 已完成」分組邊界', () => {
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

      // 仍然是「未完成在前，已完成在後」，沒有被移動到未完成組
      expect(selectVisible(store().tasks, 'all').map(t => t.id)).toEqual([
        'active1',
        'done1',
      ]);
    });

    it('在「已完成」篩選下依然可以下移（按可見檢視移動）', () => {
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
    it('只序列化 tasks，不包含 filter 等 UI 態', async () => {
      const id = store().addTask({ title: '買牛奶' });
      store().setFilter('done');

      // persist 中間件是異步寫入的，等一個微任務讓寫盤完成
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
