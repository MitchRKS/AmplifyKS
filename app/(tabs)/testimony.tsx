import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { useThemeColor } from '@/hooks/use-theme-color';

type Position = 'support' | 'neutral' | 'oppose';

export default function TestimonyScreen() {
  const params = useLocalSearchParams();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [committee, setCommittee] = useState('');
  const [position, setPosition] = useState<Position>('support');
  const [summary, setSummary] = useState('');
  const [testimony, setTestimony] = useState('');

  // Pre-fill bill number and committee if coming from bill detail page
  useEffect(() => {
    if (params.billNumber && typeof params.billNumber === 'string') {
      setBillNumber(params.billNumber);
    }
    if (params.committee && typeof params.committee === 'string') {
      setCommittee(params.committee);
    }
  }, [params.billNumber, params.committee]);

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const organizationRef = useRef<TextInput>(null);
  const roleRef = useRef<TextInput>(null);
  const billNumberRef = useRef<TextInput>(null);
  const committeeRef = useRef<TextInput>(null);
  const summaryRef = useRef<TextInput>(null);
  const testimonyRef = useRef<TextInput>(null);

  const inputBackground = useThemeColor({ light: '#F2F2F7', dark: '#1C1C1E' }, 'background');
  const inputBorder = useThemeColor({ light: '#D1D1D6', dark: '#2C2C2E' }, 'background');
  const placeholder = useThemeColor({ light: '#8E8E93', dark: '#8E8E93' }, 'text');
  const tint = useThemeColor({ light: '#0a7ea4', dark: '#0a7ea4' }, 'tint');
  const mutedText = useThemeColor({ light: '#6C6C70', dark: '#A1A1A6' }, 'text');
  const cardBackground = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');
  const separator = useThemeColor({ light: '#E5E5EA', dark: '#38383A' }, 'background');

  const canSubmit = Boolean(firstName.trim() && lastName.trim() && email.trim() && billNumber.trim() && testimony.trim());

  const handleSubmit = () => {
    if (!canSubmit) {
      Alert.alert('Missing required info', 'Please fill in your first name, last name, email, bill number, and testimony.');
      return;
    }

    Alert.alert(
      'Ready to submit',
      'Your testimony is ready to submit. Hook this up to your backend to finalize the request.'
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Submit Testimony</ThemedText>
          <ThemedText style={styles.subtitle}>
            Provide your testimony for the selected piece of legislation. Required fields are marked.
          </ThemedText>

          {(params.billNumber || params.committee) && (
            <View style={[styles.billInfoCard, { backgroundColor: cardBackground, borderColor: separator }]}>
              {params.billNumber && (
                <View style={styles.billInfoRow}>
                  <ThemedText style={[styles.billInfoLabel, { color: mutedText }]}>Bill</ThemedText>
                  <ThemedText type="defaultSemiBold" style={[styles.billInfoValue, { color: tint }]}>
                    {params.billNumber}
                  </ThemedText>
                </View>
              )}
              {params.committee && (
                <View style={styles.billInfoRow}>
                  <ThemedText style={[styles.billInfoLabel, { color: mutedText }]}>Committee</ThemedText>
                  <ThemedText style={styles.billInfoValue}>{params.committee}</ThemedText>
                </View>
              )}
              {params.billTitle && (
                <View style={[styles.billInfoRow, styles.billInfoRowFull]}>
                  <ThemedText style={[styles.billInfoLabel, { color: mutedText }]}>Title</ThemedText>
                  <ThemedText style={[styles.billInfoValue, styles.billInfoValueMultiline]}>
                    {params.billTitle}
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          <View style={styles.section}>
            <ThemedText type="subtitle">Your Information</ThemedText>

            <ThemedText style={styles.label}>First name *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder }]}
              placeholder="Jane"
              placeholderTextColor={placeholder}
              value={firstName}
              onChangeText={setFirstName}
              textContentType="givenName"
              autoComplete="name-given"
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />

            <ThemedText style={styles.label}>Last name *</ThemedText>
            <TextInput
              ref={lastNameRef}
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder }]}
              placeholder="Doe"
              placeholderTextColor={placeholder}
              value={lastName}
              onChangeText={setLastName}
              textContentType="familyName"
              autoComplete="name-family"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <ThemedText style={styles.label}>Email *</ThemedText>
            <TextInput
              ref={emailRef}
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder }]}
              placeholder="jane@example.org"
              placeholderTextColor={placeholder}
              value={email}
              onChangeText={setEmail}
              textContentType="emailAddress"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />

            <ThemedText style={styles.label}>Phone</ThemedText>
            <TextInput
              ref={phoneRef}
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder }]}
              placeholder="(555) 123-4567"
              placeholderTextColor={placeholder}
              value={phone}
              onChangeText={setPhone}
              textContentType="telephoneNumber"
              autoComplete="tel"
              keyboardType="phone-pad"
              inputMode="tel"
              returnKeyType="next"
              onSubmitEditing={() => organizationRef.current?.focus()}
            />

            <ThemedText style={styles.label}>Organization</ThemedText>
            <TextInput
              ref={organizationRef}
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder }]}
              placeholder="Kansas Health Alliance"
              placeholderTextColor={placeholder}
              value={organization}
              onChangeText={setOrganization}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => roleRef.current?.focus()}
            />

            <ThemedText style={styles.label}>Role or title</ThemedText>
            <TextInput
              ref={roleRef}
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder }]}
              placeholder="Policy Director"
              placeholderTextColor={placeholder}
              value={role}
              onChangeText={setRole}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => billNumberRef.current?.focus()}
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Legislation</ThemedText>

            <ThemedText style={styles.label}>Bill number *</ThemedText>
            <TextInput
              ref={billNumberRef}
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder }]}
              placeholder="HB 2543"
              placeholderTextColor={placeholder}
              value={billNumber}
              onChangeText={setBillNumber}
              autoCapitalize="characters"
              returnKeyType="next"
              onSubmitEditing={() => committeeRef.current?.focus()}
            />

            <ThemedText style={styles.label}>Committee or hearing</ThemedText>
            <TextInput
              ref={committeeRef}
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder }]}
              placeholder="Senate Judiciary"
              placeholderTextColor={placeholder}
              value={committee}
              onChangeText={setCommittee}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => summaryRef.current?.focus()}
            />

            <ThemedText style={styles.label}>Position *</ThemedText>
            <View style={styles.segment}>
              {(['support', 'neutral', 'oppose'] as Position[]).map((choice) => {
                const selected = position === choice;
                return (
                  <Pressable
                    key={choice}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.segmentButton,
                      {
                        borderColor: selected ? tint : inputBorder,
                        backgroundColor: selected ? tint : inputBackground,
                      },
                    ]}
                    onPress={() => setPosition(choice)}>
                    <ThemedText style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                      {choice.charAt(0).toUpperCase() + choice.slice(1)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Testimony</ThemedText>

            <ThemedText style={styles.label}>Summary</ThemedText>
            <TextInput
              ref={summaryRef}
              style={[styles.input, styles.multiline, { backgroundColor: inputBackground, borderColor: inputBorder }]}
              placeholder="Short summary for the record"
              placeholderTextColor={placeholder}
              value={summary}
              onChangeText={setSummary}
              multiline
              textAlignVertical="top"
              returnKeyType="next"
              onSubmitEditing={() => testimonyRef.current?.focus()}
            />

            <ThemedText style={styles.label}>Full testimony *</ThemedText>
            <TextInput
              ref={testimonyRef}
              style={[styles.input, styles.multiline, { backgroundColor: inputBackground, borderColor: inputBorder }]}
              placeholder="Add detailed testimony..."
              placeholderTextColor={placeholder}
              value={testimony}
              onChangeText={setTestimony}
              multiline
              textAlignVertical="top"
            />
          </View>

          <Pressable
            accessibilityRole="button"
            style={[
              styles.submitButton,
              { backgroundColor: canSubmit ? tint : inputBorder },
            ]}
            onPress={handleSubmit}>
            <ThemedText style={styles.submitText}>Submit Testimony</ThemedText>
          </Pressable>

          <ThemedText style={[styles.footerText, { color: mutedText }]}>
            Submitted testimony becomes part of the public record.
          </ThemedText>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  subtitle: {
    marginTop: 6,
  },
  section: {
    gap: 12,
  },
  label: {
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
  multiline: {
    minHeight: 120,
  },
  segment: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentText: {
    fontWeight: '600',
  },
  segmentTextSelected: {
    color: '#fff',
  },
  submitButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
  },
  billInfoCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  billInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  billInfoRowFull: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  billInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 80,
  },
  billInfoValue: {
    fontSize: 15,
    flex: 1,
  },
  billInfoValueMultiline: {
    lineHeight: 20,
  },
});
