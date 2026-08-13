import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppAlert } from '@/components/app-alert';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useBillTalkingPoints, type TalkingPoint } from '@/hooks/use-bill-talking-points';
import { useThemeColor } from '@/hooks/use-theme-color';

interface TalkingPointsCardProps {
  billId: number;
  /** Admin gets inline add/edit/delete; rules enforce it server-side too. */
  isAdmin: boolean;
}

/**
 * Admin-curated talking points for a bill (iOS AdminTalkingPointsView
 * equivalent): guidance users can draw on when writing testimony. Hidden
 * entirely for non-admins when no points exist.
 */
export function TalkingPointsCard({ billId, isAdmin }: TalkingPointsCardProps) {
  const { points, isLoading, addPoint, updatePoint, removePoint } = useBillTalkingPoints(billId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#252830' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholder = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');

  if (isLoading) return null;
  if (!isAdmin && points.length === 0) return null;

  // One shared editor slot: while it's open, the other edit/add affordances
  // are disabled so switching contexts can't silently destroy a draft.
  const editorOpen = adding || editingId != null;
  const canSaveDraft = Boolean(draftTitle.trim() || draftContent.trim());

  const startEdit = (point: TalkingPoint | null) => {
    setEditingId(point?.id ?? null);
    setAdding(point == null);
    setDraftTitle(point?.title ?? '');
    setDraftContent(point?.content ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
    setDraftTitle('');
    setDraftContent('');
  };

  const saveEdit = async () => {
    if (busy || (!draftTitle.trim() && !draftContent.trim())) return;
    setBusy(true);
    try {
      if (adding) {
        await addPoint(draftTitle, draftContent);
      } else if (editingId) {
        await updatePoint(editingId, draftTitle, draftContent);
      }
      cancelEdit();
    } catch (error) {
      console.error('Talking point save failed:', error);
      AppAlert.alert('Error', 'Unable to save the talking point. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (point: TalkingPoint) => {
    AppAlert.alert('Delete Talking Point', `Delete "${point.title || 'this talking point'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removePoint(point.id).catch((error) => {
            console.error('Talking point delete failed:', error);
            AppAlert.alert('Error', 'Unable to delete the talking point.');
          });
        },
      },
    ]);
  };

  const editorFields = (
    <View style={styles.editor}>
      <TextInput
        style={[styles.input, { backgroundColor: inputBackground, borderColor: border, color: inputText }]}
        placeholder="Title (e.g. Local impact)"
        placeholderTextColor={placeholder}
        value={draftTitle}
        onChangeText={setDraftTitle}
        editable={!busy}
      />
      <TextInput
        style={[
          styles.input,
          styles.contentInput,
          { backgroundColor: inputBackground, borderColor: border, color: inputText },
        ]}
        placeholder="Talking point details…"
        placeholderTextColor={placeholder}
        value={draftContent}
        onChangeText={setDraftContent}
        multiline
        editable={!busy}
      />
      <View style={styles.editorButtons}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          onPress={cancelEdit}
          disabled={busy}
        >
          <ThemedText style={[styles.cancelText, { color: mutedText }]}>Cancel</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || !canSaveDraft }}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: tint },
            !canSaveDraft && styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={() => void saveEdit()}
          disabled={busy || !canSaveDraft}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={styles.saveText}>{adding ? 'Add' : 'Save'}</ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
      <View style={styles.titleRow}>
        <MaterialIcons name="lightbulb-outline" size={20} color={tint} />
        <ThemedText type="defaultSemiBold">Talking Points</ThemedText>
      </View>
      <ThemedText type="caption" style={[styles.hint, { color: mutedText }]}>
        Guidance for writing your testimony on this bill.
      </ThemedText>

      {points.map((point, index) => (
        <View
          key={point.id}
          style={[styles.pointRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}
        >
          {editingId === point.id ? (
            editorFields
          ) : (
            <View style={styles.pointBody}>
              <View style={styles.pointText}>
                {point.title ? (
                  <ThemedText type="defaultSemiBold" style={styles.pointTitle}>
                    {point.title}
                  </ThemedText>
                ) : null}
                {point.content ? (
                  <ThemedText style={[styles.pointContent, { color: mutedText }]}>
                    {point.content}
                  </ThemedText>
                ) : null}
              </View>
              {isAdmin && (
                <View style={[styles.pointActions, (editorOpen || busy) && styles.disabled]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${point.title}`}
                    hitSlop={8}
                    onPress={() => startEdit(point)}
                    disabled={editorOpen || busy}
                  >
                    <MaterialIcons name="edit" size={18} color={mutedText} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${point.title}`}
                    hitSlop={8}
                    onPress={() => confirmRemove(point)}
                    disabled={editorOpen || busy}
                  >
                    <MaterialIcons name="delete-outline" size={18} color={mutedText} />
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>
      ))}

      {isAdmin &&
        (adding ? (
          editorFields
        ) : (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.addButton,
              { borderColor: tint },
              (editorOpen || busy) && styles.disabled,
              pressed && styles.pressed,
            ]}
            onPress={() => startEdit(null)}
            disabled={editorOpen || busy}
          >
            <MaterialIcons name="add" size={18} color={tint} />
            <ThemedText style={[styles.addText, { color: tint }]}>Add Talking Point</ThemedText>
          </Pressable>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  hint: {
    marginBottom: Spacing.xs,
  },
  pointRow: {
    paddingVertical: Spacing.sm,
  },
  pointBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  pointText: {
    flex: 1,
    gap: 2,
  },
  pointTitle: {
    fontSize: 15,
  },
  pointContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  pointActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: 2,
  },
  editor: {
    gap: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
  },
  contentInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  editorButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: Spacing.lg,
    minWidth: 72,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 10,
    marginTop: Spacing.xs,
  },
  addText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
