import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';

import { ContentContainer } from '@/components/content-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function OrganizationsScreen() {
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');

  return (
    <ThemedView style={styles.container}>
      <ContentContainer>
        <View style={styles.header}>
          <ThemedText type="title">Organizations</ThemedText>
          <ThemedText style={[styles.subtitle, { color: mutedText }]}>
            Connect with advocacy groups
          </ThemedText>
        </View>
      </ContentContainer>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
          <View style={[styles.iconCircle, { backgroundColor: tint + '12' }]}>
            <MaterialIcons name="groups" size={40} color={tint} />
          </View>
          <ThemedText type="subtitle" style={styles.title}>
            Coming Soon
          </ThemedText>
          <ThemedText style={[styles.body, { color: mutedText }]}>
            We're building a directory of Kansas advocacy organizations.
            Check back soon to discover groups aligned with the issues you
            care about.
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 15,
    marginTop: Spacing.xs,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['5xl'],
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.md,
    maxWidth: 380,
    width: '100%',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
