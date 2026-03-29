import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { MatchScoreBadge } from '@/components/legislator-match-detail';
import { ContentContainer } from '@/components/content-container';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useLegislatorMatch } from '@/hooks/use-legislator-match';
import { useSavedOfficials } from '@/hooks/use-saved-officials';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getOfficialsByLocation, type Official } from '@/services/openstates';

export default function LookupScreen() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [searchResults, setSearchResults] = useState<Official[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const { savedOfficials, saveOfficial, removeOfficial, saveMultipleOfficials, isSaved } = useSavedOfficials();
  const { getMatch } = useLegislatorMatch();

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
        const hasUnsaved = results.some((r) => !isSaved(r.id));
        if (hasUnsaved) {
          setTimeout(() => setShowSaveModal(true), 800);
        }
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

  const openProfile = (official: Official) => {
    router.push({ pathname: '/legislator-detail', params: { id: official.id } });
  };

  const toggleSave = (official: Official) => {
    if (isSaved(official.id)) {
      removeOfficial(official.id);
    } else {
      saveOfficial(official);
    }
  };

  const handleSaveAll = async () => {
    const unsaved = searchResults.filter((r) => !isSaved(r.id));
    if (unsaved.length === 0) {
      setShowSaveModal(false);
      return;
    }
    setSaving(true);
    try {
      await saveMultipleOfficials(unsaved);
      setShowSaveModal(false);
      router.navigate('/(tabs)/dashboard');
    } catch {
      setSaving(false);
      setShowSaveModal(false);
      Alert.alert('Error', 'Unable to save officials. Please try again.');
    }
  };

  const renderCard = (item: Official, showSaveButton: boolean) => {
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
        onPress={() => openProfile(item)}
      >
        <View style={styles.cardRow}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: inputBackground }]}>
              <ThemedText style={[styles.photoInitials, { color: mutedText }]}>
                {(item.givenName ?? '').charAt(0)}
                {(item.familyName ?? '').charAt(0)}
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
                  onPress={(e) => { e.stopPropagation(); toggleSave(item); }}
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
              {item.party ? (
                <View style={[styles.partyBadge, { backgroundColor: getPartyColor(item.party) + '14' }]}>
                  <ThemedText style={[styles.partyText, { color: getPartyColor(item.party) }]}>{item.party}</ThemedText>
                </View>
              ) : null}
              {item.chamber ? (
                <View style={[styles.chamberChip, { backgroundColor: border }]}>
                  <ThemedText type="caption" style={{ color: mutedText }}>{item.chamber}</ThemedText>
                </View>
              ) : null}
            </View>
            <View style={styles.districtRow}>
              <ThemedText type="caption" style={{ color: mutedText }}>
                {item.district ? `District ${item.district}` : ''}
              </ThemedText>
              {(() => {
                const match = getMatch(item);
                return match ? <MatchScoreBadge percent={match.compositePercent} /> : null;
              })()}
            </View>
            {item.email ? (
              <ThemedText type="caption" style={{ color: tint }} numberOfLines={1}>{item.email}</ThemedText>
            ) : null}
          </View>
        </View>
        {saved && !showSaveButton && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove from saved"
            onPress={(e) => { e.stopPropagation(); removeOfficial(item.id); }}
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
              <ThemedText type="title">Find Officials</ThemedText>
              <ThemedText style={[styles.subtitle, { color: mutedText }]}>
                Look up your representatives by address or location
              </ThemedText>
            </View>

            {savedOfficials.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <ThemedText type="subtitle">Saved Officials</ThemedText>
                  <View style={[styles.countBadge, { backgroundColor: tint + '15' }]}>
                    <ThemedText style={[styles.countText, { color: tint }]}>{savedOfficials.length}</ThemedText>
                  </View>
                </View>
                {savedOfficials.map((official) => renderCard(official, false))}
              </View>
            )}

            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Look Up Officials</ThemedText>
              <View style={[styles.lookupCard, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
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
                  <ThemedText style={styles.locationButtonText}>Use My Current Location</ThemedText>
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
                <ThemedText style={{ color: mutedText, fontSize: 16 }}>Looking up officials...</ThemedText>
              </View>
            ) : (
              <>
                {searchResults.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <ThemedText type="subtitle">Results</ThemedText>
                      <View style={[styles.countBadge, { backgroundColor: tint + '15' }]}>
                        <ThemedText style={[styles.countText, { color: tint }]}>{searchResults.length}</ThemedText>
                      </View>
                    </View>
                    {searchResults.map((official) => renderCard(official, true))}
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

      <Modal
        visible={showSaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: surface, borderColor: border }, Shadows.lg]}>
            <Pressable
              style={styles.modalClose}
              onPress={() => setShowSaveModal(false)}
              hitSlop={12}
            >
              <MaterialIcons name="close" size={20} color={mutedText} />
            </Pressable>

            <View style={[styles.modalIcon, { backgroundColor: tint + '15' }]}>
              <MaterialIcons name="bookmark-add" size={28} color={tint} />
            </View>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Save as your electeds?
            </ThemedText>
            <ThemedText style={[styles.modalBody, { color: mutedText }]}>
              We found {searchResults.length} official{searchResults.length !== 1 ? 's' : ''} for
              your location. Would you like to save them for quick access?
            </ThemedText>

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalPrimary,
                  { backgroundColor: tint },
                  pressed && styles.pressed,
                  saving && { opacity: 0.6 },
                ]}
                onPress={handleSaveAll}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.modalPrimaryText}>Save All</ThemedText>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalSecondary,
                  { borderColor: border },
                  pressed && styles.pressed,
                ]}
                onPress={() => setShowSaveModal(false)}
                disabled={saving}
              >
                <ThemedText style={[styles.modalSecondaryText, { color: mutedText }]}>No Thanks</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: Spacing['4xl'] },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  subtitle: { fontSize: 15, marginTop: Spacing.xs },
  section: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  sectionTitle: { marginBottom: Spacing.md },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  countBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  countText: { fontSize: 13, fontWeight: '700' },
  lookupCard: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.lg },
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.md, paddingVertical: 14 },
  locationButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dividerLine: { flex: 1, height: 1 },
  addressRow: { flexDirection: 'row', gap: Spacing.sm },
  addressInput: { flex: 1, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16 },
  searchButton: { borderRadius: Radius.md, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' },
  searchButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  cardRow: { flexDirection: 'row', gap: 14 },
  photo: { width: 56, height: 56, borderRadius: 28 },
  photoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  photoInitials: { fontSize: 18, fontWeight: '600' },
  cardContent: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  officialName: { fontSize: 16, flex: 1 },
  saveButton: { padding: 2 },
  tagRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  partyBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.sm },
  partyText: { fontSize: 12, fontWeight: '700' },
  chamberChip: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.sm },
  districtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  removeButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: Spacing.xs, marginTop: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderRadius: Radius.sm },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  centerContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  modalCard: { borderWidth: 1, borderRadius: Radius.xl, padding: Spacing['3xl'], alignItems: 'center', gap: Spacing.md, width: '100%', maxWidth: 400, position: 'relative' },
  modalClose: { position: 'absolute', top: Spacing.md, right: Spacing.md, padding: Spacing.xs },
  modalIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { textAlign: 'center' },
  modalBody: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  modalButtons: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, width: '100%' },
  modalPrimary: { width: '100%', paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center' },
  modalPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalSecondary: { width: '100%', paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1 },
  modalSecondaryText: { fontSize: 15, fontWeight: '600' },
});
