import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

/**
 * Shared bill list card, ported from the iOS app's BillCardView.swift so
 * every surface (Bills list, Actions/testimony list, and future callers)
 * renders bills identically.
 *
 * iOS layout, three rows:
 *   1. "{number} - {committee}" — 17pt semibold. (We keep the app's teal
 *      tint on this line — a deliberate deviation from iOS's plain label
 *      color; it matches bill-detail and strengthens the number-vs-title
 *      contrast.)
 *   2. description (falls back to title) — 15pt regular, muted, ONE line.
 *   3. below a hairline divider: "{Mon D, YYYY}: {action}" — 13pt muted,
 *      chamber words stripped. `footer` replaces this row when provided
 *      (Actions uses it for "Open for testimony").
 * No status badge, no chamber chip, no history icon — iOS shows none.
 */

/** Strip chamber phrasing the way iOS BillCardView does. */
export function sanitizeLastAction(lastAction: string): string {
  return lastAction
    .replace(/^(House|Senate):\s+/i, '')
    .replace(/^(House|Senate)\s+-\s+/i, '')
    .replace(/^In\s+(House|Senate),\s+/i, '')
    .replace(/\b(House|Senate)\s+Committee\b/gi, 'Committee')
    .replace(/\b(House|Senate)\s+Floor\b/gi, 'Floor')
    .replace(/\b(House|Senate)\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

const formatActionDate = (raw: string): string | null => {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw || null;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

interface BillCardProps {
  billNumber: string;
  /** Shown as "{number} - {committee}". Omit (or pass '') to show number alone. */
  committeeName?: string;
  /** Row 2 — pass description with title fallback already applied, or title. */
  description: string;
  lastAction?: string;
  lastActionDate?: string;
  onPress: () => void;
  /** Replaces the last-action row below the divider (e.g. "Open for testimony"). */
  footer?: React.ReactNode;
  style?: ViewStyle;
}

export function BillCard({
  billNumber,
  committeeName,
  description,
  lastAction,
  lastActionDate,
  onPress,
  footer,
  style,
}: BillCardProps) {
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  // iOS: neutral border = label color at 25% opacity, never status-colored.
  const cardBorder = useThemeColor({ light: 'rgba(0,0,0,0.25)', dark: 'rgba(255,255,255,0.25)' }, 'text');
  const divider = useThemeColor({ light: 'rgba(60,60,67,0.29)', dark: 'rgba(84,84,88,0.6)' }, 'background');

  const identity = committeeName ? `${billNumber} - ${committeeName}` : billNumber;

  const actionLine = (() => {
    const sanitized = lastAction ? sanitizeLastAction(lastAction) : '';
    if (!sanitized) return 'No recent action available.';
    const date = lastActionDate ? formatActionDate(lastActionDate) : null;
    return date ? `${date}: ${sanitized}` : sanitized;
  })();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: surface, borderColor: cardBorder },
        Shadows.sm,
        style,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <ThemedText type="defaultSemiBold" style={[styles.identity, { color: tint }]} numberOfLines={1}>
        {identity}
      </ThemedText>

      <ThemedText style={[styles.description, { color: mutedText }]} numberOfLines={1}>
        {description}
      </ThemedText>

      <View style={[styles.divider, { backgroundColor: divider }]} />

      {footer ?? (
        <ThemedText style={[styles.lastAction, { color: mutedText }]} numberOfLines={2}>
          {actionLine}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  identity: {
    fontSize: 17,
  },
  description: {
    fontSize: 15,
    lineHeight: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  lastAction: {
    fontSize: 13,
    lineHeight: 18,
  },
});
