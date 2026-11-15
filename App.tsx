/**
 * TODOLIST — 本地待办清单 App
 *
 * 入口：SafeAreaProvider → StatusBar → RootNavigator
 * 数据全部保存在设备本地（AsyncStorage），不联网、不采集任何数据。
 *
 * @format
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

export default App;
