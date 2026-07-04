import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getCommitteeMeeting } from '@/constants/committee-meetings';
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

  const meeting = getCommitteeMeeting(committee.name, committee.chamber);

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
      <View style={styles.header}>
        <ThemedText
          type="defaultSemiBold"
          style={[styles.name, { color: tint }]}
          numberOfLines={2}
        >
          {`${committee.chamber} • ${committee.name}`}
        </ThemedText>
        <MaterialIcons name="chevron-right" size={20} color={mutedText} />
      </View>

      {meeting ? (
        <>
          <View style={[styles.divider, { backgroundColor: border }]} />
          <View style={styles.metaRow}>
            {meeting.day ? (
              <>
                <MaterialIcons name="calendar-today" size={13} color={mutedText} />
                <ThemedText type="caption" style={{ color: mutedText }}>
                  {meeting.day}
                </ThemedText>
              </>
            ) : null}
            {meeting.day && meeting.time ? (
              <ThemedText type="caption" style={{ color: mutedText }}> • </ThemedText>
            ) : null}
            {meeting.time ? (
              <>
                <MaterialIcons name="access-time" size={13} color={mutedText} />
                <ThemedText type="caption" style={{ color: mutedText }}>
                  {meeting.time}
                </ThemedText>
              </>
            ) : null}
            {(meeting.day || meeting.time) && meeting.room ? (
              <ThemedText type="caption" style={{ color: mutedText }}> • </ThemedText>
            ) : null}
            {meeting.room ? (
              <>
                <MaterialIcons name="place" size={13} color={mutedText} />
                <ThemedText type="caption" style={{ color: mutedText }}>
                  {meeting.room}
                </ThemedText>
              </>
            ) : null}
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  name: {
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  divider: {
    height: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
});
