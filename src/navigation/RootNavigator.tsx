import React from 'react';
import { Pressable, Text } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TaskEditorModal from '../screens/TaskEditorModal';
import TaskListScreen from '../screens/TaskListScreen';
import { useTheme } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * 单页 + 弹窗的导航结构：
 *   TaskList（全屏）→ TaskEditor（modal）
 *
 * `presentation: 'modal'` 在 iOS 上是全屏模态（UIModalPresentationFullScreen），
 * **不支持下滑关闭手势**；若改用 `presentation: 'formSheet'` 则是 pageSheet，
 * iOS 16+ 支持下滑关闭。两者行为不同，本项目选 'modal'。
 */
export default function RootNavigator() {
  const theme = useTheme();
  const base = theme.isDark ? DarkTheme : DefaultTheme;

  const navTheme: NavTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: theme.colors.bg,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTitleStyle: { color: theme.colors.text },
          headerTintColor: theme.colors.primary,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: theme.colors.bg },
        }}>
        <Stack.Screen
          name="TaskList"
          component={TaskListScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TaskEditor"
          component={TaskEditorModal}
          options={({ route, navigation }) => ({
            title: route.params?.taskId ? '编辑任务' : '新建任务',
            presentation: 'modal',
            // 显式提供「取消」。全屏 modal 不会自动带返回按钮，
            // 没有它用户会被困在弹窗里。
            headerLeft: () => (
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="取消">
                <Text style={{ color: theme.colors.primary, fontSize: 16 }}>取消</Text>
              </Pressable>
            ),
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
