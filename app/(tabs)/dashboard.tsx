import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/auth-context';
import { useSavedOfficials } from '@/hooks/use-saved-officials';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Official } from '@/services/openstates';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { savedOfficials, removeOfficial } = useSavedOfficials();

  const cardBackground = useThemeColor({ light: '#FFFFFF', dark: '#1C1C1E' }, 'background');
  const inputBackground = useThemeColor({ light: '#F2F2F7', dark: '#1C1C1E' }, 'background');
  const tint = useThemeColor({ light: '#0a7ea4', dark: '#0a7ea4' }, 'tint');
  const mutedText = useThemeColor({ light: '#6C6C70', dark: '#A1A1A6' }, 'text');
  const separator = useThemeColor({ light: '#E5E5EA', dark: '#38383A' }, 'background');

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

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="title">
            {user?.firstName ? `Hi, ${user.firstName}` : 'Dashboard'}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: mutedText }]}>
            Your AmplifyKS overview
          </ThemedText>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">My Lawmakers</ThemedText>
            {savedOfficials.length > 0 && (
              <ThemedText style={[styles.badge, { color: mutedText }]}>
                {savedOfficials.length}
              </ThemedText>
            )}
          </View>

          {savedOfficials.length > 0 ? (
            savedOfficials.map((official) => (
              <Pressable
                key={official.id}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: cardBackground, borderColor: separator },
                  pressed && styles.cardPressed,
                ]}
                onPress={() => handleContact(official)}
              >
                <View style={styles.cardRow}>
                  {official.image ? (
                    <Image source={{ uri: official.image }} style={styles.photo} contentFit="cover" />
                  ) : (
                    <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: inputBackground }]}>
                      <ThemedText style={[styles.photoInitials, { color: mutedText }]}>
                        {official.givenName.charAt(0)}
                        {official.familyName.charAt(0)}
                      </ThemedText>
                    </View>
                  )}

                  <View style={styles.cardContent}>
                    <ThemedText type="defaultSemiBold" style={styles.officialName} numberOfLines={1}>
                      {official.name}
                    </ThemedText>

                    <View style={styles.tagRow}>
                      <View style={[styles.partyBadge, { backgroundColor: getPartyColor(official.party) + '18' }]}>
                        <ThemedText style={[styles.partyText, { color: getPartyColor(official.party) }]}>
                          {official.party}
                        </ThemedText>
                      </View>
                    </View>

                    <ThemedText style={[styles.detailText, { color: mutedText }]}>
                      {official.chamber}{official.district ? ` — District ${official.district}` : ''}
                    </ThemedText>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove official"
                    onPress={(e) => {
                      e.stopPropagation();
                      removeOfficial(official.id);
                    }}
                    hitSlop={8}
                    style={styles.removeButton}
                  >
                    <MaterialIcons name="close" size={18} color={mutedText} />
                  </Pressable>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: cardBackground, borderColor: separator }]}>
              <MaterialIcons name="how-to-vote" size={36} color={separator} />
              <ThemedText style={[styles.emptyTitle, { color: mutedText }]}>
                No saved lawmakers yet
              </ThemedText>
              <ThemedText style={[styles.emptyBody, { color: mutedText }]}>
                Look up your elected officials and save them for quick access.
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                style={[styles.emptyButton, { backgroundColor: tint }]}
                onPress={() => router.navigate('/(tabs)/officials')}
              >
                <ThemedText style={styles.emptyButtonText}>Find My Officials</ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    fontSize: 15,
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
    alignItems: 'center',
    gap: 14,
  },
  photo: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitials: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  officialName: {
    fontSize: 16,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  partyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  partyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailText: {
    fontSize: 13,
  },
  removeButton: {
    padding: 4,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
