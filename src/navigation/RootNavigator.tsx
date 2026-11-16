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
 * 單頁 + 彈出視窗的導航結構：
 *   TaskList（全屏）→ TaskEditor（modal）
 *
 * `presentation: 'modal'` 在 iOS 上是全屏模態（UIModalPresentationFullScreen），
 * **不支援下滑關閉手勢**；若改用 `presentation: 'formSheet'` 則是 pageSheet，
 * iOS 16+ 支援下滑關閉。兩者行為不同，本項目選 'modal'。
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
            title: route.params?.taskId ? '編輯任務' : '新增任務',
            presentation: 'modal',
            // 顯式提供「取消」。全屏 modal 不會自動帶返回按鈕，
            // 沒有它使用者會被困在彈出視窗裡。
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
