// src/components/ChequeCard.js
//
// Kart iki modda kullanılabilir:
// - blurred (interaktif değil): blur efekti + buton üstte gözükür
// - normal: kullanıcı swipe edebilir
//
// Seri numarası ve "ChequePass" filigranı KALDIRILDI.

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Gift, Download, SkipForward } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { expiryDaysFor } from '../config/cheques';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
export const CARD_W = Math.min(SCREEN_W - 48, 340);
export const CARD_H = Math.min(SCREEN_H * 0.55, 480);

const SWIPE_THRESHOLD = 110;

const ChequeCard = ({ template, onResolve, friendName, deckVariant = 'normal' }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Kart üstünde gösterilen geçerlilik: normal 3 gün, romantik 6 gün.
  const validityLabel = `${expiryDaysFor(deckVariant)} gün`;

  const resolve = (direction) => {
    onResolve(direction);
    translateX.value = withTiming(0, { duration: 250 });
    translateY.value = withTiming(0, { duration: 250 });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const { translationX, translationY } = e;
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);

      if (absY > absX && absY > SWIPE_THRESHOLD) {
        if (translationY < 0) {
          translateY.value = withTiming(-SCREEN_H, { duration: 260 }, () => {
            runOnJS(resolve)('gift');
          });
          return;
        } else {
          translateY.value = withTiming(SCREEN_H, { duration: 260 }, () => {
            runOnJS(resolve)('keep');
          });
          return;
        }
      }
      if (translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_W, { duration: 260 }, () => {
          runOnJS(resolve)('pass');
        });
        return;
      }
      translateX.value = withSpring(0, { damping: 16 });
      translateY.value = withSpring(0, { damping: 16 });
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_W / 2, 0, SCREEN_W / 2],
      [-12, 0, 12],
      Extrapolation.CLAMP
    );
    const rotateY = interpolate(
      translateY.value,
      [-SCREEN_H / 2, 0, SCREEN_H / 2],
      [6, 0, -6],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate + rotateY}deg` },
      ],
    };
  });

  const giftBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [-140, -30, 0], [1, 0.2, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(translateY.value, [-140, 0], [1, 0.7], Extrapolation.CLAMP) },
    ],
  }));

  const keepBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, 30, 140], [0, 0.2, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(translateY.value, [0, 140], [0.7, 1], Extrapolation.CLAMP) },
    ],
  }));

  const passBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-140, -30, 0], [1, 0.2, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(translateX.value, [-140, 0], [1, 0.7], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.badgeWrap, { top: 20 }, giftBadgeStyle]}>
        <View style={[styles.badge, { backgroundColor: COLORS.primary }]}>
          <Gift size={18} color={COLORS.text} />
          <Text style={styles.badgeText}>
            {friendName ? `@${friendName}'e Hediye` : 'Hediye Et'}
          </Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.badgeWrap, { bottom: 20 }, keepBadgeStyle]}>
        <View style={[styles.badge, { backgroundColor: COLORS.secondary }]}>
          <Download size={18} color={COLORS.text} />
          <Text style={styles.badgeText}>Kendine Al</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.passBadgeWrap, passBadgeStyle]}>
        <View style={[styles.badge, { backgroundColor: '#fff' }]}>
          <SkipForward size={18} color={COLORS.text} />
          <Text style={styles.badgeText}>Pas Geç</Text>
        </View>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.card, { backgroundColor: template.color }, cardStyle]}>
          <View style={styles.cardTopRow}>
            <View style={styles.chipLight}>
              <Text style={styles.chipLightText}>HEDİYE ÇEKİ</Text>
            </View>
          </View>

          <View style={styles.cardCenter}>
            <Text style={styles.cardTitle}>{template.title}</Text>
            <Text style={styles.cardSubtitle}>{template.subtitle}</Text>
          </View>

          <View style={styles.cardBottom}>
            <View>
              <Text style={styles.cardLabel}>ÇEKEN</Text>
              <Text style={styles.cardValue}>Sen</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardLabel}>GEÇERLİLİK</Text>
              <Text style={styles.cardValue}>{validityLabel}</Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_W,
    height: CARD_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    justifyContent: 'space-between',
    ...SHADOW.strong,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  chipLight: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  chipLightText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: COLORS.text,
  },
  cardCenter: { alignItems: 'center', paddingHorizontal: 8 },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 34,
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  cardSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.75,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 1.3,
    color: COLORS.text,
    opacity: 0.55,
  },
  cardValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.text,
    marginTop: 2,
  },
  badgeWrap: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
  },
  passBadgeWrap: {
    position: 'absolute',
    left: -20,
    top: '45%',
    zIndex: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    gap: 8,
    ...SHADOW.medium,
  },
  badgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.text,
  },
});

export default ChequeCard;
