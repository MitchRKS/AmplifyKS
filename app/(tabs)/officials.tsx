import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { useSavedOfficials } from '@/hooks/use-saved-officials';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getOfficialsByLocation, type Official } from '@/services/openstates';

export default function OfficialsScreen() {
  const [address, setAddress] = useState('');
  const [searchResults, setSearchResults] = useState<Official[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const { savedOfficials, saveOfficial, removeOfficial, isSaved } = useSavedOfficials();

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

  const toggleSave = (official: Official) => {
    if (isSaved(official.id)) {
      removeOfficial(official.id);
    } else {
      saveOfficial(official);
    }
  };

  const renderOfficialCard = (item: Official, showSaveButton: boolean) => {
    const saved = isSaved(item.id);

    return (
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
            <View style={styles.nameRow}>
              <ThemedText type="defaultSemiBold" style={styles.officialName} numberOfLines={1}>
                {item.name}
              </ThemedText>
              {showSaveButton && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={saved ? 'Remove from saved' : 'Save official'}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleSave(item);
                  }}
                  hitSlop={8}
                  style={styles.saveButton}
                >
                  <MaterialIcons
                    name={saved ? 'bookmark' : 'bookmark-border'}
                    size={22}
                    color={saved ? tint : mutedText}
                  />
                </Pressable>
              )}
            </View>

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

        {saved && !showSaveButton && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove from saved"
            onPress={(e) => {
              e.stopPropagation();
              removeOfficial(item.id);
            }}
            style={[styles.removeButton, { borderColor: border }]}
          >
            <MaterialIcons name="close" size={14} color={mutedText} />
            <ThemedText type="caption" style={{ color: mutedText }}>Remove</ThemedText>
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ContentContainer>
            <View style={styles.header}>
              <ThemedText type="title">My Officials</ThemedText>
              <ThemedText style={[styles.subtitle, { color: mutedText }]}>
                Find and save your Kansas state legislators
              </ThemedText>
            </View>

            {savedOfficials.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <ThemedText type="subtitle">Saved Officials</ThemedText>
                  <View style={[styles.countBadge, { backgroundColor: tint + '15' }]}>
                    <ThemedText style={[styles.countText, { color: tint }]}>
                      {savedOfficials.length}
                    </ThemedText>
                  </View>
                </View>
                {savedOfficials.map((official) => renderOfficialCard(official, false))}
              </View>
            )}

            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Look Up Officials
              </ThemedText>

              <View style={[styles.searchCard, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
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
            </View>

            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={tint} />
                <ThemedText style={{ color: mutedText, fontSize: 16 }}>
                  Looking up officials...
                </ThemedText>
              </View>
            ) : (
              <>
                {searchResults.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <ThemedText type="subtitle">Results</ThemedText>
                      <View style={[styles.countBadge, { backgroundColor: tint + '15' }]}>
                        <ThemedText style={[styles.countText, { color: tint }]}>
                          {searchResults.length}
                        </ThemedText>
                      </View>
                    </View>
                    {searchResults.map((official) => renderOfficialCard(official, true))}
                  </View>
                )}
                {hasSearched && searchResults.length === 0 && (
                  <View style={styles.centerContainer}>
                    <ThemedText style={{ color: mutedText, fontSize: 16 }}>
                      No officials found for this location.
                    </ThemedText>
                  </View>
                )}
              </>
            )}
          </ContentContainer>
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
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    marginTop: Spacing.xs,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  officialName: {
    fontSize: 17,
    flex: 1,
  },
  saveButton: {
    padding: 2,
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
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.sm,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: Spacing.md,
  },
});
