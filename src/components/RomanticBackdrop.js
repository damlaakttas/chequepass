// src/components/RomanticBackdrop.js
//
// Romantik paket seçiliyken Kopart ekranının arka planı.
// Yumuşak gül/pembe gradient + sabit kalp deseni.
// Normal pakette hiç render edilmez, dolayısıyla normal akışa etkisi yoktur.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HeartsBackground from './HeartsBackground';
import { ROMANTIC } from '../theme/romantic';

const RomanticBackdrop = ({ style }) => (
  <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
    <LinearGradient
      colors={ROMANTIC.gradient}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
    <HeartsBackground variant="screen" color={ROMANTIC.heart} />
  </View>
);

export default React.memo(RomanticBackdrop);
