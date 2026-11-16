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
 * 新增 / 編輯任務彈出視窗。
 *
 * 兩種模式複用同一個元件：帶 taskId 就是編輯，不帶就是新增。
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
   * 預填表單。
   *
   * 不能只靠 useState 的初始值：任務資料是從 AsyncStorage 異步 rehydrate 回來的，
   * 本元件掛載時 tasks 往往還是空的，初始值會寫成空字元串，之後資料到了也不會
   * 再更新——表現為「編輯任務時標題是空的」，保存後就把原內容清掉了。
   * 所以這裡在資料到達時補一次初始化，且每個任務只補一次。
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

  // 是否編輯態以路由參數為準：params 立即可用，而 tasks 要等 rehydrate。
  // 用 existing 判斷會讓標題在資料到達前短暫顯示成「新增任務」。
  const isEditing = !!taskId;

  const trimmedTitle = title.trim();
  // 編輯態下必須等任務資料到達才能保存，否則會被誤當成新增而插一條重複任務
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
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>任務內容</Text>
        <TextInput
          value={title}
          onChangeText={value => {
            setTitle(value);
            if (showValidation) {
              setShowValidation(false);
            }
          }}
          placeholder="要做什麼？"
          placeholderTextColor={theme.colors.textTertiary}
          maxLength={MAX_TITLE_LENGTH}
          autoFocus
          multiline
          accessibilityLabel="任務內容"
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
              請輸入任務內容
            </Text>
          ) : (
            <View />
          )}
          <Text style={[styles.counter, { color: theme.colors.textTertiary }]}>
            {title.length}/{MAX_TITLE_LENGTH}
          </Text>
        </View>

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>優先級</Text>
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
                accessibilityLabel={`優先級${PRIORITY_LABEL[value]}`}
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

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>備註（可選）</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="補充說明"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          accessibilityLabel="備註"
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
          accessibilityLabel={isEditing ? '保存修改' : '創建任務'}
          accessibilityState={{ disabled: !canSave }}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: canSave ? (pressed ? 0.85 : 1) : 0.4,
            },
          ]}>
          <Text style={[styles.saveText, { color: theme.colors.onPrimary }]}>
            {isEditing ? '保存修改' : '創建任務'}
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
