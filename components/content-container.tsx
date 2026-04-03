import { Platform, View, type ViewProps } from 'react-native';

import { Layout, Spacing } from '@/constants/theme';

export type ContentContainerProps = ViewProps;

export function ContentContainer({ style, ...props }: ContentContainerProps) {
  return (
    <View
      style={[
        {
          width: '100%',
          maxWidth: Layout.maxContentWidth,
          alignSelf: 'center',
          paddingHorizontal: Platform.OS === 'web' ? Spacing.lg : 0,
        },
        style,
      ]}
      {...props}
    />
  );
}
