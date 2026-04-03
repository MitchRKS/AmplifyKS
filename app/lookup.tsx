import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
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
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getOfficialsByLocation, type Official } from '@/services/openstates';

export default function LookupScreen() {
  const router = useRouter();
  const { isMobile } = useResponsiveLayout();
  const [address, setAddress] = useState('');
  const [searchResults, setSearchResults] = useState<Official[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#1C1F26' }, 'background');
  const inputBorder = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholder = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const democrat = useThemeColor({ light: '#1c355e', dark: '#6B8DC2' }, 'tint');
  const republican = useThemeColor({ light: '#fa3332', dark: '#FF6B6A' }, 'tint');

  const fetchByCoords = async (lat: number, lng: number) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const results = await getOfficialsByLocation(lat, lng);
      setSearchResults(results);
      if (results.length === 0) {
        Alert.alert('No Results', 'No elected officials found for this location.');
      } else {
        setTimeout(() => setShowPrompt(true), 1200);
      }
    } catch (error) {
      console.error('Error fetching officials:', error);
      Alert.alert('Error', 'Unable to look up officials. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUseLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location access is needed to find your elected officials. You can also enter an address instead.',
        );
        return;
      }

      setLoading(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await fetchByCoords(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      setLoading(false);
      Alert.alert('Location Error', 'Unable to determine your location. Try entering an address instead.');
    }
  };

  const geocodeAddress = async (query: string): Promise<{ lat: number; lng: number } | null> => {
    const encoded = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=us`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AmplifyKS/1.0' },
    });
    const data = await response.json();
    if (!data || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  };

  const handleSearchAddress = async () => {
    if (!address.trim()) return;

    setLoading(true);
    try {
      const coords = await geocodeAddress(address.trim());
      if (!coords) {
        Alert.alert('Address Not Found', 'Could not find that address. Please try a more specific address.');
        setLoading(false);
        return;
      }
      await fetchByCoords(coords.lat, coords.lng);
    } catch (error) {
      console.error('Error geocoding address:', error);
      setLoading(false);
      Alert.alert('Error', 'Unable to look up that address. Please try again.');
    }
  };

  const getPartyColor = (party: string) => {
    const lower = party.toLowerCase();
    if (lower.includes('democrat')) return democrat;
    if (lower.includes('republican')) return republican;
    return mutedText;
  };

  const handleContact = (official: Official) => {
    const options: { text: string; onPress: () => void }[] = [];

    if (official.email) {
      options.push({
        text: 'Email',
        onPress: () => Linking.openURL(`mailto:${official.email}`),
      });
    }

    const phone = official.contactDetails.find((c) => c.voice)?.voice;
    if (phone) {
      options.push({
        text: 'Call',
        onPress: () => Linking.openURL(`tel:${phone}`),
      });
    }

    if (official.openstatesUrl) {
      options.push({
        text: 'View Profile',
        onPress: () => Linking.openURL(official.openstatesUrl),
      });
    }

    if (options.length === 0) {
      Alert.alert('No Contact Info', 'No contact information is available for this official.');
      return;
    }

    Alert.alert(
      official.name,
      `${official.party} — ${official.chamber} District ${official.district}`,
      [...options.map((o) => ({ text: o.text, onPress: o.onPress })), { text: 'Cancel', style: 'cancel' as const }],
    );
  };

  const renderOfficialCard = (item: Official) => (
    <Pressable
      key={item.id}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: surface, borderColor: border },
        Shadows.sm,
        pressed && styles.pressed,
      ]}
      onPress={() => handleContact(item)}
    >
      <View style={styles.cardRow}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: inputBackground }]}>
            <ThemedText style={[styles.photoInitials, { color: mutedText }]}>
              {item.givenName.charAt(0)}
              {item.familyName.charAt(0)}
            </ThemedText>
          </View>
        )}

        <View style={styles.cardContent}>
          <ThemedText type="defaultSemiBold" style={styles.officialName} numberOfLines={1}>
            {item.name}
          </ThemedText>

          <View style={styles.tagRow}>
            <View style={[styles.partyBadge, { backgroundColor: getPartyColor(item.party) + '14' }]}>
              <ThemedText style={[styles.partyText, { color: getPartyColor(item.party) }]}>
                {item.party}
              </ThemedText>
            </View>
          </View>

          <ThemedText type="caption" style={{ color: mutedText }}>
            {item.chamber}{item.district ? ` — District ${item.district}` : ''}
          </ThemedText>

          {item.email ? (
            <ThemedText type="caption" style={{ color: tint }} numberOfLines={1}>
              {item.email}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.topBar, { backgroundColor: surface, borderBottomColor: border }]}>
        <ContentContainer style={styles.topBarInner}>
          <Pressable
            style={styles.logoRow}
            onPress={() => router.navigate('/')}
          >
            <View style={[styles.logoCircle, { backgroundColor: '#1c355e' }]}>
              <MaterialIcons name="campaign" size={18} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.logoText}>AmplifyKS</ThemedText>
          </Pressable>
          <View style={styles.topBarActions}>
            <Pressable
              style={({ pressed }) => [pressed && styles.pressed]}
              onPress={() => router.navigate('/(auth)/login')}
            >
              <ThemedText style={[styles.signInLink, { color: tint }]}>Sign In</ThemedText>
            </Pressable>
            {!isMobile && (
              <Pressable
                style={({ pressed }) => [
                  styles.createAccountButton,
                  { backgroundColor: tint },
                  pressed && styles.pressed,
                ]}
                onPress={() => router.navigate('/(auth)/register')}
              >
                <ThemedText style={styles.createAccountText}>Create Account</ThemedText>
              </Pressable>
            )}
          </View>
        </ContentContainer>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ContentContainer style={styles.content}>
          <View style={styles.hero}>
            <ThemedText type="title" style={styles.heroTitle}>
              Who represents you in Kansas?
            </ThemedText>
            <ThemedText style={[styles.heroSubtitle, { color: mutedText }]}>
              Enter your address to find your elected officials and their contact information.
            </ThemedText>
          </View>

          <View style={[styles.searchCard, { backgroundColor: surface, borderColor: border }, Shadows.md]}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.locationButton,
                { backgroundColor: tint },
                pressed && styles.pressed,
              ]}
              onPress={handleUseLocation}
              disabled={loading}
            >
              <MaterialIcons name="my-location" size={18} color="#fff" />
              <ThemedText style={styles.locationButtonText}>
                Use My Current Location
              </ThemedText>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: border }]} />
              <ThemedText type="caption" style={{ color: mutedText }}>or enter an address</ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: border }]} />
            </View>

            <View style={styles.addressRow}>
              <TextInput
                style={[styles.addressInput, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
                placeholder="123 Main St, Topeka, KS"
                placeholderTextColor={placeholder}
                value={address}
                onChangeText={setAddress}
                autoCapitalize="words"
                returnKeyType="search"
                onSubmitEditing={handleSearchAddress}
              />
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.searchButton,
                  { backgroundColor: address.trim() && !loading ? tint : inputBorder },
                  pressed && address.trim() && styles.pressed,
                ]}
                onPress={handleSearchAddress}
                disabled={!address.trim() || loading}
              >
                <ThemedText style={styles.searchButtonText}>Search</ThemedText>
              </Pressable>
            </View>
          </View>

          {loading && (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={tint} />
              <ThemedText style={{ color: mutedText, fontSize: 16 }}>
                Looking up officials...
              </ThemedText>
            </View>
          )}

          {!loading && searchResults.length > 0 && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsHeader}>
                <ThemedText type="subtitle">Your Electeds</ThemedText>
                <View style={[styles.countBadge, { backgroundColor: tint + '15' }]}>
                  <ThemedText style={[styles.countText, { color: tint }]}>
                    {searchResults.length}
                  </ThemedText>
                </View>
              </View>

              {searchResults.map((official) => renderOfficialCard(official))}
            </View>
          )}

          {!loading && hasSearched && searchResults.length === 0 && (
            <View style={styles.centerContainer}>
              <ThemedText style={{ color: mutedText, fontSize: 16 }}>
                No officials found for this location.
              </ThemedText>
            </View>
          )}

          {!hasSearched && (
            <View style={styles.featuresSection}>
              <ThemedText type="sectionHeader" style={{ color: mutedText, textAlign: 'center', marginBottom: Spacing.xl }}>
                What you can do with AmplifyKS
              </ThemedText>
              <View style={styles.featuresGrid}>
                {[
                  { icon: 'how-to-vote' as const, title: 'Find Officials', desc: 'Look up your Kansas elected officials by address' },
                  { icon: 'description' as const, title: 'Track Bills', desc: 'Follow legislation through the Kansas Legislature' },
                  { icon: 'edit-note' as const, title: 'Submit Testimony', desc: 'Draft and send testimony directly to committees' },
                  { icon: 'bookmark' as const, title: 'Save & Organize', desc: 'Save your officials and bills for quick access' },
                ].map((feature) => (
                  <View key={feature.title} style={[styles.featureCard, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
                    <View style={[styles.featureIcon, { backgroundColor: tint + '10' }]}>
                      <MaterialIcons name={feature.icon} size={22} color={tint} />
                    </View>
                    <ThemedText type="defaultSemiBold" style={styles.featureTitle}>{feature.title}</ThemedText>
                    <ThemedText type="caption" style={{ color: mutedText, textAlign: 'center' }}>{feature.desc}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ContentContainer>
      </ScrollView>

      <Modal
        visible={showPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: '#1c355e' }, Shadows.lg]}>
            <Pressable
              style={styles.modalClose}
              onPress={() => setShowPrompt(false)}
              hitSlop={12}
            >
              <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.6)" />
            </Pressable>

            <MaterialIcons name="bookmark-border" size={36} color="rgba(255,255,255,0.85)" />
            <ThemedText style={styles.modalTitle}>
              Want to save your elected officials?
            </ThemedText>
            <ThemedText style={styles.modalBody}>
              Create a free AmplifyKS account to save your officials, track bills, and submit testimony directly to committees.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalPrimary,
                  { backgroundColor: '#0097b2' },
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setShowPrompt(false);
                  router.navigate('/(auth)/register');
                }}
              >
                <ThemedText style={styles.modalPrimaryText}>Create Free Account</ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalSecondary,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setShowPrompt(false);
                  router.navigate('/(auth)/login');
                }}
              >
                <ThemedText style={styles.modalSecondaryText}>I already have an account</ThemedText>
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
  topBar: {
    borderBottomWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  topBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  signInLink: {
    fontSize: 15,
    fontWeight: '700',
  },
  createAccountButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  createAccountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: Spacing['5xl'],
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
  },
  heroTitle: {
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 26,
    marginTop: Spacing.md,
    maxWidth: 500,
  },
  searchCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    paddingVertical: 14,
  },
  locationButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  addressRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  addressInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
  },
  searchButton: {
    borderRadius: Radius.md,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  resultsSection: {
    paddingTop: Spacing['2xl'],
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitials: {
    fontSize: 20,
    fontWeight: '600',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  officialName: {
    fontSize: 17,
  },
  tagRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  partyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  partyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    borderRadius: Radius.xl,
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
    maxWidth: 420,
    position: 'relative',
  },
  modalClose: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.xs,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    maxWidth: 340,
  },
  modalButtons: {
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    width: '100%',
    maxWidth: 320,
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
    paddingVertical: Spacing.sm,
  },
  modalSecondaryText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: Spacing.md,
  },
  featuresSection: {
    paddingTop: Spacing['4xl'],
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'center',
  },
  featureCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    width: '48%',
    minWidth: 140,
    maxWidth: 320,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  featureTitle: {
    fontSize: 15,
  },
});
