// src/components/HeartsBackground.js
//
// Sabit (animasyonsuz) kalp deseni. Romantik modda kartın/kutunun arkasına konur.
// Yalnızca romantik paket aktifken gösterilir; normal modda kullanılmaz.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';

// Sabit yerleşim (yüzde bazlı) — her zaman aynı görünür, kutuyu dolduracak sıklıkta.
const HEARTS = [
  { top: '3%', left: '6%', size: 26, o: 0.22, r: '-12deg' },
  { top: '5%', left: '38%', size: 18, o: 0.18, r: '8deg' },
  { top: '4%', left: '70%', size: 32, o: 0.24, r: '10deg' },
  { top: '9%', left: '88%', size: 20, o: 0.19, r: '-8deg' },
  { top: '15%', left: '20%', size: 24, o: 0.21, r: '6deg' },
  { top: '17%', left: '55%', size: 30, o: 0.23, r: '-6deg' },
  { top: '20%', left: '82%', size: 22, o: 0.19, r: '14deg' },
  { top: '27%', left: '10%', size: 28, o: 0.22, r: '-10deg' },
  { top: '30%', left: '44%', size: 20, o: 0.18, r: '4deg' },
  { top: '32%', left: '72%', size: 26, o: 0.22, r: '-14deg' },
  { top: '40%', left: '26%', size: 32, o: 0.24, r: '8deg' },
  { top: '43%', left: '60%', size: 22, o: 0.19, r: '-4deg' },
  { top: '46%', left: '88%', size: 24, o: 0.20, r: '12deg' },
  { top: '54%', left: '8%', size: 24, o: 0.21, r: '-8deg' },
  { top: '56%', left: '40%', size: 30, o: 0.23, r: '6deg' },
  { top: '58%', left: '74%', size: 20, o: 0.18, r: '-12deg' },
  { top: '66%', left: '22%', size: 26, o: 0.22, r: '10deg' },
  { top: '69%', left: '56%', size: 22, o: 0.19, r: '-6deg' },
  { top: '72%', left: '86%', size: 28, o: 0.22, r: '8deg' },
  { top: '80%', left: '12%', size: 30, o: 0.23, r: '-10deg' },
  { top: '82%', left: '46%', size: 20, o: 0.18, r: '4deg' },
  { top: '84%', left: '76%', size: 24, o: 0.21, r: '-14deg' },
  { top: '92%', left: '30%', size: 26, o: 0.22, r: '12deg' },
  { top: '94%', left: '66%', size: 22, o: 0.19, r: '-8deg' },
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
