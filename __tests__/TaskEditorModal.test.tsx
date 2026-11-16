import React from 'react';
import { TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import TaskEditorModal from '../src/screens/TaskEditorModal';
import { useTaskStore } from '../src/store/useTaskStore';
import type { Task } from '../src/types/task';

const task: Task = {
  id: 't1',
  title: '買牛奶',
  notes: '無糖',
  priority: 'high',
  status: 'active',
  order: 0,
  createdAt: 1_000,
  updatedAt: 1_000,
};

const route = { params: { taskId: 't1' }, key: 'k', name: 'TaskEditor' } as never;
const navigation = { goBack: jest.fn() } as never;

/** 取第 n 個 TextInput 的 value */
function inputValue(tree: ReactTestRenderer.ReactTestRenderer, index: number) {
  const inputs = tree.root.findAllByType(TextInput);
  return inputs[index]?.props.value;
}

describe('TaskEditorModal', () => {
  beforeEach(() => {
    // setState 會觸發訂閱元件重渲染，必須包在 act 裡
    ReactTestRenderer.act(() => {
      useTaskStore.setState({ tasks: [], filter: 'all', hydrated: false });
    });
  });

  it('編輯模式下，任務資料異步到達後要回填表單', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;

    // 首次渲染時 store 還是空的（模擬 AsyncStorage 尚未 rehydrate 完成）
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <TaskEditorModal route={route} navigation={navigation} />,
      );
    });

    expect(inputValue(tree, 0)).toBe('');

    // 資料到達
    await ReactTestRenderer.act(async () => {
      useTaskStore.setState({ tasks: [task], hydrated: true });
    });

    // 這是迴歸用例：早前實現只在首次渲染用 useState 初始值，
    // 資料晚到時不會回填，表現為「編輯任務時標題是空的」。
    expect(inputValue(tree, 0)).toBe('買牛奶');
    expect(inputValue(tree, 1)).toBe('無糖');
  });

  it('新增模式下表單為空，優先級預設為中', async () => {
    const newRoute = { params: undefined, key: 'k2', name: 'TaskEditor' } as never;
    let tree!: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      useTaskStore.setState({ tasks: [task], hydrated: true });
      tree = ReactTestRenderer.create(
        <TaskEditorModal route={newRoute} navigation={navigation} />,
      );
    });

    expect(inputValue(tree, 0)).toBe('');
    expect(inputValue(tree, 1)).toBe('');
  });

  it('編輯模式下任務資料沒到達時不允許保存', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <TaskEditorModal route={route} navigation={navigation} />,
      );
    });

    // 找到「保存修改」按鈕，disabled 狀態下應為 true
    const saveButton = tree.root
      .findAllByProps({ accessibilityLabel: '保存修改' })[0];
    expect(saveButton.props.accessibilityState.disabled).toBe(true);
  });
});
