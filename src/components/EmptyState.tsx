import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TaskFilter } from '../types/task';
import { useTheme } from '../theme';

interface EmptyStateProps {
  filter: TaskFilter;
  onCreate: () => void;
}

const COPY: Record<TaskFilter, { title: string; hint: string; glyph: string }> = {
  all: {
    title: '還沒有任務',
    hint: '點選右下角的 + 添加第一條待辦',
    glyph: '✓',
  },
  active: {
    title: '沒有待辦事項',
    hint: '所有任務都已完成，保持得不錯',
    glyph: '✓',
  },
  done: {
    title: '還沒有完成的任務',
    hint: '完成的任務會歸檔到這裡',
    glyph: '○',
  },
};

/** 列表空狀態佔位 */
export default function EmptyState({ filter, onCreate }: EmptyStateProps) {
  const theme = useTheme();
  const copy = COPY[filter];

  return (
    <View style={styles.container} accessibilityRole="summary">
      <View
        style={[
          styles.circle,
          { backgroundColor: theme.colors.primaryMuted, borderColor: theme.colors.border },
        ]}>
        <Text style={[styles.glyph, { color: theme.colors.primary }]}>{copy.glyph}</Text>
      </View>

      <Text style={[styles.title, { color: theme.colors.text }]}>{copy.title}</Text>
      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{copy.hint}</Text>

      {filter !== 'done' ? (
        <Pressable
          onPress={onCreate}
          accessibilityRole="button"
          accessibilityLabel="新增任務"
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}>
          <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
            新增任務
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 72,
    paddingHorizontal: 32,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glyph: {
    fontSize: 32,
    fontWeight: '600',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
