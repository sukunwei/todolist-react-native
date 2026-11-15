import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { TaskEditorScreenProps } from '../navigation/types';
import { useTaskStore } from '../store/useTaskStore';
import { useTheme } from '../theme';
import { PRIORITY_LABEL, type Priority } from '../types/task';
import { successFeedback } from '../utils/haptics';

const MAX_TITLE_LENGTH = 100;

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

/**
 * 新建 / 编辑任务弹窗。
 *
 * 两种模式复用同一个组件：带 taskId 就是编辑，不带就是新建。
 */
export default function TaskEditorModal({ navigation, route }: TaskEditorScreenProps) {
  const theme = useTheme();
  const taskId = route.params?.taskId;

  const tasks = useTaskStore(state => state.tasks);
  const addTask = useTaskStore(state => state.addTask);
  const updateTask = useTaskStore(state => state.updateTask);

  const existing = useMemo(
    () => (taskId ? tasks.find(task => task.id === taskId) : undefined),
    [tasks, taskId],
  );

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [showValidation, setShowValidation] = useState(false);

  /**
   * 预填表单。
   *
   * 不能只靠 useState 的初始值：任务数据是从 AsyncStorage 异步 rehydrate 回来的，
   * 本组件挂载时 tasks 往往还是空的，初始值会写成空字符串，之后数据到了也不会
   * 再更新——表现为「编辑任务时标题是空的」，保存后就把原内容清掉了。
   * 所以这里在数据到达时补一次初始化，且每个任务只补一次。
   */
  const initializedTaskId = useRef<string | null>(null);
  useEffect(() => {
    if (existing && initializedTaskId.current !== existing.id) {
      initializedTaskId.current = existing.id;
      setTitle(existing.title);
      setNotes(existing.notes ?? '');
      setPriority(existing.priority);
    }
  }, [existing]);

  // 是否编辑态以路由参数为准：params 立即可用，而 tasks 要等 rehydrate。
  // 用 existing 判断会让标题在数据到达前短暂显示成「新建任务」。
  const isEditing = !!taskId;

  const trimmedTitle = title.trim();
  // 编辑态下必须等任务数据到达才能保存，否则会被误当成新建而插一条重复任务
  const canSave =
    trimmedTitle.length > 0 &&
    trimmedTitle.length <= MAX_TITLE_LENGTH &&
    (!isEditing || !!existing);

  const handleSave = () => {
    if (!canSave) {
      setShowValidation(true);
      return;
    }
    if (existing) {
      updateTask(existing.id, { title: trimmedTitle, notes, priority });
    } else {
      addTask({ title: trimmedTitle, notes, priority });
    }
    successFeedback();
    navigation.goBack();
  };

  const priorityColor = (value: Priority) =>
    value === 'high'
      ? theme.colors.high
      : value === 'medium'
        ? theme.colors.medium
        : theme.colors.low;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>任务内容</Text>
        <TextInput
          value={title}
          onChangeText={value => {
            setTitle(value);
            if (showValidation) {
              setShowValidation(false);
            }
          }}
          placeholder="要做什么？"
          placeholderTextColor={theme.colors.textTertiary}
          maxLength={MAX_TITLE_LENGTH}
          autoFocus
          multiline
          accessibilityLabel="任务内容"
          style={[
            styles.titleInput,
            {
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
              borderColor:
                showValidation && !canSave ? theme.colors.danger : theme.colors.border,
            },
          ]}
        />
        <View style={styles.counterRow}>
          {showValidation && !canSave ? (
            <Text style={[styles.error, { color: theme.colors.danger }]}>
              请输入任务内容
            </Text>
          ) : (
            <View />
          )}
          <Text style={[styles.counter, { color: theme.colors.textTertiary }]}>
            {title.length}/{MAX_TITLE_LENGTH}
          </Text>
        </View>

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>优先级</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map(value => {
            const selected = value === priority;
            const color = priorityColor(value);
            return (
              <Pressable
                key={value}
                onPress={() => setPriority(value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`优先级${PRIORITY_LABEL[value]}`}
                style={[
                  styles.priorityChip,
                  {
                    borderColor: selected ? color : theme.colors.border,
                    backgroundColor: selected ? color : 'transparent',
                  },
                ]}>
                <Text
                  style={[
                    styles.priorityText,
                    { color: selected ? theme.colors.onPrimary : theme.colors.textSecondary },
                  ]}>
                  {PRIORITY_LABEL[value]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>备注（可选）</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="补充说明"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          accessibilityLabel="备注"
          style={[
            styles.notesInput,
            {
              color: theme.colors.text,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        />

        <Pressable
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel={isEditing ? '保存修改' : '创建任务'}
          accessibilityState={{ disabled: !canSave }}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: canSave ? (pressed ? 0.85 : 1) : 0.4,
            },
          ]}>
          <Text style={[styles.saveText, { color: theme.colors.onPrimary }]}>
            {isEditing ? '保存修改' : '创建任务'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 20,
  },
  titleInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    minHeight: 18,
  },
  error: {
    fontSize: 12,
  },
  counter: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  priorityRow: {
    flexDirection: 'row',
  },
  priorityChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  priorityText: {
    fontSize: 15,
    fontWeight: '600',
  },
  notesInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 28,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
