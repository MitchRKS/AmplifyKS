import { Platform, useWindowDimensions } from 'react-native';

import { Breakpoints } from '@/constants/theme';

export type LayoutSize = 'mobile' | 'tablet' | 'desktop';

interface ResponsiveLayout {
  size: LayoutSize;
  isMobile: boolean;
  isDesktop: boolean;
  showSidebar: boolean;
  width: number;
}

export function useResponsiveLayout(): ResponsiveLayout {
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web') {
    return { size: 'mobile', isMobile: true, isDesktop: false, showSidebar: false, width };
  }

  const size: LayoutSize =
    width < Breakpoints.mobile
      ? 'mobile'
      : width < Breakpoints.tablet
        ? 'tablet'
        : 'desktop';

  return {
    size,
    isMobile: size === 'mobile',
    isDesktop: size === 'desktop',
    showSidebar: size === 'desktop',
    width,
  };
}
