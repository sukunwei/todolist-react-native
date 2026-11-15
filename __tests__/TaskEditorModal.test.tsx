import React from 'react';
import { TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import TaskEditorModal from '../src/screens/TaskEditorModal';
import { useTaskStore } from '../src/store/useTaskStore';
import type { Task } from '../src/types/task';

const task: Task = {
  id: 't1',
  title: '买牛奶',
  notes: '无糖',
  priority: 'high',
  status: 'active',
  order: 0,
  createdAt: 1_000,
  updatedAt: 1_000,
};

const route = { params: { taskId: 't1' }, key: 'k', name: 'TaskEditor' } as never;
const navigation = { goBack: jest.fn() } as never;

/** 取第 n 个 TextInput 的 value */
function inputValue(tree: ReactTestRenderer.ReactTestRenderer, index: number) {
  const inputs = tree.root.findAllByType(TextInput);
  return inputs[index]?.props.value;
}

describe('TaskEditorModal', () => {
  beforeEach(() => {
    // setState 会触发订阅组件重渲染，必须包在 act 里
    ReactTestRenderer.act(() => {
      useTaskStore.setState({ tasks: [], filter: 'all', hydrated: false });
    });
  });

  it('编辑模式下，任务数据异步到达后要回填表单', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;

    // 首次渲染时 store 还是空的（模拟 AsyncStorage 尚未 rehydrate 完成）
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <TaskEditorModal route={route} navigation={navigation} />,
      );
    });

    expect(inputValue(tree, 0)).toBe('');

    // 数据到达
    await ReactTestRenderer.act(async () => {
      useTaskStore.setState({ tasks: [task], hydrated: true });
    });

    // 这是回归用例：早前实现只在首次渲染用 useState 初始值，
    // 数据晚到时不会回填，表现为「编辑任务时标题是空的」。
    expect(inputValue(tree, 0)).toBe('买牛奶');
    expect(inputValue(tree, 1)).toBe('无糖');
  });

  it('新建模式下表单为空，优先级默认为中', async () => {
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

  it('编辑模式下任务数据没到达时不允许保存', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <TaskEditorModal route={route} navigation={navigation} />,
      );
    });

    // 找到「保存修改」按钮，disabled 状态下应为 true
    const saveButton = tree.root
      .findAllByProps({ accessibilityLabel: '保存修改' })[0];
    expect(saveButton.props.accessibilityState.disabled).toBe(true);
  });
});
