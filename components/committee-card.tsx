import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { KansasCommittee } from '@/services/openstates';

interface CommitteeCardProps {
  committee: KansasCommittee;
  onPress: () => void;
}

export function CommitteeCard({ committee, onPress }: CommitteeCardProps) {
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');

  const memberCount = committee.members.length;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: surface, borderColor: border },
        Shadows.sm,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.headerRow}>
        <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={2}>
          {committee.name}
        </ThemedText>
        <MaterialIcons name="chevron-right" size={20} color={mutedText} />
      </View>

      <View style={styles.metaRow}>
        {committee.chamber ? (
          <View style={[styles.chip, { backgroundColor: border }]}>
            <ThemedText type="caption" style={{ color: mutedText }}>
              {committee.chamber}
            </ThemedText>
          </View>
        ) : null}
        <View style={styles.memberCount}>
          <MaterialIcons name="people" size={14} color={tint} />
          <ThemedText type="caption" style={{ color: tint, fontWeight: '700' }}>
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  name: {
    fontSize: 16,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
