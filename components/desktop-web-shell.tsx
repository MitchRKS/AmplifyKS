import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { WebTopNav } from '@/components/web-top-nav';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

interface DesktopWebShellProps {
  children: ReactNode;
}

// `position: 'sticky'` is web-only CSS and not in RN's ViewStyle types.
const STICKY_HEADER_STYLE: ViewStyle = Platform.select({
  web: { position: 'sticky' as ViewStyle['position'], top: 0, zIndex: 50 },
  default: {},
}) as ViewStyle;

export function DesktopWebShell({ children }: DesktopWebShellProps) {
  const { showSidebar } = useResponsiveLayout();
  const showShell = Platform.OS === 'web' && showSidebar;

  if (!showShell) return <>{children}</>;

  return (
    <View style={styles.shell}>
      <View style={[styles.header, STICKY_HEADER_STYLE]}>
        <WebTopNav />
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'column',
  },
  header: {
    width: '100%',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
});
