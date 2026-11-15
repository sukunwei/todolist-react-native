/**
 * 颜色 token。
 *
 * 两套色值（浅色 / 深色），跟随系统 `useColorScheme` 切换。
 * 组件里不要写死颜色，一律从这里取，否则深色模式会出现「白底白字」。
 */

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  divider: string;
  primary: string;
  primaryMuted: string;
  onPrimary: string;
  high: string;
  medium: string;
  low: string;
  danger: string;
  dangerMuted: string;
  overlay: string;
  fabShadow: string;
}

export const lightColors: ThemeColors = {
  bg: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  divider: '#F0F1F3',
  primary: '#2563EB',
  primaryMuted: '#DBEAFE',
  onPrimary: '#FFFFFF',
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
  danger: '#DC2626',
  dangerMuted: '#FEE2E2',
  overlay: 'rgba(17, 24, 39, 0.45)',
  fabShadow: '#1D4ED8',
};

export const darkColors: ThemeColors = {
  bg: '#0F1115',
  surface: '#181B21',
  surfaceElevated: '#21252D',
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  border: '#2A2E37',
  divider: '#23272F',
  primary: '#60A5FA',
  primaryMuted: '#1B2C47',
  onPrimary: '#0B1220',
  high: '#F87171',
  medium: '#FBBF24',
  low: '#34D399',
  danger: '#F87171',
  dangerMuted: '#3B1D1D',
  overlay: 'rgba(0, 0, 0, 0.6)',
  fabShadow: '#000000',
};
