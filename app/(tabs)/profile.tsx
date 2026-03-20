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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
  });

  useEffect(() => {
    if (isLoaded) {
      setForm(profile);
    }
  }, [isLoaded, profile]);

  const cardBackground = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');
  const inputBackground = useThemeColor({ light: '#F2F2F7', dark: '#1C1C1E' }, 'background');
  const inputBorder = useThemeColor({ light: '#D1D1D6', dark: '#2C2C2E' }, 'background');
  const inputText = useThemeColor({ light: '#000000', dark: '#FFFFFF' }, 'text');
  const placeholder = useThemeColor({ light: '#8E8E93', dark: '#8E8E93' }, 'text');
  const tint = useThemeColor({ light: '#0a7ea4', dark: '#0a7ea4' }, 'tint');
  const mutedText = useThemeColor({ light: '#6C6C70', dark: '#A1A1A6' }, 'text');
  const separator = useThemeColor({ light: '#E5E5EA', dark: '#38383A' }, 'background');

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
      <View style={styles.header}>
        <ThemedText type="title">Profile</ThemedText>
        <ThemedText style={[styles.subtitle, { color: mutedText }]}>
          Your AmplifyKS account
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: cardBackground, borderColor: separator }]}>
        <View style={[styles.avatar, { backgroundColor: inputBackground }]}>
          <ThemedText style={[styles.avatarText, { color: tint }]}>{initials}</ThemedText>
        </View>

        <View style={styles.info}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Name
          </ThemedText>
          <ThemedText style={[styles.value, { color: mutedText }]}>{fullName}</ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: separator }]} />

        <View style={styles.info}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Email
          </ThemedText>
          <ThemedText style={[styles.value, { color: mutedText }]}>
            {user?.email || 'Not set'}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: cardBackground, borderColor: separator }]}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Personal Info</ThemedText>
        </View>
        <ThemedText style={[styles.sectionHint, { color: mutedText }]}>
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
          <View style={[styles.field, styles.fieldCity]}>
            <ThemedText style={[styles.fieldLabel, { color: mutedText }]}>City</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
              placeholder="Topeka"
              placeholderTextColor={placeholder}
              value={form.city}
              onChangeText={(city) => setForm((f) => ({ ...f, city }))}
              textContentType="addressCity"
              autoComplete="address-level2"
            />
          </View>
          <View style={[styles.field, styles.fieldState]}>
            <ThemedText style={[styles.fieldLabel, { color: mutedText }]}>State</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
              placeholder="KS"
              placeholderTextColor={placeholder}
              value={form.state}
              onChangeText={(state) => setForm((f) => ({ ...f, state }))}
              textContentType="addressState"
              autoComplete="address-level1"
              maxLength={2}
              autoCapitalize="characters"
            />
          </View>
          <View style={[styles.field, styles.fieldZip]}>
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
            <ThemedText style={styles.saveButtonText}>Save</ThemedText>
          )}
        </Pressable>
      </View>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    paddingBottom: 20,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
  },
  info: {
    width: '100%',
    gap: 4,
  },
  label: {
    fontSize: 12,
  },
  value: {
    fontSize: 16,
  },
  divider: {
    width: '100%',
    height: 1,
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 14,
    marginBottom: 16,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  field: {
    gap: 6,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldCity: {
    flex: 2,
    marginBottom: 14,
  },
  fieldState: {
    flex: 0.6,
    marginBottom: 14,
  },
  fieldZip: {
    flex: 1.2,
    marginBottom: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
