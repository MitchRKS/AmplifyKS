import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { AppAlert } from '@/components/app-alert';
import { ContentContainer } from '@/components/content-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { isAdminRole } from '@/constants/roles';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { setTestimonyOpen } from '@/hooks/use-bill-testimony-status';
import { useOpenTestimonyBillIds } from '@/hooks/use-open-testimony-bills';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getFirestoreDb } from '@/services/firebase';
import * as LegiscanAPI from '@/services/legiscan';

// Ported from iOS AdminPanelView (Authentication/AdminPanelView.swift) +
// AdminBillManagementView. Deliberately NOT ported: Send Push Notifications
// (no push infrastructure in this build) and Committee Email Setup (this app
// ships validated committee emails in constants/committee-emails.ts instead
// of the committeeEmails collection iOS manages).

interface AdminBill {
  bill_id: number;
  number: string;
  title: string;
}

interface AdminUser {
  uid: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

type PanelTab = 'bills' | 'users';

const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

const roleLabel = (role?: string | null): string => ROLE_LABELS[role ?? 'user'] ?? role ?? 'User';

export default function AdminPanelScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, isLoaded } = useUserProfile();
  const { billIds: openBillIds } = useOpenTestimonyBillIds();

  const [activeTab, setActiveTab] = useState<PanelTab>('bills');

  const [bills, setBills] = useState<AdminBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [billsError, setBillsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  // Optimistic per-bill overrides while a toggle write is in flight.
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const surface = useThemeColor({ light: '#FFFFFF', dark: '#1C1F26' }, 'background');
  const inputBackground = useThemeColor({ light: '#F0F2F5', dark: '#252830' }, 'background');
  const inputBorder = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');
  const inputText = useThemeColor({ light: '#1A1D21', dark: '#F0F2F5' }, 'text');
  const placeholder = useThemeColor({ light: '#9CA3AF', dark: '#6B7280' }, 'text');
  const tint = useThemeColor({ light: '#0097b2', dark: '#33C4DB' }, 'tint');
  const mutedText = useThemeColor({ light: '#5E6368', dark: '#9CA3AF' }, 'text');
  const border = useThemeColor({ light: '#d5d5d5', dark: '#2D3139' }, 'background');

  const isAdmin = isAdminRole(profile.role);
  const isSuperAdmin = profile.role === 'super_admin';

  const loadBills = useCallback(async () => {
    setBillsLoading(true);
    setBillsError(null);
    try {
      const results = await LegiscanAPI.getKansasBills();
      setBills(results.map(({ bill_id, number, title }) => ({ bill_id, number, title })));
    } catch (error) {
      console.error('Admin bill load failed:', error);
      setBillsError('Unable to load bills. Pull to retry.');
    } finally {
      setBillsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const snapshot = await getDocs(collection(getFirestoreDb(), 'users'));
      const rows: AdminUser[] = snapshot.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const first = typeof data.firstName === 'string' ? data.firstName : '';
        const last = typeof data.lastName === 'string' ? data.lastName : '';
        const displayName = typeof data.displayName === 'string' ? data.displayName : '';
        return {
          uid: d.id,
          name: `${first} ${last}`.trim() || displayName || 'No name',
          email: typeof data.email === 'string' ? data.email : '',
          role: typeof data.role === 'string' ? data.role : 'user',
          createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
        };
      });
      rows.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(rows);
    } catch (error) {
      console.error('Admin user load failed:', error);
      setUsersError('Unable to load users.');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadBills();
    loadUsers();
  }, [isAdmin, loadBills, loadUsers]);

  const openIdSet = useMemo(() => new Set(openBillIds), [openBillIds]);
  const isBillOpen = useCallback(
    (billId: number) => {
      const key = String(billId);
      if (key in pendingToggles) return pendingToggles[key];
      return openIdSet.has(key);
    },
    [openIdSet, pendingToggles],
  );

  const filteredBills = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = bills;
    if (query) {
      result = result.filter(
        (bill) =>
          bill.number.toLowerCase().includes(query) || bill.title.toLowerCase().includes(query),
      );
    }
    if (openOnly) {
      result = result.filter((bill) => isBillOpen(bill.bill_id));
    }
    return result;
  }, [bills, search, openOnly, isBillOpen]);

  const handleToggleBill = async (bill: AdminBill) => {
    const key = String(bill.bill_id);
    const next = !isBillOpen(bill.bill_id);
    setPendingToggles((prev) => ({ ...prev, [key]: next }));
    try {
      await setTestimonyOpen(bill.bill_id, next);
    } catch (error) {
      console.error('Toggle failed:', error);
      AppAlert.alert('Error', `Unable to update ${bill.number}. Please try again.`);
    } finally {
      // The billTestimony listener is the source of truth from here.
      setPendingToggles((prev) => {
        const { [key]: _done, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleUserPress = (target: AdminUser) => {
    if (!isSuperAdmin) return;
    if (target.uid === user?.uid) {
      AppAlert.alert('That\'s You', 'Change your own role from the Firebase console instead — locking yourself out is a one-way door.');
      return;
    }
    AppAlert.alert(
      target.name,
      `${target.email || target.uid}\nCurrent role: ${roleLabel(target.role)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...(['user', 'admin', 'super_admin'] as const)
          .filter((role) => role !== target.role)
          .map((role) => ({
            text: `Make ${roleLabel(role)}`,
            style: role === 'super_admin' ? ('destructive' as const) : ('default' as const),
            onPress: () => void changeRole(target, role),
          })),
      ],
    );
  };

  const changeRole = async (target: AdminUser, role: string) => {
    try {
      await updateDoc(doc(getFirestoreDb(), 'users', target.uid), { role });
      setUsers((prev) => prev.map((u) => (u.uid === target.uid ? { ...u, role } : u)));
    } catch (error) {
      console.error('Role change failed:', error);
      AppAlert.alert('Error', 'Unable to change that role. Only super admins can modify users.');
    }
  };

  const roleChipColor = (role: string) => {
    // iOS UserRowView: gray User / orange Admin / red Super Admin.
    if (role === 'super_admin') return '#fa3332';
    if (role === 'admin') return '#F59E0B';
    return '#6B7280';
  };

  const navHeader = (
    <View style={styles.navHeader}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <IconSymbol name="chevron.left" size={24} color={tint} />
      </Pressable>
      <ThemedText type="defaultSemiBold" style={styles.navTitle}>
        Admin Panel
      </ThemedText>
      <View style={styles.navSpacer} />
    </View>
  );

  if (!isLoaded) {
    return (
      <ThemedView style={styles.container}>
        <ContentContainer>{navHeader}</ContentContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tint} />
        </View>
      </ThemedView>
    );
  }

  if (!isAdmin) {
    // iOS InsufficientPermissionsView analog.
    return (
      <ThemedView style={styles.container}>
        <ContentContainer>
          {navHeader}
          <View style={[styles.card, styles.deniedCard, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
            <MaterialIcons name="gpp-bad" size={40} color={mutedText} />
            <ThemedText type="subtitle">Admin access required</ThemedText>
            <ThemedText style={[styles.deniedText, { color: mutedText }]}>
              Your account doesn&apos;t have admin privileges.
            </ThemedText>
          </View>
        </ContentContainer>
      </ThemedView>
    );
  }

  const listHeader = (
    <View>
      {navHeader}

      {/* ── Admin Overview (iOS: role + shield) ── */}
      <View style={[styles.card, { backgroundColor: surface, borderColor: border }, Shadows.sm]}>
        <View style={styles.overviewRow}>
          <View>
            <ThemedText type="caption" style={{ color: mutedText }}>
              Current Role
            </ThemedText>
            <ThemedText type="subtitle" style={{ color: tint }}>
              {roleLabel(profile.role)}
            </ThemedText>
          </View>
          <MaterialIcons name="shield" size={32} color={tint} />
        </View>
      </View>

      {/* ── Tabs ── */}
      <View style={[styles.tabBar, { borderColor: border }]}>
        {(
          [
            { key: 'bills', label: 'Bill Testimony', icon: 'fact-check' },
            { key: 'users', label: 'Users', icon: 'group' },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, active && { borderBottomColor: tint, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialIcons name={tab.icon} size={18} color={active ? tint : mutedText} />
              <ThemedText style={[styles.tabLabel, { color: active ? tint : mutedText }, active && { fontWeight: '700' }]}>
                {tab.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'bills' && (
        <View style={styles.controls}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: inputBackground, borderColor: inputBorder, color: inputText }]}
            placeholder="Search bills..."
            placeholderTextColor={placeholder}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          <Pressable
            accessibilityRole="button"
            style={[styles.filterChip, { borderColor: openOnly ? tint : border, backgroundColor: openOnly ? tint + '15' : 'transparent' }]}
            onPress={() => setOpenOnly((v) => !v)}
          >
            <ThemedText type="caption" style={{ color: openOnly ? tint : mutedText }}>
              Open only
            </ThemedText>
          </Pressable>
        </View>
      )}

      {activeTab === 'bills' && billsLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={tint} />
          <ThemedText style={{ color: mutedText }}>Loading bills…</ThemedText>
        </View>
      )}
      {activeTab === 'bills' && billsError && (
        <View style={styles.centered}>
          <ThemedText style={{ color: mutedText }}>{billsError}</ThemedText>
          <Pressable accessibilityRole="button" onPress={loadBills}>
            <ThemedText style={{ color: tint, fontWeight: '600' }}>Retry</ThemedText>
          </Pressable>
        </View>
      )}
      {activeTab === 'users' && usersLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={tint} />
        </View>
      )}
      {activeTab === 'users' && usersError && (
        <View style={styles.centered}>
          <ThemedText style={{ color: mutedText }}>{usersError}</ThemedText>
          <Pressable accessibilityRole="button" onPress={loadUsers}>
            <ThemedText style={{ color: tint, fontWeight: '600' }}>Retry</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {activeTab === 'bills' ? (
        <FlatList
          data={billsLoading || billsError ? [] : filteredBills}
          keyExtractor={(bill) => String(bill.bill_id)}
          ListHeaderComponent={<ContentContainer>{listHeader}</ContentContainer>}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const open = isBillOpen(item.bill_id);
            return (
              <ContentContainer>
                <View style={[styles.rowCard, { backgroundColor: surface, borderColor: border }]}>
                  <View style={styles.rowText}>
                    <ThemedText type="defaultSemiBold">{item.number}</ThemedText>
                    <ThemedText type="caption" style={{ color: mutedText }} numberOfLines={1}>
                      {item.title}
                    </ThemedText>
                  </View>
                  <Switch
                    value={open}
                    onValueChange={() => void handleToggleBill(item)}
                    trackColor={{ true: tint }}
                    accessibilityLabel={`${item.number} open for testimony`}
                  />
                </View>
              </ContentContainer>
            );
          }}
        />
      ) : (
        <FlatList
          data={usersLoading || usersError ? [] : users}
          keyExtractor={(item) => item.uid}
          ListHeaderComponent={<ContentContainer>{listHeader}</ContentContainer>}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ContentContainer>
              <Pressable
                accessibilityRole={isSuperAdmin ? 'button' : 'none'}
                onPress={() => handleUserPress(item)}
                style={({ pressed }) => [
                  styles.rowCard,
                  { backgroundColor: surface, borderColor: border },
                  pressed && isSuperAdmin && styles.pressed,
                ]}
              >
                <View style={styles.rowText}>
                  <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: mutedText }} numberOfLines={1}>
                    {item.email || item.uid}
                  </ThemedText>
                </View>
                <View style={[styles.roleChip, { backgroundColor: roleChipColor(item.role) }]}>
                  <ThemedText style={styles.roleChipText}>{roleLabel(item.role)}</ThemedText>
                </View>
              </Pressable>
            </ContentContainer>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  backButton: { padding: Spacing.md },
  navTitle: { fontSize: 17 },
  navSpacer: { width: 48 },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  deniedCard: { alignItems: 'center', gap: Spacing.md },
  deniedText: { textAlign: 'center' },
  overviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  tabLabel: { fontSize: 14 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  centered: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing['2xl'] },
  listContent: { paddingBottom: Spacing['4xl'] },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  rowText: { flex: 1, gap: 2 },
  roleChip: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  roleChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
