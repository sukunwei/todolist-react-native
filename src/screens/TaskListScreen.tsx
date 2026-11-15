import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '../components/EmptyState';
import TaskFilterBar from '../components/TaskFilterBar';
import TaskItem from '../components/TaskItem';
import type { TaskListScreenProps } from '../navigation/types';
import { useTaskStore } from '../store/useTaskStore';
import { useTheme } from '../theme';
import type { Task } from '../types/task';
import { successFeedback, tapFeedback, warningFeedback } from '../utils/haptics';
import { selectVisible, summarize } from '../utils/sort';

/** 任务主列表页 */
export default function TaskListScreen({ navigation }: TaskListScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // 注意：这里只 select 稳定引用（数组本身 / 原始值），
  // 派生列表用 useMemo 计算。若把 useMemo 的结果直接交给 selector，
  // zustand v5 下每次 getSnapshot 都是新引用，会触发无限重渲染。
  const tasks = useTaskStore(state => state.tasks);
  const filter = useTaskStore(state => state.filter);
  const hydrated = useTaskStore(state => state.hydrated);

  const setFilter = useTaskStore(state => state.setFilter);
  const toggleTask = useTaskStore(state => state.toggleTask);
  const deleteTask = useTaskStore(state => state.deleteTask);
  const moveTask = useTaskStore(state => state.moveTask);
  const clearCompleted = useTaskStore(state => state.clearCompleted);

  const visible = useMemo(() => selectVisible(tasks, filter), [tasks, filter]);
  const stats = useMemo(() => summarize(tasks), [tasks]);

  const counts = useMemo(
    () => ({ all: tasks.length, active: stats.active, done: stats.done }),
    [tasks.length, stats.active, stats.done],
  );

  const handleDelete = useCallback(
    (task: Task) => {
      Alert.alert(
        '删除任务',
        `确定要删除「${task.title}」吗？此操作无法撤销。`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '删除',
            style: 'destructive',
            onPress: () => {
              deleteTask(task.id);
              warningFeedback();
            },
          },
        ],
      );
    },
    [deleteTask],
  );

  const handleClearCompleted = useCallback(() => {
    Alert.alert(
      '清除已完成',
      `确定要清除全部 ${stats.done} 项已完成的任务吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清除',
          style: 'destructive',
          onPress: () => {
            clearCompleted();
            successFeedback();
          },
        },
      ],
    );
  }, [clearCompleted, stats.done]);

  const renderItem = useCallback(
    ({ item, index }: { item: Task; index: number }) => {
      const prev = visible[index - 1];
      const next = visible[index + 1];

      return (
        <TaskItem
          task={item}
          canMoveUp={!!prev && prev.status === item.status}
          canMoveDown={!!next && next.status === item.status}
          onToggle={() => {
            toggleTask(item.id);
            tapFeedback();
          }}
          onEdit={() => navigation.navigate('TaskEditor', { taskId: item.id })}
          onDelete={() => handleDelete(item)}
          onMoveUp={() => {
            moveTask(item.id, 'up');
            tapFeedback();
          }}
          onMoveDown={() => {
            moveTask(item.id, 'down');
            tapFeedback();
          }}
        />
      );
    },
    [visible, toggleTask, moveTask, navigation, handleDelete],
  );

  const renderEmpty = useCallback(
    () => (hydrated ? <EmptyState filter={filter} onCreate={() => navigation.navigate('TaskEditor')} /> : null),
    [hydrated, filter, navigation],
  );

  const renderFooter = useCallback(
    () =>
      stats.done > 0 ? (
        <Pressable
          onPress={handleClearCompleted}
          accessibilityRole="button"
          accessibilityLabel={`清除全部 ${stats.done} 项已完成的任务`}
          style={({ pressed }) => [
            styles.clearButton,
            {
              borderColor: theme.colors.border,
              opacity: pressed ? 0.6 : 1,
            },
          ]}>
          <Text style={[styles.clearText, { color: theme.colors.textSecondary }]}>
            清除已完成（{stats.done}）
          </Text>
        </Pressable>
      ) : null,
    [stats.done, handleClearCompleted, theme.colors.border, theme.colors.textSecondary],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>待办清单</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          共 {stats.total} 项 · 待办 {stats.active} 项 · 完成率 {stats.completionRate}%
        </Text>
      </View>

      <TaskFilterBar filter={filter} counts={counts} onChange={setFilter} />

      <FlatList
        data={visible}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        onPress={() => navigation.navigate('TaskEditor')}
        accessibilityRole="button"
        accessibilityLabel="新建任务"
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.colors.primary,
            bottom: insets.bottom + 24,
            shadowColor: theme.colors.fabShadow,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}>
        <Text style={[styles.fabGlyph, { color: theme.colors.onPrimary }]}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  clearButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
  },
  clearText: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabGlyph: {
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 32,
  },
});
