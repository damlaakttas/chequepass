// App.js
import 'react-native-gesture-handler';
import React from 'react';
import { View, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import { AppProvider } from './src/context/AppContext';
import { PremiumProvider } from './src/context/PremiumContext';
import RootNavigator from './src/navigation/RootNavigator';
import SplashVideo from './src/components/SplashVideo';
import { COLORS } from './src/theme/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [splashDone, setSplashDone] = React.useState(false);

  if (!fontsLoaded) {
    // Spinner yok: splash videosuyla kesintisiz geçiş için düz arka plan.
    return <View style={styles.loading} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <PremiumProvider>
          <AppProvider>
            <RootNavigator />
          </AppProvider>
        </PremiumProvider>
        {!splashDone && <SplashVideo onFinish={() => setSplashDone(true)} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
