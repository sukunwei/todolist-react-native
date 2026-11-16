import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TaskFilter } from '../types/task';
import { useTheme } from '../theme';

interface TaskFilterBarProps {
  filter: TaskFilter;
  counts: Record<TaskFilter, number>;
  onChange: (filter: TaskFilter) => void;
}

const FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '進行中' },
  { key: 'done', label: '已完成' },
];

/** 頂部的三段式篩選控制項 */
export default function TaskFilterBar({
  filter,
  counts,
  onChange,
}: TaskFilterBarProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.surfaceElevated }]}
      accessibilityRole="tablist">
      {FILTERS.map(item => {
        const selected = item.key === filter;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${item.label}，${counts[item.key]} 項`}
            style={styles.segment}>
            <Text
              style={[
                styles.label,
                {
                  color: selected ? theme.colors.text : theme.colors.textSecondary,
                  fontWeight: selected ? '600' : '500',
                },
              ]}>
              {item.label}
            </Text>
            <View
              style={[
                styles.count,
                {
                  backgroundColor: selected
                    ? theme.colors.primary
                    : theme.colors.divider,
                },
              ]}>
              <Text
                style={[
                  styles.countText,
                  {
                    color: selected
                      ? theme.colors.onPrimary
                      : theme.colors.textSecondary,
                  },
                ]}>
                {counts[item.key]}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
  },
  count: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 5,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
