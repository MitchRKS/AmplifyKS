import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppAlert } from '@/components/app-alert';
import { ContentContainer } from '@/components/content-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ALL_ACHIEVEMENTS } from '@/constants/gamification';
import { isAdminRole } from '@/constants/roles';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useGamification } from '@/contexts/gamification-context';
import { useSavedOfficials } from '@/hooks/use-saved-officials';
import { useUserProfile, type UserProfile } from '@/hooks/use-user-profile';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  composeAddress,
  hasGeocodableAddress,
  lookupElectedsForAddress,
} from '@/services/elected-lookup';
import { getAuth } from '@/services/firebase';
import type { Official } from '@/services/openstates';
import { passkeysSupported, registerPasskey } from '@/services/passkeys';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { profile, isLoaded, isSaving, updateProfile } = useUserProfile();
  const { replaceOfficials } = useSavedOfficials();
  const gamification = useGamification();
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isFindingElecteds, setIsFindingElecteds] = useState(false);
  // Electeds found for a newly saved address, awaiting the user's OK before
  // they replace the current My Electeds (mirrors the Find Electeds screen).
  const [pendingElecteds, setPendingElecteds] = useState<Official[]>([]);
  const [isSavingElecteds, setIsSavingElecteds] = useState(false);
  const [form, setForm] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    phone: '',
    streetAddress: '',
    city: '',
    state: 'KS',
    zip: '',
    role: 'user',
  });

  useEffect(() => {
    if (isLoaded) {
      // Pre-fill blank profile names from the Auth displayName so existing
      // accounts see their current name instead of empty inputs.
      setForm({
        ...profile,
        firstName: profile.firstName || user?.firstName || '',
        lastName: profile.lastName || user?.lastName || '',
      });
    }
  }, [isLoaded, profile, user]);

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#252830' }, 'background');
  const inputBorder = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholder = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');

  const handleAddPasskey = async () => {
    if (isAddingPasskey) return;
    setIsAddingPasskey(true);
    try {
      const result = await registerPasskey();
      if (!result.cancelled) {
        AppAlert.alert(
          'Passkey Added',
          'You can now sign in with your passkey (Face ID, Touch ID, or your device PIN) instead of a password.',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not add a passkey.';
      AppAlert.alert('Passkey Failed', message);
    } finally {
      setIsAddingPasskey(false);
    }
  };

  const performDeleteAccount = async () => {
    if (Platform.OS !== 'web') {
      AppAlert.alert('Not Available', 'Account deletion is not available in this app build yet.');
      return;
    }
    setIsDeletingAccount(true);
    try {
      const idToken = await getAuth().currentUser?.getIdToken();
      if (!idToken) throw new Error('You are not signed in.');
      const response = await fetch('/.netlify/functions/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Account deletion failed. Please try again.');
      // Server already deleted the Auth user + data; clear local state.
      await logout();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Account deletion failed.';
      AppAlert.alert('Error', message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    AppAlert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void performDeleteAccount() },
      ],
    );
  };

  // Saving a new address re-derives My Electeds from it automatically — the
  // same lookup + wholesale replace the Find Electeds screen performs.
  const handleSaveChanges = async () => {
    if (isSaving || isFindingElecteds) return;

    // Capture whether the address portion changed BEFORE updateProfile
    // optimistically overwrites the profile state with the form values.
    const addressChanged =
      form.streetAddress.trim() !== profile.streetAddress.trim() ||
      form.city.trim() !== profile.city.trim() ||
      form.state.trim() !== profile.state.trim() ||
      form.zip.trim() !== profile.zip.trim();

    try {
      await updateProfile(form);
    } catch (error) {
      console.error('Profile save failed:', error);
      AppAlert.alert('Error', 'Unable to save your profile. Please try again.');
      return;
    }

    if (!addressChanged || !hasGeocodableAddress(form)) return;

    setIsFindingElecteds(true);
    try {
      const result = await lookupElectedsForAddress(composeAddress(form));
      if (result.status === 'ok') {
        // Ask before replacing — the modal's confirm does the actual save.
        setPendingElecteds(result.officials);
      } else if (result.status === 'out-of-state') {
        AppAlert.alert(
          'Profile Saved',
          "That address doesn't appear to be in Kansas, so your My Electeds weren't changed. Amplify covers Kansas electeds.",
        );
      } else {
        AppAlert.alert(
          'Profile Saved',
          "We couldn't find electeds for that address, so your My Electeds weren't changed. Check the address, or use Find Electeds in the Electeds tab.",
        );
      }
    } catch (error) {
      console.error('Electeds refresh after address save failed:', error);
      AppAlert.alert(
        'Profile Saved',
        'Your address was saved, but we couldn\'t update your My Electeds right now. Use "Find Electeds" in the Electeds tab to refresh them.',
      );
    } finally {
      setIsFindingElecteds(false);
    }
  };

  const handleConfirmElecteds = async () => {
    if (pendingElecteds.length === 0 || isSavingElecteds) return;
    setIsSavingElecteds(true);
    try {
      await replaceOfficials(pendingElecteds);
      setIsSavingElecteds(false);
      setPendingElecteds([]);
      AppAlert.alert(
        'My Electeds Updated',
        `Saved ${pendingElecteds.length} elected${pendingElecteds.length !== 1 ? 's' : ''} for your new address to My Electeds.`,
      );
    } catch (error) {
      console.error('Saving electeds after address change failed:', error);
      setIsSavingElecteds(false);
      setPendingElecteds([]);
      AppAlert.alert(
        'Error',
        'Unable to update your My Electeds right now. Use "Find Electeds" in the Electeds tab to try again.',
      );
    }
  };

  const displayFirst = profile.firstName.trim() || user?.firstName || '';
  const displayLast = profile.lastName.trim() || user?.lastName || '';
  const fullName = user ? `${displayFirst} ${displayLast}`.trim() || 'No name set' : '';
  const initials = user
    ? `${displayFirst.charAt(0) || ''}${displayLast.charAt(0) || ''}`.toUpperCase() || '?'
    : '?';

  const content = (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ContentContainer>
        <View style={styles.header}>
          <ThemedText type="title">Profile</ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: tint + '15' }]}>
              <ThemedText style={[styles.avatarText, { color: tint }]}>{initials}</ThemedText>
            </View>
            <View style={styles.avatarInfo}>
              <View style={styles.nameRow}>
                <ThemedText type="subtitle">{fullName}</ThemedText>
                {isAdminRole(profile.role) && (
                  <MaterialIcons name="shield" size={14} color={tint} />
                )}
              </View>
              <ThemedText type="caption" style={{ color: mutedText }}>
                {user?.email || 'Not set'}
              </ThemedText>
              {profile.phone ? (
                <ThemedText type="caption" style={{ color: mutedText }}>
                  {profile.phone}
                </ThemedText>
              ) : null}
              {/* iOS role chip: gray user / orange admin / red super admin */}
              <View
                style={[
                  styles.roleChip,
                  {
                    backgroundColor:
                      profile.role === 'super_admin'
                        ? '#FA3332'
                        : profile.role === 'admin'
                          ? '#FF9500'
                          : '#8E8E93',
                  },
                ]}
              >
                <ThemedText style={styles.roleChipText}>
                  {profile.role === 'super_admin'
                    ? 'Super Admin'
                    : profile.role === 'admin'
                      ? 'Admin'
                      : 'User'}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Level & Points summary */}
        <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
          <View style={styles.levelRow}>
            <MaterialIcons
              name={gamification.currentLevel.iconName as any}
              size={40}
              color={gamification.currentLevel.iconColor}
            />
            <View style={styles.levelInfo}>
              <ThemedText style={[styles.levelLabel, { color: mutedText }]}>
                Level {gamification.currentLevel.id}
              </ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.levelName}>
                {gamification.currentLevel.name}
              </ThemedText>
            </View>
            <View style={styles.pointsColumn}>
              <ThemedText style={[styles.pointsValue, { color: tint }]}>
                {gamification.totalPoints}
              </ThemedText>
              <ThemedText style={[styles.pointsLabel, { color: mutedText }]}>points</ThemedText>
            </View>
          </View>

          {gamification.next && (
            <View style={styles.progressSection}>
              <View style={styles.progressMeta}>
                <ThemedText style={[styles.progressText, { color: mutedText }]}>
                  Next: {gamification.next.name}
                </ThemedText>
                <ThemedText style={[styles.progressText, { color: mutedText }]}>
                  {gamification.remaining} pts to go
                </ThemedText>
              </View>
              <View style={[styles.barOuter, { backgroundColor: inputBackground }]}>
                <View
                  style={[
                    styles.barInner,
                    {
                      width: `${Math.round(gamification.progress * 100)}%`,
                      backgroundColor: gamification.next.iconColor,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          <View style={[styles.statsRow, { borderTopColor: border }]}>
            <View style={styles.statItem}>
              <MaterialIcons name="local-fire-department" size={16} color="#FF9800" />
              <ThemedText style={[styles.statValue, { color: mutedText }]}>
                {gamification.currentStreak}d streak
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="emoji-events" size={16} color="#ffc629" />
              <ThemedText style={[styles.statValue, { color: mutedText }]}>
                {gamification.longestStreak}d best
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="verified" size={16} color={tint} />
              <ThemedText style={[styles.statValue, { color: mutedText }]}>
                {gamification.getUnlocked().length}/{ALL_ACHIEVEMENTS.length} badges
              </ThemedText>
            </View>
          </View>

          <Pressable
            style={[styles.expandButton, { borderColor: border }]}
            onPress={() => router.push('/(tabs)/points')}
          >
            <ThemedText style={[styles.expandText, { color: tint }]}>View Details</ThemedText>
            <MaterialIcons name="chevron-right" size={20} color={tint} />
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>Personal Info</ThemedText>
          <ThemedText type="caption" style={[styles.cardHint, { color: mutedText }]}>
            Used when submitting testimony and contacting your electeds
          </ThemedText>

          <View style={styles.addressRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <ThemedText style={[styles.fieldLabel, { color: mutedText }]}>First name</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                placeholder="Jane"
                placeholderTextColor={placeholder}
                value={form.firstName}
                onChangeText={(firstName) => setForm((f) => ({ ...f, firstName }))}
                textContentType="givenName"
                autoComplete="given-name"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <ThemedText style={[styles.fieldLabel, { color: mutedText }]}>Last name</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                placeholder="Doe"
                placeholderTextColor={placeholder}
                value={form.lastName}
                onChangeText={(lastName) => setForm((f) => ({ ...f, lastName }))}
                textContentType="familyName"
                autoComplete="family-name"
              />
            </View>
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: mutedText }]}>Phone</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
              placeholder="(913) 555-0123"
              placeholderTextColor={placeholder}
              value={form.phone}
              onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: mutedText }]}>Street address</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
              placeholder="123 Main St"
              placeholderTextColor={placeholder}
              value={form.streetAddress}
              onChangeText={(streetAddress) => setForm((f) => ({ ...f, streetAddress }))}
              textContentType="streetAddressLine1"
              autoComplete="street-address"
            />
          </View>

          <View style={styles.addressRow}>
            <View style={[styles.field, { flex: 2 }]}>
              <ThemedText style={[styles.fieldLabel, { color: mutedText }]}>City</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                placeholder="Topeka"
                placeholderTextColor={placeholder}
                value={form.city}
                onChangeText={(city) => setForm((f) => ({ ...f, city }))}
                textContentType="addressCity"
                autoComplete="postal-address-locality"
              />
            </View>
            <View style={[styles.field, { flex: 0.7 }]}>
              <ThemedText style={[styles.fieldLabel, { color: mutedText }]}>State</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                placeholder="KS"
                placeholderTextColor={placeholder}
                value={form.state}
                onChangeText={(state) => setForm((f) => ({ ...f, state }))}
                textContentType="addressState"
                autoComplete="postal-address-region"
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
            <View style={[styles.field, { flex: 1.2 }]}>
              <ThemedText style={[styles.fieldLabel, { color: mutedText }]}>ZIP</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                placeholder="66612"
                placeholderTextColor={placeholder}
                value={form.zip}
                onChangeText={(zip) => setForm((f) => ({ ...f, zip }))}
                keyboardType="number-pad"
                textContentType="postalCode"
                autoComplete="postal-code"
                maxLength={10}
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: tint },
              pressed && styles.saveButtonPressed,
              (isSaving || isFindingElecteds) && styles.saveButtonDisabled,
            ]}
            onPress={() => void handleSaveChanges()}
            disabled={isSaving || isFindingElecteds}
          >
            {isSaving || isFindingElecteds ? (
              <View style={styles.saveButtonBusyRow}>
                <ActivityIndicator color="#fff" size="small" />
                {isFindingElecteds && (
                  <ThemedText style={styles.saveButtonText}>Finding your electeds…</ThemedText>
                )}
              </View>
            ) : (
              <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
            )}
          </Pressable>
        </View>

        {/* Passkey enrollment (web only — WebAuthn needs the browser). */}
        {passkeysSupported() && (
          <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
            <ThemedText type="subtitle" style={styles.cardTitle}>Sign-in & Security</ThemedText>
            <ThemedText type="caption" style={[styles.cardHint, { color: mutedText }]}>
              Add a passkey to sign in with Face ID, Touch ID, or your device PIN instead of a
              password.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.passkeyButton,
                { borderColor: tint },
                pressed && styles.saveButtonPressed,
              ]}
              onPress={handleAddPasskey}
              disabled={isAddingPasskey}
            >
              {isAddingPasskey ? (
                <ActivityIndicator size="small" color={tint} />
              ) : (
                <>
                  <MaterialIcons name="fingerprint" size={20} color={tint} />
                  <ThemedText style={[styles.passkeyButtonText, { color: tint }]}>
                    Add a Passkey
                  </ThemedText>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Sign Out and Delete Account live at the bottom of Profile
            (matches iOS), each behind a confirmation. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={({ pressed }) => [
            styles.signOutButton,
            { backgroundColor: surface, borderColor: border },
            Shadows.sm,
            pressed && styles.saveButtonPressed,
          ]}
          onPress={() =>
            AppAlert.alert('Sign Out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: () => void logout() },
            ])
          }
        >
          <MaterialIcons name="logout" size={20} color="#fa3332" />
          <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.saveButtonPressed,
          ]}
          onPress={handleDeleteAccount}
          disabled={isDeletingAccount}
        >
          {isDeletingAccount ? (
            <ActivityIndicator size="small" color="#fa3332" />
          ) : (
            <>
              <MaterialIcons name="delete-outline" size={18} color="#fa3332" />
              <ThemedText style={styles.deleteText}>Delete Account</ThemedText>
            </>
          )}
        </Pressable>
      </ContentContainer>
    </ScrollView>
  );

  if (!isLoaded) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 90, android: 0 })}
      >
        {content}
      </KeyboardAvoidingView>

      {/* Confirm before the electeds found for a new address replace the
          user's current My Electeds (same flow as the Find Electeds screen). */}
      <Modal
        visible={pendingElecteds.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingElecteds([])}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: surface, borderColor: border }, Shadows.lg]}>
            <Pressable
              style={styles.modalClose}
              onPress={() => setPendingElecteds([])}
              hitSlop={12}
            >
              <MaterialIcons name="close" size={20} color={mutedText} />
            </Pressable>

            <View style={[styles.modalIcon, { backgroundColor: tint + '15' }]}>
              <MaterialIcons name="bookmark-add" size={28} color={tint} />
            </View>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Update your My Electeds?
            </ThemedText>
            <ThemedText style={[styles.modalBody, { color: mutedText }]}>
              We found {pendingElecteds.length} elected{pendingElecteds.length !== 1 ? 's' : ''} for
              your new address. Saving replaces your current My Electeds.
            </ThemedText>

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalPrimary,
                  { backgroundColor: tint },
                  pressed && styles.saveButtonPressed,
                  isSavingElecteds && styles.saveButtonDisabled,
                ]}
                onPress={() => void handleConfirmElecteds()}
                disabled={isSavingElecteds}
              >
                {isSavingElecteds ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.modalPrimaryText}>Save All</ThemedText>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalSecondary,
                  { borderColor: border },
                  pressed && styles.saveButtonPressed,
                ]}
                onPress={() => setPendingElecteds([])}
                disabled={isSavingElecteds}
              >
                <ThemedText style={[styles.modalSecondaryText, { color: mutedText }]}>No Thanks</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing['2xl'],
  },
  signOutText: {
    color: '#fa3332',
    fontWeight: '700',
    fontSize: 16,
  },
  passkeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 12,
    marginTop: Spacing.sm,
  },
  passkeyButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  deleteText: {
    color: '#fa3332',
    fontWeight: '600',
    fontSize: 14,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
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
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing['2xl'],
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
  },
  avatarInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roleChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  levelInfo: {
    flex: 1,
    gap: 2,
  },
  levelLabel: {
    fontSize: 12,
  },
  levelName: {
    fontSize: 16,
  },
  pointsColumn: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  pointsLabel: {
    fontSize: 11,
  },
  progressSection: {
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
  },
  barOuter: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barInner: {
    height: 6,
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  expandText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  cardHint: {
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  saveButton: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButtonBusyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  modalClose: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.xs,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  modalButtons: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    width: '100%',
  },
  modalPrimary: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalSecondary: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  field: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  addressRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
