import { Redirect } from 'expo-router';
import { ActivityIndicator, Platform, View, StyleSheet } from 'react-native';

import { useAuth } from '@/contexts/auth-context';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  if (Platform.OS === 'web') {
    return <Redirect href="/lookup" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
