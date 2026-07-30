// src/components/HeartsBackground.js
//
// Sabit (animasyonsuz) kalp deseni. Romantik modda kartın/kutunun arkasına konur.
// Yalnızca romantik paket aktifken gösterilir; normal modda kullanılmaz.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';

// Sabit yerleşim (yüzde bazlı) — her zaman aynı görünür.
const HEARTS = [
  { top: '6%', left: '8%', size: 20, o: 0.10, r: '-12deg' },
  { top: '12%', left: '72%', size: 30, o: 0.14, r: '10deg' },
  { top: '24%', left: '40%', size: 16, o: 0.08, r: '6deg' },
  { top: '34%', left: '84%', size: 22, o: 0.12, r: '-8deg' },
  { top: '44%', left: '14%', size: 26, o: 0.10, r: '14deg' },
  { top: '52%', left: '58%', size: 18, o: 0.09, r: '-6deg' },
  { top: '63%', left: '30%', size: 30, o: 0.13, r: '8deg' },
  { top: '70%', left: '80%', size: 16, o: 0.08, r: '-14deg' },
  { top: '80%', left: '48%', size: 24, o: 0.11, r: '4deg' },
  { top: '86%', left: '12%', size: 18, o: 0.09, r: '-10deg' },
  { top: '90%', left: '70%', size: 22, o: 0.10, r: '12deg' },
];

const HeartsBackground = ({ color = '#dc2626', style }) => {
  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {HEARTS.map((h, i) => (
        <Heart
          key={i}
          size={h.size}
          color={color}
          fill={color}
          style={{
            position: 'absolute',
            top: h.top,
            left: h.left,
            opacity: h.o,
            transform: [{ rotate: h.r }],
          }}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});

export default HeartsBackground;
