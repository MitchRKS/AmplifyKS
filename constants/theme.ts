import { Platform } from 'react-native';

const primary = '#0097b2';
const primaryDark = '#33C4DB';

export const Colors = {
  light: {
    text: '#1A1D21',
    secondaryText: '#5E6368',
    background: '#F6F8FA',
    surface: '#FFFFFF',
    tint: primary,
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: primary,
    border: '#d5d5d5',
    inputBackground: '#F0F2F5',
    inputBorder: '#d5d5d5',
    success: '#adc323',
    warning: '#ffc629',
    error: '#fa3332',
    democrat: '#1c355e',
    republican: '#fa3332',
    accent: '#ffc629',
    orange: '#a9cd34',
    headerBackground: '#FFFFFF',
    tabBarBackground: '#FFFFFF',
    cardShadow: 'rgba(0, 0, 0, 0.06)',
  },
  dark: {
    text: '#F0F2F5',
    secondaryText: '#9CA3AF',
    background: '#111317',
    surface: '#1C1F26',
    tint: primaryDark,
    icon: '#9CA3AF',
    tabIconDefault: '#6B7280',
    tabIconSelected: primaryDark,
    border: '#2D3139',
    inputBackground: '#1C1F26',
    inputBorder: '#2D3139',
    success: '#C4D94F',
    warning: '#FFD666',
    error: '#FF6B6A',
    democrat: '#6B8DC2',
    republican: '#FF6B6A',
    accent: '#FFD666',
    orange: '#BFE050',
    headerBackground: '#1C1F26',
    tabBarBackground: '#1C1F26',
    cardShadow: 'rgba(0, 0, 0, 0.3)',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

export const Breakpoints = {
  mobile: 600,
  tablet: 900,
} as const;

export const Layout = {
  maxContentWidth: 680,
  screenPadding: 20,
  sidebarWidth: 256,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
