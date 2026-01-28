import * as MailComposer from "expo-mail-composer";
import * as Print from "expo-print";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getCommitteeEmail, hasCommitteeEmail } from "@/constants/committee-emails";
import { useThemeColor } from "@/hooks/use-theme-color";

type Position = "support" | "neutral" | "oppose";

// Map position values to display labels
const POSITION_LABELS: Record<Position, string> = {
  support: "Proponent",
  neutral: "Neutral",
  oppose: "Opponent",
};

// Stock opening and closing text for all testimonies
const STOCK_OPENING = `Chair and members of the committee:`;

const STOCK_CLOSING = `Thank you for the opportunity to testify and for your consideration of my testimony.`;

export default function TestimonyScreen() {
  const params = useLocalSearchParams();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [committee, setCommittee] = useState("");
  const [position, setPosition] = useState<Position>("support");
  const [summary, setSummary] = useState("");
  const [testimony, setTestimony] = useState("");

  // Pre-fill bill number and committee if coming from bill detail page
  useEffect(() => {
    if (params.billNumber && typeof params.billNumber === "string") {
      setBillNumber(params.billNumber);
    }
    if (params.committee && typeof params.committee === "string") {
      setCommittee(params.committee);
    }
  }, [params.billNumber, params.committee]);

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const streetAddressRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);
  const zipCodeRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const organizationRef = useRef<TextInput>(null);
  const roleRef = useRef<TextInput>(null);
  const billNumberRef = useRef<TextInput>(null);
  const committeeRef = useRef<TextInput>(null);
  const summaryRef = useRef<TextInput>(null);
  const testimonyRef = useRef<TextInput>(null);

  const inputBackground = useThemeColor(
    { light: "#F2F2F7", dark: "#1C1C1E" },
    "background",
  );
  const inputBorder = useThemeColor(
    { light: "#D1D1D6", dark: "#2C2C2E" },
    "background",
  );
  const inputText = useThemeColor(
    { light: "#000000", dark: "#FFFFFF" },
    "text",
  );
  const placeholder = useThemeColor(
    { light: "#8E8E93", dark: "#8E8E93" },
    "text",
  );
  const tint = useThemeColor({ light: "#0a7ea4", dark: "#0a7ea4" }, "tint");
  const mutedText = useThemeColor(
    { light: "#6C6C70", dark: "#A1A1A6" },
    "text",
  );
  const cardBackground = useThemeColor(
    { light: "#FFFFFF", dark: "#1C1C1E" },
    "background",
  );
  const separator = useThemeColor(
    { light: "#E5E5EA", dark: "#38383A" },
    "background",
  );

  const canSubmit = Boolean(
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    billNumber.trim() &&
    testimony.trim(),
  );

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const generateTestimonyHTML = () => {
    const positionText = POSITION_LABELS[position];
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Format current date
    const date = new Date();
    const formattedDate = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Combine stock opening, main testimony, and stock closing with signature
    let fullTestimony = '';
    if (STOCK_OPENING.trim()) {
      fullTestimony += escapeHtml(STOCK_OPENING.trim()) + '\n\n';
    }
    if (testimony.trim()) {
      fullTestimony += escapeHtml(testimony.trim());
    }
    if (STOCK_CLOSING.trim()) {
      fullTestimony += '\n\n' + escapeHtml(STOCK_CLOSING.trim());
    }
    // Add signature with name and city
    if (fullName) {
      fullTestimony += '\n\n' + escapeHtml(fullName);
    }
    if (city.trim()) {
      fullTestimony += '\n' + escapeHtml(city.trim());
    }

    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 12pt;
        line-height: 1.6;
        margin: 40px;
        color: #000;
      }
      .title {
        font-size: 18pt;
        font-weight: bold;
        margin-bottom: 30px;
        text-align: center;
      }
      .metadata {
        font-size: 12pt;
        margin-bottom: 5px;
      }
      .metadata-last {
        font-size: 12pt;
        margin-bottom: 30px;
      }
      .testimony-text {
        white-space: pre-wrap;
        line-height: 1.8;
        text-align: justify;
      }
    </style>
  </head>
  <body>
    <div class="title">${escapeHtml(positionText)} Testimony on ${escapeHtml(billNumber)}</div>
    
    <div class="metadata">${escapeHtml(formattedDate)}</div>
    <div class="metadata-last">${escapeHtml(committee || 'Committee')}</div>

    <div class="testimony-text">${fullTestimony}</div>
  </body>
</html>
    `;
  };

  const generateTestimonyText = () => {
    const positionText = POSITION_LABELS[position];
    const fullName = `${firstName} ${lastName}`.trim();

    // Build plain text version for email
    let fullTestimony = '';
    if (STOCK_OPENING.trim()) {
      fullTestimony += STOCK_OPENING.trim() + '\n\n';
    }
    if (testimony.trim()) {
      fullTestimony += testimony.trim();
    }
    if (STOCK_CLOSING.trim()) {
      fullTestimony += '\n\n' + STOCK_CLOSING.trim();
    }
    if (fullName) {
      fullTestimony += '\n\n' + fullName;
    }
    if (city.trim()) {
      fullTestimony += '\n' + city.trim();
    }

    return fullTestimony;
  };

  const handleSubmitEmail = async () => {
    if (!canSubmit) {
      Alert.alert(
        "Missing required info",
        "Please fill in your first name, last name, email, bill number, and testimony.",
      );
      return;
    }

    if (!committee.trim()) {
      Alert.alert(
        "Committee Required",
        "Please specify which committee should receive this testimony.",
      );
      return;
    }

    // Check if we have an email address for this committee
    const committeeEmail = getCommitteeEmail(committee.trim());
    
    if (!committeeEmail) {
      Alert.alert(
        "Committee Email Not Found",
        `No email address is configured for "${committee}". Please check the committee name or contact support to add this committee's email address.`,
      );
      return;
    }

    try {
      // Check if mail composer is available
      const isAvailable = await MailComposer.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert(
          "Email Not Available",
          "Email functionality is not available on this device. Please use the Preview option to save your testimony and send it manually.",
        );
        return;
      }

      const positionText = POSITION_LABELS[position];
      const subject = `${positionText} Testimony on ${billNumber}`;
      const fullName = `${firstName} ${lastName}`.trim();
      
      // Format current date
      const date = new Date();
      const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      // On native platforms, attach PDF. On web, send formatted text.
      if (Platform.OS === 'web') {
        // Web: Send formatted text email
        const body = `${positionText} Testimony on ${billNumber}\n${formattedDate}\n${committee}\n\n${generateTestimonyText()}`;
        
        await MailComposer.composeAsync({
          recipients: [committeeEmail],
          subject: subject,
          body: body,
        });
      } else {
        // Native platforms: Generate PDF and attach it
        const html = generateTestimonyHTML();
        const { uri } = await Print.printToFileAsync({ 
          html,
          base64: false,
        });
        
        // Simple email body with attachment reference
        const body = `Please find attached my ${positionText.toLowerCase()} testimony on ${billNumber}.\n\n${fullName}\n${city || ''}`;

        await MailComposer.composeAsync({
          recipients: [committeeEmail],
          subject: subject,
          body: body,
          attachments: [uri],
        });
      }

      // Note: We can't detect if the user actually sent the email or cancelled,
      // so we don't show a success message here
    } catch (error) {
      console.error("Error opening email composer:", error);
      Alert.alert(
        "Error",
        "Unable to open email composer. Please try again.",
      );
    }
  };

  const handlePreview = async () => {
    if (!canSubmit) {
      Alert.alert(
        "Missing required info",
        "Please fill in your first name, last name, email, bill number, and testimony.",
      );
      return;
    }

    try {
      const html = generateTestimonyHTML();
      
      // On web, open in new window (without print dialog)
      if (Platform.OS === "web") {
        const newWindow = window.open("", "_blank");
        if (newWindow) {
          newWindow.document.write(html);
          newWindow.document.close();
        } else {
          Alert.alert(
            "Popup Blocked",
            "Please allow popups to preview your testimony.",
          );
        }
      }
      // On iOS and Android, generate PDF file and share it
      else {
        const { uri } = await Print.printToFileAsync({ html });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert(
            "PDF Generated",
            `Your testimony has been generated as a PDF at: ${uri}`,
          );
        }
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert(
        "Error",
        "Unable to generate PDF preview. Please try again.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <ThemedText type="title" style={styles.centeredTitle}>
              Draft Testimony
            </ThemedText>
            <ThemedText style={[styles.subtitle, styles.centeredSubtitle]}>
              Provide your testimony for the selected piece of legislation.
              Required fields are marked.
            </ThemedText>
          </View>

          {(params.billNumber || params.committee) && (
            <View
              style={[
                styles.billInfoCard,
                styles.billInfoCardCentered,
                { backgroundColor: cardBackground, borderColor: separator },
              ]}
            >
              {params.billNumber && (
                <View style={styles.billInfoRow}>
                  <ThemedText
                    style={[styles.billInfoLabel, { color: mutedText }]}
                  >
                    Bill
                  </ThemedText>
                  <ThemedText
                    type="defaultSemiBold"
                    style={[styles.billInfoValue, { color: tint }]}
                  >
                    {params.billNumber}
                  </ThemedText>
                </View>
              )}
              {params.committee && (
                <View style={styles.billInfoRow}>
                  <ThemedText
                    style={[styles.billInfoLabel, { color: mutedText }]}
                  >
                    Committee
                  </ThemedText>
                  <ThemedText style={styles.billInfoValue}>
                    {params.committee}
                  </ThemedText>
                </View>
              )}
              {params.billTitle && (
                <View style={[styles.billInfoRow, styles.billInfoRowFull]}>
                  <ThemedText
                    style={[styles.billInfoLabel, { color: mutedText }]}
                  >
                    Title
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.billInfoValue,
                      styles.billInfoValueMultiline,
                    ]}
                  >
                    {params.billTitle}
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          <View style={styles.section}>
            <ThemedText type="subtitle">Testimony</ThemedText>

            <ThemedText style={[styles.label, { color: mutedText }]}>
              Stock opening (automatically included)
            </ThemedText>
            <View
              style={[
                styles.stockTextContainer,
                { backgroundColor: inputBackground, borderColor: separator },
              ]}
            >
              <ThemedText style={[styles.stockText, { color: mutedText }]}>
                {STOCK_OPENING}
              </ThemedText>
            </View>

            <ThemedText style={styles.label}>Your testimony *</ThemedText>
            <TextInput
              ref={testimonyRef}
              style={[
                styles.input,
                styles.multiline,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText },
              ]}
              placeholder="Add detailed testimony..."
              placeholderTextColor={placeholder}
              value={testimony}
              onChangeText={setTestimony}
              multiline
              textAlignVertical="top"
            />

            <ThemedText style={[styles.label, { color: mutedText }]}>
              Stock closing (automatically included)
            </ThemedText>
            <View
              style={[
                styles.stockTextContainer,
                { backgroundColor: inputBackground, borderColor: separator },
              ]}
            >
              <ThemedText style={[styles.stockText, { color: mutedText }]}>
                {STOCK_CLOSING}
              </ThemedText>
              <ThemedText style={[styles.stockText, { color: mutedText, marginTop: 12 }]}>
                {firstName && lastName ? `${firstName} ${lastName}` : '[Your Name]'}
              </ThemedText>
              <ThemedText style={[styles.stockText, { color: mutedText }]}>
                {city || '[Your City]'}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={styles.label}>Position *</ThemedText>
          <View style={styles.segment}>
            {(["support", "neutral", "oppose"] as Position[]).map((choice) => {
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
                  onPress={() => setPosition(choice)}
                >
                  <ThemedText
                    style={[
                      styles.segmentText,
                      selected && styles.segmentTextSelected,
                    ]}
                  >
                    {POSITION_LABELS[choice]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Your Information</ThemedText>

            <ThemedText style={styles.label}>First name *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText },
              ]}
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
              style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText },
              ]}
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
              style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText },
              ]}
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

            <ThemedText style={styles.label}>Street Address</ThemedText>
            <TextInput
              ref={streetAddressRef}
              style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText },
              ]}
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

            <ThemedText style={styles.label}>City</ThemedText>
            <TextInput
              ref={cityRef}
              style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText },
              ]}
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

            <ThemedText style={styles.label}>State</ThemedText>
            <TextInput
              ref={stateRef}
              style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText },
              ]}
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

            <ThemedText style={styles.label}>Zip Code</ThemedText>
            <TextInput
              ref={zipCodeRef}
              style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText },
              ]}
              placeholder="66612"
              placeholderTextColor={placeholder}
              value={zipCode}
              onChangeText={setZipCode}
              textContentType="postalCode"
              autoComplete="postal-code"
              keyboardType="number-pad"
              inputMode="numeric"
              returnKeyType="next"
              onSubmitEditing={() => billNumberRef.current?.focus()}
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="subtitle">Legislation</ThemedText>

            <ThemedText style={styles.label}>Bill number *</ThemedText>
            <TextInput
              ref={billNumberRef}
              style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText },
              ]}
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
              style={[
                styles.input,
                { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText },
              ]}
              placeholder="Senate Judiciary"
              placeholderTextColor={placeholder}
              value={committee}
              onChangeText={setCommittee}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => testimonyRef.current?.focus()}
            />
          </View>

          {committee.trim() && hasCommitteeEmail(committee.trim()) ? (
            <>
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.submitButton,
                  styles.primaryButton,
                  { backgroundColor: canSubmit ? tint : inputBorder },
                ]}
                onPress={handleSubmitEmail}
                disabled={!canSubmit}
              >
                <ThemedText style={styles.submitText}>Submit via Email</ThemedText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                style={[
                  styles.submitButton,
                  styles.secondaryButton,
                  { 
                    backgroundColor: 'transparent',
                    borderColor: canSubmit ? tint : inputBorder,
                    borderWidth: 1,
                  },
                ]}
                onPress={handlePreview}
                disabled={!canSubmit}
              >
                <ThemedText style={[styles.submitText, { color: canSubmit ? tint : inputBorder }]}>
                  Preview Testimony
                </ThemedText>
              </Pressable>

              <ThemedText style={[styles.footerText, { color: mutedText }]}>
                This will open your email app with the testimony pre-filled and addressed to {committee}.
              </ThemedText>
            </>
          ) : committee.trim() ? (
            <>
              <View style={[styles.infoBox, { backgroundColor: inputBackground, borderColor: separator }]}>
                <ThemedText style={[styles.infoBoxText, { color: mutedText }]}>
                  No email address configured for "{committee}". Use Preview to save your testimony and submit it manually.
                </ThemedText>
              </View>

              <Pressable
                accessibilityRole="button"
                style={[
                  styles.submitButton,
                  { backgroundColor: canSubmit ? tint : inputBorder },
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
              style={[
                styles.submitButton,
                { backgroundColor: canSubmit ? tint : inputBorder },
              ]}
              onPress={handlePreview}
              disabled={!canSubmit}
            >
              <ThemedText style={styles.submitText}>Preview Testimony</ThemedText>
            </Pressable>
          )}

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
  headerContainer: {
    alignItems: "center",
  },
  centeredTitle: {
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
  },
  centeredSubtitle: {
    textAlign: "center",
  },
  section: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
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
  stockTextContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stockText: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: "italic",
  },
  segment: {
    flexDirection: "row",
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentText: {
    fontWeight: "600",
  },
  segmentTextSelected: {
    color: "#fff",
  },
  submitButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButton: {
    marginBottom: 8,
  },
  secondaryButton: {
    marginBottom: 8,
  },
  submitText: {
    color: "#fff",
    fontWeight: "600",
  },
  footerText: {
    fontSize: 13,
    textAlign: "center",
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  billInfoCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  billInfoCardCentered: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 600,
  },
  billInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  billInfoRowFull: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
  },
  billInfoLabel: {
    fontSize: 14,
    fontWeight: "600",
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
