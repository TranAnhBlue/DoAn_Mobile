import { NavigationContainer } from '@react-navigation/native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuthStore } from '../features/auth/store/authStore';
import SplashScreen from '../shared/screens/SplashScreen';
import AuthenticatedNavigator from './AuthenticatedNavigator';
import AuthNavigator from './AuthNavigator';

export default function RootNavigator() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const initialize = useAuthStore((state) => state.initialize);
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await ExpoSplashScreen.preventAutoHideAsync();
        await initialize();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn(error);
      } finally {
        setAppReady(true);
      }
    }

    prepare();
  }, [initialize]);

  const handleSplashFinish = async () => {
    setShowSplash(false);
    await ExpoSplashScreen.hideAsync();
  };

  if (!appReady || showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AuthenticatedNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
