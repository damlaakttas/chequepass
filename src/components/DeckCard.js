// src/components/DeckCard.js
//
// Kart "kapalı" yüzü. Idle modunda gösterilir.
// İçerik: kart rengi + amblem ortada (desen) — yazı yok.
// Romantik varyantta kart sırtında beyaz kalp deseni belirir.

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import HeartsBackground from './HeartsBackground';
import { COLORS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { CARD_W, CARD_H } from './ChequeCard';

const DeckCard = ({ color, romantic = false }) => {
  return (
    <View style={[styles.card, { backgroundColor: color || COLORS.primary }]}>
      {/* Romantik: kart sırtında yumuşak beyaz kalpler */}
      {romantic && <HeartsBackground variant="card" color="#ffffff" intensity={1.6} />}

      {/* İç border (kart sırtı dekoru) */}
      <View style={styles.innerBorder}>
        <View style={styles.amblemWrap}>
          <Image
            source={require('../../assets/amblem.png')}
            style={styles.amblem}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...SHADOW.strong,
  },
  innerBorder: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amblemWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amblem: {
    width: 80,
    height: 80,
    opacity: 0.85,
  },
});

export default DeckCard;
