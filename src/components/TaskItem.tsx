import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import PriorityBadge from './PriorityBadge';
import type { Task } from '../types/task';
import { useTheme } from '../theme';
import { formatRelativeTime } from '../utils/date';

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  /** 已经在本组最上方 / 最下方时为 false，按钮置灰 */
  canMoveUp: boolean;
  canMoveDown: boolean;
}

interface IconButtonProps {
  glyph: string;
  label: string;
  onPress: () => void;
  color: string;
  disabled?: boolean;
}

function IconButton({ glyph, label, onPress, color, disabled }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.iconButton,
        { opacity: disabled ? 0.28 : pressed ? 0.5 : 1 },
      ]}>
      <Text style={[styles.iconGlyph, { color }]}>{glyph}</Text>
    </Pressable>
  );
}

/** 列表中的单行任务 */
export default function TaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: TaskItemProps) {
  const theme = useTheme();
  const done = task.status === 'done';

  const priorityColor =
    task.priority === 'high'
      ? theme.colors.high
      : task.priority === 'medium'
        ? theme.colors.medium
        : theme.colors.low;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`将「${task.title}」标记为${done ? '未完成' : '已完成'}`}
        style={styles.checkboxHit}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: done ? theme.colors.primary : theme.colors.textTertiary,
              backgroundColor: done ? theme.colors.primary : 'transparent',
            },
          ]}>
          {done ? <Text style={[styles.check, { color: theme.colors.onPrimary }]}>✓</Text> : null}
        </View>
      </Pressable>

      <Pressable
        style={styles.content}
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`编辑任务「${task.title}」`}
        accessibilityHint="打开编辑界面修改标题、优先级和备注">
        <View style={[styles.priorityBar, { backgroundColor: priorityColor }]} />
        <View style={styles.textColumn}>
          <Text
            numberOfLines={2}
            style={[
              styles.title,
              {
                color: done ? theme.colors.textTertiary : theme.colors.text,
                textDecorationLine: done ? 'line-through' : 'none',
              },
            ]}>
            {task.title}
          </Text>

          <View style={styles.metaRow}>
            <PriorityBadge priority={task.priority} />
            {task.notes ? (
              <Text
                numberOfLines={1}
                style={[styles.notes, { color: theme.colors.textTertiary }]}>
                {task.notes}
              </Text>
            ) : null}
            <Text style={[styles.time, { color: theme.colors.textTertiary }]}>
              {formatRelativeTime(task.createdAt)}
            </Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <IconButton
          glyph="↑"
          label={`将「${task.title}」上移`}
          onPress={onMoveUp}
          color={theme.colors.textSecondary}
          disabled={!canMoveUp}
        />
        <IconButton
          glyph="↓"
          label={`将「${task.title}」下移`}
          onPress={onMoveDown}
          color={theme.colors.textSecondary}
          disabled={!canMoveDown}
        />
        <IconButton
          glyph="✕"
          label={`删除「${task.title}」`}
          onPress={onDelete}
          color={theme.colors.danger}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 6,
    marginBottom: 8,
  },
  checkboxHit: {
    paddingRight: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 10,
    minHeight: 36,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  notes: {
    flex: 1,
    fontSize: 12,
    marginLeft: 8,
  },
  time: {
    fontSize: 11,
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  iconButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    fontSize: 17,
    fontWeight: '600',
  },
});
