import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { KansasCommitteeMember } from '@/services/openstates';

interface CommitteeMemberRowProps {
  member: KansasCommitteeMember;
  onPress: () => void;
}

const isLeadership = (role: string): boolean => {
  const lower = role.toLowerCase();
  return lower.includes('chair') || lower.includes('vice') || lower.includes('ranking');
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export function CommitteeMemberRow({ member, onPress }: CommitteeMemberRowProps) {
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#252830' }, 'background');

  const leadership = isLeadership(member.role);
  const roleColor = leadership ? tint : mutedText;
  const roleBackground = leadership ? tint + '14' : inputBackground;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: surface, borderColor: border },
        Shadows.sm,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: inputBackground }]}>
        <ThemedText style={[styles.avatarText, { color: mutedText }]}>
          {getInitials(member.name)}
        </ThemedText>
      </View>

      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>
          {member.name}
        </ThemedText>
        <View style={[styles.roleBadge, { backgroundColor: roleBackground }]}>
          <ThemedText style={[styles.roleText, { color: roleColor }]}>
            {member.role}
          </ThemedText>
        </View>
      </View>

      <MaterialIcons name="chevron-right" size={20} color={mutedText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
