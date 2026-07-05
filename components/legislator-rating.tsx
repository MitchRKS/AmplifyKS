import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppAlert } from '@/components/app-alert';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useGamification } from '@/contexts/gamification-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getFirestoreDb } from '@/services/firebase';

interface LegislatorRatingProps {
  legislatorId: string;
}

const STAR_VALUES = [1, 2, 3, 4, 5];

async function fetchAggregate(legislatorId: string, userId: string | undefined) {
  const db = getFirestoreDb();
  const snap = await getDocs(
    query(collection(db, 'legislatorRatings'), where('legislatorId', '==', legislatorId)),
  );

  let sum = 0;
  let userValue: number | null = null;
  snap.forEach((d) => {
    const data = d.data();
    if (typeof data.rating === 'number') {
      sum += data.rating;
      if (userId && data.userId === userId) userValue = data.rating;
    }
  });

  return {
    count: snap.size,
    average: snap.size > 0 ? sum / snap.size : null,
    myRating: userValue,
  };
}

export function LegislatorRating({ legislatorId }: LegislatorRatingProps) {
  const { user } = useAuth();
  const { recordAction } = useGamification();
  const [average, setAverage] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const starInactive = useThemeColor({ light: '#d5d5d5', dark: '#3A3F4A' }, 'background');
  const starActive = '#ffc629';

  useEffect(() => {
    let cancelled = false;

    fetchAggregate(legislatorId, user?.uid)
      .then((result) => {
        if (cancelled) return;
        setAverage(result.average);
        setCount(result.count);
        setMyRating(result.myRating);
      })
      .catch((e) => console.error('Error loading legislator ratings:', e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [legislatorId, user?.uid]);

  const handleRate = async (value: number) => {
    if (!user || submitting) return;
    setSubmitting(true);
    const isFirstRating = myRating == null;

    try {
      const db = getFirestoreDb();
      const ratingId = `${user.uid}_${legislatorId}`;
      await setDoc(doc(db, 'legislatorRatings', ratingId), {
        userId: user.uid,
        legislatorId,
        rating: value,
        updatedAt: Timestamp.now(),
      });

      // Re-fetch rather than hand-rolling incremental average math.
      const result = await fetchAggregate(legislatorId, user.uid);
      setAverage(result.average);
      setCount(result.count);
      setMyRating(result.myRating);

      if (isFirstRating) {
        recordAction('Rate Legislator', 'Rated a legislator');
      }
    } catch (e) {
      console.error('Error saving legislator rating:', e);
      AppAlert.alert('Error', 'Unable to save your rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.card, { borderColor: border }]}>
      <View style={styles.summaryRow}>
        <MaterialIcons name="star" size={18} color={starActive} />
        <ThemedText type="defaultSemiBold">
          {average != null ? average.toFixed(1) : 'No ratings yet'}
        </ThemedText>
        {count > 0 && (
          <ThemedText style={[styles.countText, { color: mutedText }]}>
            ({count} {count === 1 ? 'rating' : 'ratings'})
          </ThemedText>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={tint} style={styles.loadingIndicator} />
      ) : user ? (
        <View style={styles.rateRow}>
          <ThemedText style={[styles.rateLabel, { color: mutedText }]}>Your rating:</ThemedText>
          <View style={styles.starsRow}>
            {STAR_VALUES.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${value} star${value === 1 ? '' : 's'}`}
                onPress={() => handleRate(value)}
                disabled={submitting}
                hitSlop={4}
              >
                <MaterialIcons
                  name={myRating != null && value <= myRating ? 'star' : 'star-border'}
                  size={26}
                  color={myRating != null && value <= myRating ? starActive : starInactive}
                />
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <ThemedText style={[styles.signInHint, { color: mutedText }]}>
          Sign in to rate this legislator
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  countText: {
    fontSize: 13,
  },
  loadingIndicator: {
    alignSelf: 'flex-start',
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rateLabel: {
    fontSize: 14,
  },
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  signInHint: {
    fontSize: 13,
  },
});
