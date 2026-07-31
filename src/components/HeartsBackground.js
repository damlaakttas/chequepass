// src/components/HeartsBackground.js
//
// Sabit (animasyonsuz) kalp deseni — romantik paketin görsel imzası.
// Yalnızca romantik varyantta kullanılır.
//
// variant:
//   'screen' → tüm ekranı kaplayan seyrek/geniş desen (Kopart sayfası)
//   'row'    → çek listesi satırı gibi kısa/yatay alanlar (Çeklerim)
//   'card'   → kart sırtı için beyaz, çok yumuşak desen (DeckCard)
//
// Not: lucide ikonu yerine tek bir Path kullanılıyor; konumlandırma
// mutlak konumlu View sarmalayıcılarla yapılıyor. Bu, platformlar arası
// en öngörülebilir davranışı verir ve listelerde daha ucuzdur.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ROMANTIC } from '../theme/romantic';

const HEART_PATH =
  'M12 21.2s-7.6-4.7-9.7-9.3C1 8.4 2.6 4.8 6 3.7c2.2-.7 4.5.2 6 2.2 1.5-2 3.8-2.9 6-2.2 3.4 1.1 5 4.7 3.7 8.2-2.1 4.6-9.7 9.3-9.7 9.3z';

// t/l: yüzde konum · s: boyut(px) · o: opaklık · r: derece · f: dolu mu
const SCREEN_HEARTS = [
  { t: '2%', l: '7%', s: 30, o: 0.16, r: '-14deg', f: true },
  { t: '4%', l: '46%', s: 18, o: 0.1, r: '10deg', f: false },
  { t: '1%', l: '78%', s: 24, o: 0.14, r: '16deg', f: true },
  { t: '9%', l: '24%', s: 16, o: 0.1, r: '6deg', f: false },
  { t: '11%', l: '64%', s: 34, o: 0.13, r: '-8deg', f: true },
  { t: '15%', l: '88%', s: 20, o: 0.12, r: '18deg', f: false },
  { t: '20%', l: '4%', s: 26, o: 0.14, r: '12deg', f: false },
  { t: '23%', l: '38%', s: 15, o: 0.09, r: '-6deg', f: true },
  { t: '26%', l: '82%', s: 30, o: 0.13, r: '-16deg', f: true },
  { t: '33%', l: '16%', s: 20, o: 0.11, r: '8deg', f: true },
  { t: '37%', l: '58%', s: 17, o: 0.09, r: '-10deg', f: false },
  { t: '41%', l: '90%', s: 24, o: 0.12, r: '14deg', f: false },
  { t: '46%', l: '2%', s: 28, o: 0.13, r: '-12deg', f: true },
  { t: '50%', l: '44%', s: 16, o: 0.08, r: '6deg', f: false },
  { t: '54%', l: '76%', s: 22, o: 0.12, r: '-18deg', f: true },
  { t: '60%', l: '20%', s: 32, o: 0.14, r: '10deg', f: true },
  { t: '64%', l: '60%', s: 18, o: 0.1, r: '-6deg', f: false },
  { t: '68%', l: '89%', s: 26, o: 0.13, r: '16deg', f: true },
  { t: '73%', l: '6%', s: 20, o: 0.11, r: '-10deg', f: false },
  { t: '77%', l: '40%', s: 28, o: 0.13, r: '12deg', f: true },
  { t: '80%', l: '72%', s: 16, o: 0.09, r: '-14deg', f: false },
  { t: '86%', l: '14%', s: 24, o: 0.13, r: '8deg', f: true },
  { t: '89%', l: '52%', s: 19, o: 0.1, r: '-8deg', f: false },
  { t: '91%', l: '84%', s: 30, o: 0.14, r: '14deg', f: true },
];

const ROW_HEARTS = [
  { t: '6%', l: '14%', s: 18, o: 0.16, r: '-12deg', f: true },
  { t: '38%', l: '30%', s: 13, o: 0.12, r: '10deg', f: false },
  { t: '8%', l: '48%', s: 22, o: 0.14, r: '14deg', f: true },
  { t: '52%', l: '62%', s: 15, o: 0.13, r: '-8deg', f: false },
  { t: '4%', l: '72%', s: 16, o: 0.15, r: '6deg', f: true },
  { t: '46%', l: '84%', s: 24, o: 0.14, r: '-16deg', f: true },
  { t: '10%', l: '92%', s: 13, o: 0.11, r: '12deg', f: false },
  { t: '60%', l: '20%', s: 14, o: 0.12, r: '16deg', f: true },
  { t: '58%', l: '46%', s: 12, o: 0.1, r: '-6deg', f: false },
];

const CARD_HEARTS = [
  { t: '5%', l: '10%', s: 26, o: 0.16, r: '-14deg', f: true },
  { t: '8%', l: '62%', s: 18, o: 0.12, r: '10deg', f: false },
  { t: '17%', l: '34%', s: 15, o: 0.11, r: '6deg', f: true },
  { t: '22%', l: '82%', s: 22, o: 0.14, r: '16deg', f: true },
  { t: '31%', l: '6%', s: 19, o: 0.12, r: '-8deg', f: false },
  { t: '38%', l: '52%', s: 14, o: 0.1, r: '12deg', f: true },
  { t: '44%', l: '86%', s: 17, o: 0.12, r: '-12deg', f: false },
  { t: '56%', l: '16%', s: 24, o: 0.14, r: '8deg', f: true },
  { t: '62%', l: '68%', s: 16, o: 0.11, r: '-16deg', f: true },
  { t: '71%', l: '38%', s: 20, o: 0.12, r: '14deg', f: false },
  { t: '78%', l: '8%', s: 15, o: 0.11, r: '-6deg', f: true },
  { t: '82%', l: '78%', s: 26, o: 0.15, r: '10deg', f: true },
  { t: '90%', l: '46%', s: 17, o: 0.12, r: '-10deg', f: false },
];

const LAYOUTS = {
  screen: SCREEN_HEARTS,
  row: ROW_HEARTS,
  card: CARD_HEARTS,
};

const HeartsBackground = ({
  color = ROMANTIC.heart,
  variant = 'screen',
  intensity = 1,
  style,
}) => {
  const hearts = LAYOUTS[variant] || SCREEN_HEARTS;

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {hearts.map((h, i) => (
        <View
          key={`${variant}-${i}`}
          style={{
            position: 'absolute',
            top: h.t,
            left: h.l,
            opacity: Math.min(1, h.o * intensity),
            transform: [{ rotate: h.r }],
          }}
        >
          <Svg width={h.s} height={h.s} viewBox="0 0 24 24">
            <Path
              d={HEART_PATH}
              fill={h.f ? color : 'none'}
              stroke={h.f ? 'none' : color}
              strokeWidth={h.f ? 0 : 1.7}
              strokeLinejoin="round"
            />
          </Svg>
        </View>
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

export default React.memo(HeartsBackground);
