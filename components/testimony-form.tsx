import * as MailComposer from 'expo-mail-composer';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppAlert } from '@/components/app-alert';
import { ThemedText } from '@/components/themed-text';
import { getCommitteeEmail, hasCommitteeEmail } from '@/constants/committee-emails';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useGamification } from '@/contexts/gamification-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getFirestoreDb } from '@/services/firebase';

// Deliberately loose: enough to catch obvious junk ("asdf", stray spaces),
// not a full RFC 5322 validator (those reject valid addresses and give a
// false sense of rigor). Email is stored on the private record only.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Messaging per expo-mail-composer's MailComposerResult status. On web,
// composeAsync just opens a mailto: link and can never report more than
// 'undetermined' — there's no way for the app to know if the user actually
// hit send in their external mail client, so that case is worded as
// uncertain rather than claiming a false success.
const STATUS_MESSAGES: Record<string, { title: string; message: string }> = {
  sent: {
    title: 'Testimony Sent',
    message: 'Your testimony was sent to the committee. Thank you for participating!',
  },
  saved: {
    title: 'Draft Saved',
    message:
      "Your testimony was saved as a draft but hasn't been sent yet. Open your mail app to finish sending it.",
  },
  cancelled: {
    title: 'Cancelled',
    message: "You cancelled without sending. Your testimony wasn't submitted.",
  },
  undetermined: {
    title: 'Email App Opened',
    message:
      "Your email app should now be open with your testimony ready to send. Please review it and hit send — we can't confirm delivery from within Amplify.",
  },
};

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
  const { user } = useAuth();
  const { profile, isLoaded: profileLoaded } = useUserProfile();
  const { recordAction } = useGamification();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('KS');
  const [zipCode, setZipCode] = useState('');
  const [position, setPosition] = useState<Position>('support');
  const [testimony, setTestimony] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Seed the contact fields once from the signed-in profile so users don't
  // re-type their name/email/address on every submission. Only fills fields
  // the user hasn't already edited (functional updater guards against clobber),
  // and runs once — after the async profile load resolves.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !profileLoaded) return;
    seededRef.current = true;
    if (user) {
      setFirstName((prev) => prev || user.firstName || '');
      setLastName((prev) => prev || user.lastName || '');
      setEmail((prev) => prev || user.email || '');
    }
    setStreetAddress((prev) => prev || profile.streetAddress || '');
    setCity((prev) => prev || profile.city || '');
    setState((prev) => prev || profile.state || 'KS');
    setZipCode((prev) => prev || profile.zip || '');
  }, [profileLoaded, user, profile]);

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
    if (submitting) return;

    if (!canSubmit) {
      AppAlert.alert(
        'Missing required info',
        'Please fill in your first name, last name, email, bill number, and testimony.',
      );
      return;
    }

    if (!EMAIL_RE.test(email.trim())) {
      AppAlert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (!committee.trim()) {
      AppAlert.alert('Committee Required', 'Please specify which committee should receive this testimony.');
      return;
    }

    const committeeEmail = getCommitteeEmail(committee.trim());
    if (!committeeEmail) {
      AppAlert.alert(
        'Committee Email Not Found',
        `No email address is configured for "${committee}". Please check the committee name or contact support.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        AppAlert.alert(
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

      let result: MailComposer.MailComposerResult;
      if (Platform.OS === 'web') {
        const body = `${positionText} Testimony on ${billNumber}\n${formattedDate}\n${committee}\n\n${generateTestimonyText()}`;
        result = await MailComposer.composeAsync({ recipients: [committeeEmail], subject, body });
      } else {
        const html = generateTestimonyHTML();
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const body = `Please find attached my ${positionText.toLowerCase()} testimony on ${billNumber}.\n\n${fullName}\n${city || ''}`;
        result = await MailComposer.composeAsync({ recipients: [committeeEmail], subject, body, attachments: [uri] });
      }

      if (user) {
        try {
          await addDoc(collection(getFirestoreDb(), 'testimonies'), {
            userId: user.uid,
            billNumber,
            billTitle,
            committee,
            committeeEmail,
            position,
            firstName,
            lastName,
            email,
            streetAddress,
            city,
            state,
            zipCode,
            testimony,
            status: result.status,
            submittedAt: Timestamp.now(),
          });
        } catch (firestoreError) {
          // Don't let a record-keeping failure mask whether the email itself went out.
          console.error('Error saving testimony record:', firestoreError);
        }

        // Credit the advocacy action unless the user explicitly bailed out of
        // the composer. Uses the existing 'Contact Legislator' action (there's
        // no dedicated testimony action yet); award-on-attempt matches how
        // Contact Legislator is recorded elsewhere. Note the composer result is
        // only trustworthy on iOS — web is always 'undetermined', Android always
        // 'sent' — so 'cancelled' (iOS-only signal) is the one case we skip.
        if (result.status !== 'cancelled') {
          recordAction('Contact Legislator', `Testimony on ${billNumber}`);
        }
      }

      const feedback = STATUS_MESSAGES[result.status] ?? STATUS_MESSAGES.undetermined;
      AppAlert.alert(feedback.title, feedback.message);
    } catch (error) {
      console.error('Error opening email composer:', error);
      AppAlert.alert('Error', 'Unable to open email composer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreview = async () => {
    if (!canSubmit) {
      AppAlert.alert(
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
          AppAlert.alert('Popup Blocked', 'Please allow popups to preview your testimony.');
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri);
        } else {
          AppAlert.alert('PDF Generated', `Your testimony has been generated as a PDF at: ${uri}`);
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      AppAlert.alert('Error', 'Unable to generate PDF preview. Please try again.');
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
          accessibilityLabel="Your testimony, required"
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
              accessibilityLabel="First name, required"
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
              accessibilityLabel="Last name, required"
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
            accessibilityLabel="Email, required"
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
            accessibilityLabel="Street address, optional"
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
              accessibilityLabel="City, optional"
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
              accessibilityLabel="State, optional"
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
              accessibilityLabel="Zip code, optional"
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
            accessibilityState={{ disabled: !canSubmit || submitting, busy: submitting }}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: canSubmit && !submitting ? tint : inputBorder },
              pressed && canSubmit && !submitting && styles.pressed,
            ]}
            onPress={handleSubmitEmail}
            disabled={!canSubmit || submitting}
          >
            <ThemedText style={[styles.submitText, { color: canSubmit ? '#fff' : mutedText }]}>
              {submitting ? 'Opening Email…' : 'Submit via Email'}
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            style={({ pressed }) => [
              styles.submitButton,
              styles.secondaryButton,
              { backgroundColor: 'transparent', borderColor: canSubmit ? tint : inputBorder },
              pressed && canSubmit && styles.pressed,
            ]}
            onPress={handlePreview}
            disabled={!canSubmit}
          >
            <ThemedText style={[styles.submitText, { color: canSubmit ? tint : mutedText }]}>
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
              We don&apos;t have a direct email on file for &quot;{committee}&quot;. Use Preview to
              save your testimony, then look up the committee&apos;s current contact info on the{' '}
              <ThemedText
                type="caption"
                accessibilityRole="link"
                style={[styles.infoBoxLink, { color: tint }]}
                onPress={() =>
                  Linking.openURL('https://www.kslegislature.gov/li/b2025_26/committees/')
                }
              >
                Kansas Legislature committee directory
              </ThemedText>
              .
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: canSubmit ? tint : inputBorder },
              pressed && canSubmit && styles.pressed,
            ]}
            onPress={handlePreview}
            disabled={!canSubmit}
          >
            <ThemedText style={[styles.submitText, { color: canSubmit ? '#fff' : mutedText }]}>
              Preview Testimony
            </ThemedText>
          </Pressable>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: canSubmit ? tint : inputBorder },
            pressed && canSubmit && styles.pressed,
          ]}
          onPress={handlePreview}
          disabled={!canSubmit}
        >
          <ThemedText style={[styles.submitText, { color: canSubmit ? '#fff' : mutedText }]}>
            Preview Testimony
          </ThemedText>
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
  infoBoxLink: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
