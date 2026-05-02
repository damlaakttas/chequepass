// src/components/AppLogo.js
//
// İki kullanım:
// - <AppLogo variant="header" />  → tüm ekranlarda sol üst (logo.png yatay)
// - <AppLogo variant="hero" />    → giriş ekranı orta amblem (amblem.png kare)
//
// Asset dosyaları (assets/ klasörü altında):
//   logo.png      (yatay marka logosu — yazı + sembol)
//   amblem.png    (kare amblem — mağaza ikonu için de kullanılır)
//
// Çalışma mantığı:
// - Header için: 200×46 boyutunda bir kutu çizilir; logo.png "contain" ile
//   bu kutuya sığar. Logo dosyası ne aspect oranda olursa olsun bozulmadan görünür.
// - Hero için: 180×180 kare; amblem ortalanır, "contain" ile sığar.

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

const HEADER_W = 200;
const HEADER_H = 46;

const HERO_SIZE = 180;

const AppLogo = ({ variant = 'header', size }) => {
  if (variant === 'hero') {
    const dim = size || HERO_SIZE;
    return (
      <View style={[styles.heroBox, { width: dim, height: dim }]}>
        <Image
          source={require('../../assets/amblem.png')}
          style={styles.imageFill}
          resizeMode="contain"
        />
      </View>
    );
  }

  // header (default)
  return (
    <View style={[styles.headerBox, { width: HEADER_W, height: HEADER_H }]}>
      <Image
        source={require('../../assets/logo.png')}
        style={styles.imageFill}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  heroBox: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBox: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  imageFill: {
    width: '100%',
    height: '100%',
  },
});

export default AppLogo;
