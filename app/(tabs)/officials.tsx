import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getOfficialsByLocation, type Official } from '@/services/openstates';

export default function OfficialsScreen() {
  const [address, setAddress] = useState('');
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const inputBackground = useThemeColor({ light: '#F2F2F7', dark: '#1C1C1E' }, 'background');
  const inputBorder = useThemeColor({ light: '#D1D1D6', dark: '#2C2C2E' }, 'background');
  const inputText = useThemeColor({ light: '#000000', dark: '#FFFFFF' }, 'text');
  const placeholder = useThemeColor({ light: '#8E8E93', dark: '#8E8E93' }, 'text');
  const cardBackground = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');
  const tint = useThemeColor({ light: '#0a7ea4', dark: '#0a7ea4' }, 'tint');
  const mutedText = useThemeColor({ light: '#6C6C70', dark: '#A1A1A6' }, 'text');
  const separator = useThemeColor({ light: '#E5E5EA', dark: '#38383A' }, 'background');

  const fetchByCoords = async (lat: number, lng: number) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const results = await getOfficialsByLocation(lat, lng);
      setOfficials(results);
      if (results.length === 0) {
        Alert.alert('No Results', 'No elected officials found for this location.');
      }
    } catch (error) {
      console.error('Error fetching officials:', error);
      Alert.alert('Error', 'Unable to look up officials. Please try again.');
      setOfficials([]);
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
    if (lower.includes('democrat')) return '#3B82F6';
    if (lower.includes('republican')) return '#EF4444';
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

  const renderOfficial = ({ item }: { item: Official }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBackground, borderColor: separator },
        pressed && styles.cardPressed,
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
          <ThemedText type="defaultSemiBold" style={styles.officialName}>
            {item.name}
          </ThemedText>

          <View style={styles.tagRow}>
            <View style={[styles.partyBadge, { backgroundColor: getPartyColor(item.party) + '18' }]}>
              <ThemedText style={[styles.partyText, { color: getPartyColor(item.party) }]}>
                {item.party}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={[styles.detailText, { color: mutedText }]}>
            {item.chamber}{item.district ? ` — District ${item.district}` : ''}
          </ThemedText>

          {item.email ? (
            <ThemedText style={[styles.contactText, { color: tint }]} numberOfLines={1}>
              {item.email}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">My Officials</ThemedText>
          <ThemedText style={[styles.subtitle, { color: mutedText }]}>
            Find your Kansas state legislators
          </ThemedText>
        </View>

        <View style={styles.searchSection}>
          <Pressable
            accessibilityRole="button"
            style={[styles.locationButton, { backgroundColor: tint }]}
            onPress={handleUseLocation}
            disabled={loading}
          >
            <ThemedText style={styles.locationButtonText}>
              Use My Current Location
            </ThemedText>
          </Pressable>

          <ThemedText style={[styles.orText, { color: mutedText }]}>or enter an address</ThemedText>

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
              style={[styles.searchButton, { backgroundColor: address.trim() && !loading ? tint : inputBorder }]}
              onPress={handleSearchAddress}
              disabled={!address.trim() || loading}
            >
              <ThemedText style={styles.searchButtonText}>Search</ThemedText>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={tint} />
            <ThemedText style={[styles.loadingText, { color: mutedText }]}>
              Looking up officials...
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={officials}
            renderItem={renderOfficial}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              hasSearched ? (
                <View style={styles.centerContainer}>
                  <ThemedText style={[styles.emptyText, { color: mutedText }]}>
                    No officials found for this location.
                  </ThemedText>
                </View>
              ) : null
            }
          />
        )}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  locationButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  locationButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  orText: {
    textAlign: 'center',
    fontSize: 14,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addressInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchButton: {
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitials: {
    fontSize: 22,
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
    gap: 8,
    flexWrap: 'wrap',
  },
  partyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  partyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailText: {
    fontSize: 14,
  },
  contactText: {
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
  },
});
