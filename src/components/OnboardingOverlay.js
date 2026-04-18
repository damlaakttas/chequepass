// src/components/OnboardingOverlay.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { ArrowUp, ArrowDown, ArrowLeft, Sparkles } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../theme/theme';

const OnboardingOverlay = ({ onDismiss }) => {
  const upY = useSharedValue(0);
  const downY = useSharedValue(0);
  const leftX = useSharedValue(0);

  useEffect(() => {
    upY.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    downY.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(14, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      )
    );
    leftX.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(-14, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      )
    );
  }, []);

  const upStyle = useAnimatedStyle(() => ({ transform: [{ translateY: upY.value }] }));
  const downStyle = useAnimatedStyle(() => ({ transform: [{ translateY: downY.value }] }));
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: leftX.value }] }));

  return (
    <Pressable style={styles.bg} onPress={onDismiss}>
      <View style={styles.card}>
        <View style={styles.sparkles}>
          <Sparkles size={22} color={COLORS.secondaryDark} />
        </View>
        <Text style={styles.title}>Hoş geldin!</Text>
        <Text style={styles.sub}>Çek kartını kaydırarak kullan</Text>

        <View style={styles.row}>
          <Animated.View style={[styles.hint, upStyle]}>
            <View style={[styles.iconWrap, { backgroundColor: COLORS.primary }]}>
              <ArrowUp size={22} color={COLORS.text} />
            </View>
            <Text style={styles.hintText}>Ona Gönder</Text>
          </Animated.View>

          <Animated.View style={[styles.hint, downStyle]}>
            <View style={[styles.iconWrap, { backgroundColor: COLORS.secondary }]}>
              <ArrowDown size={22} color={COLORS.text} />
            </View>
            <Text style={styles.hintText}>Kendine Al</Text>
          </Animated.View>

          <Animated.View style={[styles.hint, leftStyle]}>
            <View style={[styles.iconWrap, { backgroundColor: '#fff' }]}>
              <ArrowLeft size={22} color={COLORS.text} />
            </View>
            <Text style={styles.hintText}>Pas Geç</Text>
          </Animated.View>
        </View>

        <View style={styles.button}>
          <Text style={styles.buttonText}>Anladım, başlayalım</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    zIndex: 100,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  sparkles: { marginBottom: SPACING.sm },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.text,
  },
  sub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.lg,
  },
  hint: { alignItems: 'center', flex: 1 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  hintText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.text,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
  },
  buttonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.surface,
  },
});

export default OnboardingOverlay;
