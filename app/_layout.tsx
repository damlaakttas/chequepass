import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { useMatchStore } from '../src/store/matchStore';
import { Colors } from '../src/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'CormorantGaramond-Bold':     require('../assets/fonts/CormorantGaramond-Bold.ttf'),
    'CormorantGaramond-SemiBold': require('../assets/fonts/CormorantGaramond-SemiBold.ttf'),
    'DMSans-Light':    require('../assets/fonts/DMSans-Light.ttf'),
    'DMSans-Regular':  require('../assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium':   require('../assets/fonts/DMSans-Medium.ttf'),
    'DMSans-SemiBold': require('../assets/fonts/DMSans-SemiBold.ttf'),
  });

  const { isInitialized, user, init: initAuth } = useAuthStore();
  const { init: initMatches, clearMatches }      = useMatchStore();
  const router   = useRouter();
  const segments = useSegments();

  // Auth listener'ı başlat
  useEffect(() => {
    const unsub = initAuth();
    return unsub;
  }, []);

  // Match listener — sadece giriş yapılınca
  useEffect(() => {
    if (!user) { clearMatches(); return; }
    const unsub = initMatches();
    return unsub;
  }, [user?.uid]);

  // Splash screen
  useEffect(() => {
    if ((fontsLoaded || fontError) && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isInitialized]);

  // Auth yönlendirmesi
  useEffect(() => {
    if (!isInitialized) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/login');
    if (user  && inAuth)  router.replace('/(tabs)/coupons');
  }, [user, isInitialized]);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.brand} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={Colors.gradientStart} />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex:            1,
    backgroundColor: Colors.gradientStart,
    alignItems:      'center',
    justifyContent:  'center',
  },
});
