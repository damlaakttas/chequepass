// src/components/AppLogo.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { COLORS, FONTS } from '../theme/theme';

const AppLogo = ({ size = 'md' }) => {
  const config = {
    sm: { icon: 22, font: 16 },
    md: { icon: 28, font: 19 },
    lg: { icon: 56, font: 32 },
  }[size] || { icon: 28, font: 19 };

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { width: config.icon + 8, height: config.icon + 8 }]}>
        <Svg width={config.icon} height={config.icon} viewBox="0 0 40 40">
          <Circle cx="20" cy="20" r="18" fill={COLORS.primary} />
          <Path
            d="M12 14 L28 14 L28 26 L12 26 Z"
            fill={COLORS.surface}
            stroke={COLORS.text}
            strokeWidth="0.6"
          />
          <Path d="M15 18 L25 18 M15 22 L22 22" stroke={COLORS.text} strokeWidth="1.2" strokeLinecap="round" />
          <Circle cx="27" cy="26" r="5" fill={COLORS.secondary} stroke={COLORS.text} strokeWidth="0.6" />
          <Path d="M25 26 L26.5 27.5 L29.5 24.5" stroke={COLORS.text} strokeWidth="1.3" strokeLinecap="round" fill="none" />
        </Svg>
      </View>
      <Text style={[styles.brand, { fontSize: config.font }]}>
        Cheque<Text style={styles.brandAccent}>Pass</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: FONTS.bold,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: COLORS.primaryDark,
  },
});

export default AppLogo;
