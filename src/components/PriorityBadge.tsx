import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PRIORITY_LABEL, type Priority } from '../types/task';
import { useTheme } from '../theme';

interface PriorityBadgeProps {
  priority: Priority;
}

/** 优先级角标：高 / 中 / 低 */
export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const theme = useTheme();

  const color =
    priority === 'high'
      ? theme.colors.high
      : priority === 'medium'
        ? theme.colors.medium
        : theme.colors.low;

  return (
    <View
      style={[styles.badge, { borderColor: color }]}
      accessibilityLabel={`优先级${PRIORITY_LABEL[priority]}`}>
      <Text style={[styles.label, { color }]}>{PRIORITY_LABEL[priority]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
});
