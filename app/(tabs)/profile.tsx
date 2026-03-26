import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ContentContainer } from '@/components/content-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useUserProfile, type UserProfile } from '@/hooks/use-user-profile';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { profile, isLoaded, isSaving, updateProfile } = useUserProfile();
  const [form, setForm] = useState<UserProfile>({
    phone: '',
    streetAddress: '',
    city: '',
    state: 'KS',
    zip: '',
    role: 'user',
  });

  useEffect(() => {
    if (isLoaded) {
      setForm(profile);
    }
  }, [isLoaded, profile]);

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#252830' }, 'background');
  const inputBorder = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholder = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() || 'No name set' : '';
  const initials = user
    ? `${user.firstName.charAt(0) || ''}${user.lastName.charAt(0) || ''}`.toUpperCase() || '?'
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
          <ThemedText style={[styles.subtitle, { color: mutedText }]}>
            Your AmplifyKS account
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: tint + '15' }]}>
              <ThemedText style={[styles.avatarText, { color: tint }]}>{initials}</ThemedText>
            </View>
            <View style={styles.avatarInfo}>
              <View style={styles.nameRow}>
                <ThemedText type="subtitle">{fullName}</ThemedText>
                {profile.role === 'admin' && (
                  <View style={[styles.adminBadge, { backgroundColor: tint + '15' }]}>
                    <ThemedText style={[styles.adminBadgeText, { color: tint }]}>Admin</ThemedText>
                  </View>
                )}
              </View>
              <ThemedText type="caption" style={{ color: mutedText }}>
                {user?.email || 'Not set'}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>Personal Info</ThemedText>
          <ThemedText type="caption" style={[styles.cardHint, { color: mutedText }]}>
            Used when submitting testimony and contacting lawmakers
          </ThemedText>

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
              isSaving && styles.saveButtonDisabled,
            ]}
            onPress={() => updateProfile(form)}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
            )}
          </Pressable>
        </View>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingBottom: Spacing.xl,
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
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
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
