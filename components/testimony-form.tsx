import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getCommitteeEmail, hasCommitteeEmail } from '@/constants/committee-emails';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

type Position = 'support' | 'neutral' | 'oppose';

const POSITION_LABELS: Record<Position, string> = {
  support: 'Proponent',
  neutral: 'Neutral',
  oppose: 'Opponent',
};

const STOCK_OPENING = 'Chair and members of the committee:';
const STOCK_CLOSING =
  'Thank you for the opportunity to testify and for your consideration of my testimony.';

interface TestimonyFormProps {
  billNumber: string;
  billTitle: string;
  committee: string;
}

export function TestimonyForm({ billNumber, billTitle, committee }: TestimonyFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [position, setPosition] = useState<Position>('support');
  const [testimony, setTestimony] = useState('');

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const streetAddressRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);
  const zipCodeRef = useRef<TextInput>(null);
  const testimonyRef = useRef<TextInput>(null);

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#1C1F26' }, 'background');
  const inputBorder = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholder = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');

  const canSubmit = Boolean(
    firstName.trim() && lastName.trim() && email.trim() && billNumber.trim() && testimony.trim(),
  );

  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const generateTestimonyHTML = () => {
    const positionText = POSITION_LABELS[position];
    const fullName = `${firstName} ${lastName}`.trim();
    const formattedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let fullTestimony = '';
    if (STOCK_OPENING.trim()) fullTestimony += escapeHtml(STOCK_OPENING.trim()) + '\n\n';
    if (testimony.trim()) fullTestimony += escapeHtml(testimony.trim());
    if (STOCK_CLOSING.trim()) fullTestimony += '\n\n' + escapeHtml(STOCK_CLOSING.trim());
    if (fullName) fullTestimony += '\n\n' + escapeHtml(fullName);
    if (city.trim()) fullTestimony += '\n' + escapeHtml(city.trim());

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12pt; line-height: 1.6; margin: 40px; color: #000; }
      .title { font-size: 18pt; font-weight: bold; margin-bottom: 30px; text-align: center; }
      .metadata { font-size: 12pt; margin-bottom: 5px; }
      .metadata-last { font-size: 12pt; margin-bottom: 30px; }
      .testimony-text { white-space: pre-wrap; line-height: 1.8; text-align: justify; }
    </style>
  </head>
  <body>
    <div class="title">${escapeHtml(positionText)} Testimony on ${escapeHtml(billNumber)}</div>
    <div class="metadata">${escapeHtml(formattedDate)}</div>
    <div class="metadata-last">${escapeHtml(committee || 'Committee')}</div>
    <div class="testimony-text">${fullTestimony}</div>
  </body>
</html>`;
  };

  const generateTestimonyText = () => {
    const fullName = `${firstName} ${lastName}`.trim();
    let text = '';
    if (STOCK_OPENING.trim()) text += STOCK_OPENING.trim() + '\n\n';
    if (testimony.trim()) text += testimony.trim();
    if (STOCK_CLOSING.trim()) text += '\n\n' + STOCK_CLOSING.trim();
    if (fullName) text += '\n\n' + fullName;
    if (city.trim()) text += '\n' + city.trim();
    return text;
  };

  const handleSubmitEmail = async () => {
    if (!canSubmit) {
      Alert.alert(
        'Missing required info',
        'Please fill in your first name, last name, email, bill number, and testimony.',
      );
      return;
    }

    if (!committee.trim()) {
      Alert.alert('Committee Required', 'Please specify which committee should receive this testimony.');
      return;
    }

    const committeeEmail = getCommitteeEmail(committee.trim());
    if (!committeeEmail) {
      Alert.alert(
        'Committee Email Not Found',
        `No email address is configured for "${committee}". Please check the committee name or contact support.`,
      );
      return;
    }

    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          'Email Not Available',
          'Email functionality is not available on this device. Please use the Preview option.',
        );
        return;
      }

      const positionText = POSITION_LABELS[position];
      const subject = `${positionText} Testimony on ${billNumber}`;
      const fullName = `${firstName} ${lastName}`.trim();
      const formattedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (Platform.OS === 'web') {
        const body = `${positionText} Testimony on ${billNumber}\n${formattedDate}\n${committee}\n\n${generateTestimonyText()}`;
        await MailComposer.composeAsync({ recipients: [committeeEmail], subject, body });
      } else {
        const html = generateTestimonyHTML();
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const body = `Please find attached my ${positionText.toLowerCase()} testimony on ${billNumber}.\n\n${fullName}\n${city || ''}`;
        await MailComposer.composeAsync({ recipients: [committeeEmail], subject, body, attachments: [uri] });
      }
    } catch (error) {
      console.error('Error opening email composer:', error);
      Alert.alert('Error', 'Unable to open email composer. Please try again.');
    }
  };

  const handlePreview = async () => {
    if (!canSubmit) {
      Alert.alert(
        'Missing required info',
        'Please fill in your first name, last name, email, bill number, and testimony.',
      );
      return;
    }

    try {
      const html = generateTestimonyHTML();
      if (Platform.OS === 'web') {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(html);
          newWindow.document.close();
        } else {
          Alert.alert('Popup Blocked', 'Please allow popups to preview your testimony.');
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('PDF Generated', `Your testimony has been generated as a PDF at: ${uri}`);
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Unable to generate PDF preview. Please try again.');
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.billInfoCard, { backgroundColor: tint + '08', borderColor: tint + '25' }]}>
        {billNumber ? (
          <View style={styles.billInfoRow}>
            <ThemedText type="caption" style={[styles.billInfoLabel, { color: mutedText }]}>Bill</ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: tint }}>{billNumber}</ThemedText>
          </View>
        ) : null}
        {committee ? (
          <View style={styles.billInfoRow}>
            <ThemedText type="caption" style={[styles.billInfoLabel, { color: mutedText }]}>Committee</ThemedText>
            <ThemedText>{committee}</ThemedText>
          </View>
        ) : null}
        {billTitle ? (
          <View style={[styles.billInfoRow, styles.billInfoRowFull]}>
            <ThemedText type="caption" style={[styles.billInfoLabel, { color: mutedText }]}>Title</ThemedText>
            <ThemedText style={styles.billInfoValueMultiline}>{billTitle}</ThemedText>
          </View>
        ) : null}
      </View>

      <View style={[styles.formCard, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
        <ThemedText type="subtitle" style={styles.cardTitle}>Testimony</ThemedText>

        <ThemedText type="caption" style={[styles.fieldHint, { color: mutedText }]}>
          Stock opening (automatically included)
        </ThemedText>
        <View style={[styles.stockTextContainer, { backgroundColor: inputBackground, borderColor: border }]}>
          <ThemedText style={[styles.stockText, { color: mutedText }]}>{STOCK_OPENING}</ThemedText>
        </View>

        <ThemedText style={styles.label}>Your testimony *</ThemedText>
        <TextInput
          ref={testimonyRef}
          style={[styles.input, styles.multiline, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
          placeholder="Add detailed testimony..."
          placeholderTextColor={placeholder}
          value={testimony}
          onChangeText={setTestimony}
          multiline
          textAlignVertical="top"
        />

        <ThemedText type="caption" style={[styles.fieldHint, { color: mutedText }]}>
          Stock closing (automatically included)
        </ThemedText>
        <View style={[styles.stockTextContainer, { backgroundColor: inputBackground, borderColor: border }]}>
          <ThemedText style={[styles.stockText, { color: mutedText }]}>{STOCK_CLOSING}</ThemedText>
          <ThemedText style={[styles.stockText, { color: mutedText, marginTop: Spacing.md }]}>
            {firstName && lastName ? `${firstName} ${lastName}` : '[Your Name]'}
          </ThemedText>
          <ThemedText style={[styles.stockText, { color: mutedText }]}>{city || '[Your City]'}</ThemedText>
        </View>

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
                  { borderColor: selected ? tint : inputBorder, backgroundColor: selected ? tint : 'transparent' },
                ]}
                onPress={() => setPosition(choice)}
              >
                <ThemedText style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                  {POSITION_LABELS[choice]}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.formCard, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
        <ThemedText type="subtitle" style={styles.cardTitle}>Your Information</ThemedText>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <ThemedText style={styles.label}>First name *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
              placeholder="Jane"
              placeholderTextColor={placeholder}
              value={firstName}
              onChangeText={setFirstName}
              textContentType="givenName"
              autoComplete="name-given"
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <ThemedText style={styles.label}>Last name *</ThemedText>
            <TextInput
              ref={lastNameRef}
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
              placeholder="Doe"
              placeholderTextColor={placeholder}
              value={lastName}
              onChangeText={setLastName}
              textContentType="familyName"
              autoComplete="name-family"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </View>
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>Email *</ThemedText>
          <TextInput
            ref={emailRef}
            style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
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
            onSubmitEditing={() => streetAddressRef.current?.focus()}
          />
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>Street Address</ThemedText>
          <TextInput
            ref={streetAddressRef}
            style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
            placeholder="123 Main Street"
            placeholderTextColor={placeholder}
            value={streetAddress}
            onChangeText={setStreetAddress}
            textContentType="streetAddressLine1"
            autoComplete="street-address"
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => cityRef.current?.focus()}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 2 }]}>
            <ThemedText style={styles.label}>City</ThemedText>
            <TextInput
              ref={cityRef}
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
              placeholder="Topeka"
              placeholderTextColor={placeholder}
              value={city}
              onChangeText={setCity}
              textContentType="addressCity"
              autoComplete="postal-address-locality"
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => stateRef.current?.focus()}
            />
          </View>
          <View style={[styles.field, { flex: 0.8 }]}>
            <ThemedText style={styles.label}>State</ThemedText>
            <TextInput
              ref={stateRef}
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
              placeholder="KS"
              placeholderTextColor={placeholder}
              value={state}
              onChangeText={setState}
              textContentType="addressState"
              autoComplete="postal-address-region"
              autoCapitalize="characters"
              returnKeyType="next"
              onSubmitEditing={() => zipCodeRef.current?.focus()}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <ThemedText style={styles.label}>Zip</ThemedText>
            <TextInput
              ref={zipCodeRef}
              style={[styles.input, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
              placeholder="66612"
              placeholderTextColor={placeholder}
              value={zipCode}
              onChangeText={setZipCode}
              textContentType="postalCode"
              autoComplete="postal-code"
              keyboardType="number-pad"
              inputMode="numeric"
              returnKeyType="done"
            />
          </View>
        </View>
      </View>

      {committee.trim() && hasCommitteeEmail(committee.trim()) ? (
        <>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: canSubmit ? tint : inputBorder },
              pressed && canSubmit && styles.pressed,
            ]}
            onPress={handleSubmitEmail}
            disabled={!canSubmit}
          >
            <ThemedText style={styles.submitText}>Submit via Email</ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.submitButton,
              styles.secondaryButton,
              { backgroundColor: 'transparent', borderColor: canSubmit ? tint : inputBorder },
              pressed && canSubmit && styles.pressed,
            ]}
            onPress={handlePreview}
            disabled={!canSubmit}
          >
            <ThemedText style={[styles.submitText, { color: canSubmit ? tint : inputBorder }]}>
              Preview Testimony
            </ThemedText>
          </Pressable>

          <ThemedText type="caption" style={[styles.footerText, { color: mutedText }]}>
            This will open your email app with the testimony pre-filled and addressed to {committee}.
          </ThemedText>
        </>
      ) : committee.trim() ? (
        <>
          <View style={[styles.infoBox, { backgroundColor: inputBackground, borderColor: border }]}>
            <ThemedText type="caption" style={[styles.infoBoxText, { color: mutedText }]}>
              No email address configured for &quot;{committee}&quot;. Use Preview to save your testimony and submit it
              manually.
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: canSubmit ? tint : inputBorder },
              pressed && canSubmit && styles.pressed,
            ]}
            onPress={handlePreview}
            disabled={!canSubmit}
          >
            <ThemedText style={styles.submitText}>Preview Testimony</ThemedText>
          </Pressable>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: canSubmit ? tint : inputBorder },
            pressed && canSubmit && styles.pressed,
          ]}
          onPress={handlePreview}
          disabled={!canSubmit}
        >
          <ThemedText style={styles.submitText}>Preview Testimony</ThemedText>
        </Pressable>
      )}

      <ThemedText type="caption" style={[styles.footerText, { color: mutedText }]}>
        Submitted testimony becomes part of the public record.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.lg,
  },
  billInfoCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  billInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  billInfoRowFull: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  billInfoLabel: {
    fontWeight: '600',
    minWidth: 80,
  },
  billInfoValueMultiline: {
    lineHeight: 20,
  },
  formCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  fieldHint: {
    marginTop: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: {
    minHeight: 120,
  },
  stockTextContainer: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stockText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  segmentButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.full,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentText: {
    fontWeight: '700',
    fontSize: 15,
  },
  segmentTextSelected: {
    color: '#fff',
  },
  submitButton: {
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 1.5,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  footerText: {
    textAlign: 'center',
    lineHeight: 18,
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  infoBoxText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
