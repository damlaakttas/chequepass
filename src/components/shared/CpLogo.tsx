import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../theme';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'header' | 'auth';
}

// Header logo: sadece tipografik "chequepass" (küçük harf, brand fontu)
export function CpLogo({ size = 'md', variant = 'header' }: Props) {
  const fontSize = size === 'sm' ? 20 : size === 'md' ? 26 : 34;

  if (variant === 'auth') {
    // Auth sayfası: kare amblem + metin
    return (
      <View style={styles.authContainer}>
        <View style={styles.emblem}>
          <View style={styles.emblemInner}>
            <Text style={styles.emblemP}>P</Text>
          </View>
        </View>
        <Text style={[styles.brandText, { fontSize: 28 }]}>chequepass</Text>
      </View>
    );
  }

  // Header: sadece metin
  return (
    <Text style={[styles.brandText, { fontSize }]}>chequepass</Text>
  );
}

const styles = StyleSheet.create({
  brandText: {
    fontFamily: Typography.fontBrand,
    color:      Colors.brand,
    letterSpacing: -0.5,
  },
  authContainer: {
    alignItems: 'center',
    gap: 12,
  },
  emblem: {
    width:         72,
    height:        72,
    borderRadius:  20,
    backgroundColor: Colors.brand,
    alignItems:    'center',
    justifyContent:'center',
    shadowColor:   Colors.brand,
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius:  16,
    elevation:     8,
  },
  emblemInner: {
    // "P" kıvrım detayı
  },
  emblemP: {
    fontFamily: Typography.fontBrand,
    fontSize:   38,
    color:      '#fff',
    lineHeight: 44,
  },
});
