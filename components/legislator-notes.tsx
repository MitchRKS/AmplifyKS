import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { deleteDoc, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppAlert } from '@/components/app-alert';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getFirestoreDb } from '@/services/firebase';

interface LegislatorNotesProps {
  legislatorId: string;
}

// Mirrors the iOS app's bill notes (BillNotesManager): one private note per
// item, stored in a per-user subcollection, where saving empty text deletes
// the note. Here the item is a legislator instead of a bill.
//
// OpenStates IDs (e.g. "ocd-person/<uuid>") contain slashes, which are
// illegal in a Firestore document ID — sanitize for the doc path and keep
// the raw ID in the document body.
const noteDocId = (legislatorId: string) => legislatorId.replace(/\//g, '_');

export function LegislatorNotes({ legislatorId }: LegislatorNotesProps) {
  const { user } = useAuth();
  const [savedText, setSavedText] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#252830' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholder = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');

  const uid = user?.uid;

  useEffect(() => {
    if (!uid) {
      setSavedText('');
      setDraft('');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const db = getFirestoreDb();
        const snap = await getDoc(
          doc(db, 'users', uid, 'legislatorNotes', noteDocId(legislatorId)),
        );
        const text = snap.exists() ? String(snap.data().text ?? '') : '';
        if (!cancelled) {
          setSavedText(text);
          setDraft(text);
        }
      } catch (e) {
        console.error('Error loading legislator note:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [legislatorId, uid]);

  const dirty = draft.trim() !== savedText;

  const handleSave = async () => {
    if (!user || saving) return;
    const trimmed = draft.trim();
    setSaving(true);
    try {
      const db = getFirestoreDb();
      const noteRef = doc(db, 'users', user.uid, 'legislatorNotes', noteDocId(legislatorId));
      if (trimmed) {
        await setDoc(noteRef, {
          legislatorId,
          text: trimmed,
          updatedAt: Timestamp.now(),
        });
      } else {
        await deleteDoc(noteRef);
      }
      setSavedText(trimmed);
      setDraft(trimmed);
    } catch (e) {
      console.error('Error saving legislator note:', e);
      AppAlert.alert('Error', 'Unable to save your note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.card, { borderColor: border }]}>
      <View style={styles.titleRow}>
        <MaterialIcons name="edit-note" size={20} color={tint} />
        <ThemedText type="defaultSemiBold">My Notes</ThemedText>
        <ThemedText style={[styles.privacyHint, { color: mutedText }]}>
          Only visible to you
        </ThemedText>
      </View>

      {!user ? (
        <ThemedText style={[styles.signInHint, { color: mutedText }]}>
          Sign in to keep private notes about this legislator
        </ThemedText>
      ) : loading ? (
        <ActivityIndicator size="small" color={tint} style={styles.loadingIndicator} />
      ) : (
        <>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: inputBackground, borderColor: border, color: inputText },
            ]}
            placeholder="Add a note — meetings, positions, follow-ups…"
            placeholderTextColor={placeholder}
            value={draft}
            onChangeText={setDraft}
            multiline
            editable={!saving}
          />
          {dirty && (
            <View style={styles.buttonRow}>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.discardButton, pressed && styles.pressed]}
                onPress={() => setDraft(savedText)}
                disabled={saving}
              >
                <ThemedText style={[styles.discardText, { color: mutedText }]}>Discard</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: tint },
                  pressed && styles.pressed,
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.saveText}>
                    {draft.trim() ? 'Save Note' : 'Delete Note'}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          )}
        </>
      )}
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
  privacyHint: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  signInHint: {
    fontSize: 13,
  },
  loadingIndicator: {
    alignSelf: 'flex-start',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
  },
  discardButton: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
  },
  discardText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: Spacing.lg,
    minWidth: 100,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
