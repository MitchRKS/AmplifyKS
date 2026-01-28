import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Navigate to bills page on mount
    router.replace('/(tabs)/bills');
  }, []);

  // Show loading indicator while navigating
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
