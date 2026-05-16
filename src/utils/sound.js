// src/utils/sound.js
//
// Basit ses yönetim modülü. expo-av üzerine kurulu.
//
// Kullanım:
//   import { playShuffleSound, stopShuffleSound } from '../utils/sound';
//   playShuffleSound();   // shuffle başında çağır
//   stopShuffleSound();   // gerekirse erken kes
//
// Ses dosyası konumu: assets/sounds/shuffle.mp3 (Berk tarafından eklenecek)

import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

// Aktif çalan ses (aynı anda tek tane)
let activeSound = null;
let audioModeConfigured = false;

/**
 * iOS sessiz modunda da ses çalsın diye audio mode ayarı.
 * Apple varsayılanı: app sesleri sessize alınmışsa çalmaz.
 * Biz override ediyoruz — kartlar her ortamda ses çalar.
 * Bir kez çağrılır, sonraki ses denemelerinde tekrar gerekmez.
 */
const ensureAudioMode = async () => {
  if (audioModeConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,            // ← bu kritik: sessizdeyken de çal
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
    });
    audioModeConfigured = true;
  } catch (e) {
    console.warn('Audio mode setup failed:', e);
  }
};

/**
 * Shuffle sesini çalar. Kart karıştırma fazıyla senkron olmalı.
 * Ses ~1.5-1.8 sn olmalı (shuffle süresi 1500ms).
 */
export const playShuffleSound = async () => {
  try {
    await ensureAudioMode();

    // Önceki sesi durdur (varsa)
    if (activeSound) {
      try {
        await activeSound.stopAsync();
        await activeSound.unloadAsync();
      } catch (e) {}
      activeSound = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/shuffle.mp3'),
      { shouldPlay: true, volume: 0.85 }
    );
    activeSound = sound;

    // Ses bittiğinde otomatik temizlik
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (activeSound === sound) activeSound = null;
      }
    });
  } catch (e) {
    // Ses dosyası eksikse veya yüklenemiyorsa sessizce geç (uygulama çökmesin)
    console.warn('Shuffle sound failed:', e?.message || e);
  }
};

/**
 * Aktif shuffle sesini erken durdur.
 */
export const stopShuffleSound = async () => {
  if (!activeSound) return;
  try {
    await activeSound.stopAsync();
    await activeSound.unloadAsync();
  } catch (e) {}
  activeSound = null;
};
