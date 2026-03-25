import { View, type ViewProps } from 'react-native';

import { Layout } from '@/constants/theme';

export type ContentContainerProps = ViewProps;

export function ContentContainer({ style, ...props }: ContentContainerProps) {
  return (
    <View
      style={[
        {
          width: '100%',
          maxWidth: Layout.maxContentWidth,
          alignSelf: 'center',
        },
        style,
      ]}
      {...props}
    />
  );
}
