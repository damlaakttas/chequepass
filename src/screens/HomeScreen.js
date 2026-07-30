// src/screens/HomeScreen.js
//
// Akış:
// idle      → Kapalı kart + yuvarlak "KOPART" butonu
// shuffling → Kartlar açık ve hızlıca değişir
// ready     → Net kart, swipe edilebilir
// noting    → Not modalı (X/dış-tık → kart yerinde durur)
//
// Yenilikler:
// - "@xxx ile oynuyorsun" üst chip'i KALDIRILDI
// - "Şansını dene, çekini kopart" yazısı yukarı çıktı
// - Yazı altında:
//   * Premium YOKsa:  "🔒 Romantik" kilitli ikon → Paywall açar
//   * Premium VARsa:  "Normal" / "Romantik" segmented switcher
// - chequeTemplates yerine activeDeckInfo.cards (Firestore)

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlayCircle, UserPlus, Layers, Lock, Heart } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import ScreenHeader from '../components/ScreenHeader';
import ChequeCard, { CARD_W, CARD_H } from '../components/ChequeCard';
import DeckCard from '../components/DeckCard';
import OnboardingOverlay from '../components/OnboardingOverlay';
import BottomSheet from '../components/BottomSheet';
import PaywallSheet from '../components/PaywallSheet';
import HeartsBackground from '../components/HeartsBackground';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { usePremium } from '../context/PremiumContext';
import { pickRandom } from '../utils/helpers';
import { playShuffleSound } from '../utils/sound';

// Romantik mod kart renkleri (kırmızının tonları)
const ROMANTIC_REDS = ['#dc2626', '#e11d48', '#be123c', '#f43f5e', '#b91c1c', '#e8506b'];

const HomeScreen = ({ navigation }) => {
  const {
    activeDeckInfo,
    decksLoaded,
    isOnboarded,
    setOnboarded,
    resolveCheque,
    activeFriend,
    freePassUsed,
    grantExtraPass,
    setSelectedDeckVariant,
    activateRomanticForFriend,
  } = useApp();

  // Romantik paket artık cihaz geneli değil, AKTİF İLİŞKİYE özel.
  const romanticActive = activeDeckInfo.romanticActive === true;

  const cards = activeDeckInfo.cards;
  const currentVariant = activeDeckInfo.currentVariant;
  const baseVariant = activeDeckInfo.baseVariant; // 'partner' veya 'friend'

  const [phase, setPhase] = useState('idle');
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [idleColor, setIdleColor] = useState(null);
  const [shufflePreview, setShufflePreview] = useState(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const [passPromptOpen, setPassPromptOpen] = useState(false);
  const [pendingPassTemplate, setPendingPassTemplate] = useState(null);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [pendingResolve, setPendingResolve] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const shuffleRotate = useSharedValue(0);
  const shuffleY = useSharedValue(0);
  const shuffleTimerRef = useRef(null);

  // Idle rengini ayarla. Romantik moda geçilince kart yüzü ANINDA kırmızı olsun.
  useEffect(() => {
    if (phase !== 'idle') return;
    if (currentVariant === 'romantic') {
      setIdleColor(pickRandom(ROMANTIC_REDS));
    } else if (cards.length) {
      setIdleColor(pickRandom(cards).color);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVariant, cards]);

  // Aktif arkadaş değişince fazı resetle
  useEffect(() => {
    setPhase('idle');
    setCurrentTemplate(null);
    if (cards.length) setIdleColor(pickRandom(cards).color);
  }, [activeFriend?.id, currentVariant]);


  const startShuffle = useCallback(() => {
    if (phase !== 'idle' || !activeFriend || cards.length === 0) return;
    playShuffleSound();
    setPhase('shuffling');

    let i = 0;
    const tickMs = 100;
    const totalMs = 1500;
    const ticks = Math.floor(totalMs / tickMs);
    // Romantik modda kart yüzünü kırmızının tonlarına boya.
    const tint = (t) =>
      t && currentVariant === 'romantic' ? { ...t, color: pickRandom(ROMANTIC_REDS) } : t;
    setShufflePreview(tint(pickRandom(cards)));

    shuffleTimerRef.current = setInterval(() => {
      i++;
      setShufflePreview(tint(pickRandom(cards)));
      if (i >= ticks) {
        clearInterval(shuffleTimerRef.current);
        shuffleTimerRef.current = null;
        const finalT = tint(pickRandom(cards));
        setCurrentTemplate(finalT);
        setShufflePreview(null);
        setPhase('ready');
      }
    }, tickMs);

    shuffleRotate.value = withSequence(
      withTiming(-6, { duration: 90, easing: Easing.linear }),
      withTiming(6, { duration: 90, easing: Easing.linear }),
      withTiming(-4, { duration: 90, easing: Easing.linear }),
      withTiming(4, { duration: 90, easing: Easing.linear }),
      withTiming(-3, { duration: 90, easing: Easing.linear }),
      withTiming(3, { duration: 90, easing: Easing.linear }),
      withTiming(0, { duration: 120, easing: Easing.out(Easing.quad) })
    );
    shuffleY.value = withSequence(
      withTiming(-12, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) }),
      withTiming(-8, { duration: 160 }),
      withTiming(0, { duration: 160 })
    );
  }, [phase, activeFriend, cards, shuffleRotate, shuffleY]);

  useEffect(() => {
    return () => {
      if (shuffleTimerRef.current) clearInterval(shuffleTimerRef.current);
    };
  }, []);

  const shuffleAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: shuffleY.value },
      { rotate: `${shuffleRotate.value}deg` },
    ],
  }));

  const goToIdle = () => {
    setCurrentTemplate(null);
    if (currentVariant === 'romantic') {
      // Romantik modda kart yüzü kırmızının tonlarında.
      setIdleColor(pickRandom(ROMANTIC_REDS));
    } else if (cards.length) {
      setIdleColor(pickRandom(cards).color);
    }
    setPhase('idle');
  };

  const handleVariantSelect = (variant) => {
    if (variant === 'romantic' && !romanticActive) {
      setPaywallOpen(true);
      return;
    }
    setSelectedDeckVariant(variant);
    goToIdle();
  };

  const handleResolve = async (direction) => {
    if (!activeFriend) {
      Alert.alert('Arkadaş seç', 'Önce bir arkadaş eklemelisin veya seçmelisin.');
      goToIdle();
      return;
    }

    if (direction === 'pass' && freePassUsed) {
      setPendingPassTemplate(currentTemplate);
      setPassPromptOpen(true);
      goToIdle();
      return;
    }

    if (direction === 'pass') {
      try {
        await resolveCheque(currentTemplate, 'pass', '');
      } catch (e) {
        Alert.alert('Hata', e.message || 'Pas geçilemedi');
      }
      goToIdle();
      return;
    }

    setPendingResolve({ template: currentTemplate, direction });
    setNoteText('');
    setNoteSheetOpen(true);
    setPhase('noting');
  };

  const closeNoteSheetWithoutAction = () => {
    Keyboard.dismiss();
    setNoteSheetOpen(false);
    setPendingResolve(null);
    setNoteText('');
    setPhase('ready');
  };

  const finalizeResolve = async () => {
    if (!pendingResolve || saving) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      await resolveCheque(pendingResolve.template, pendingResolve.direction, noteText);
      setPendingResolve(null);
      setNoteSheetOpen(false);
      setNoteText('');
      goToIdle();
    } catch (e) {
      Alert.alert('Hata', e.message || 'Çek kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const skipNote = async () => {
    if (!pendingResolve || saving) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      await resolveCheque(pendingResolve.template, pendingResolve.direction, '');
      setPendingResolve(null);
      setNoteSheetOpen(false);
      setNoteText('');
      goToIdle();
    } catch (e) {
      Alert.alert('Hata', e.message || 'Çek kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  // Pas hakkı bitince bonus pas ver. (Reklam entegrasyonu Adım 3'te eklenecek.)
  const claimBonusPass = () => {
    setPassPromptOpen(false);
    setTimeout(async () => {
      grantExtraPass();
      if (pendingPassTemplate) {
        try {
          await resolveCheque(pendingPassTemplate, 'pass', '');
        } catch (e) {
          console.warn('Pass resolve failed:', e);
        }
        setPendingPassTemplate(null);
      }
      Alert.alert('Ekstra pas kazandın!', 'Bonus pas hakkın tanımlandı.');
    }, 600);
  };

  const directionLabel = pendingResolve?.direction === 'gift'
    ? `@${activeFriend?.username || 'arkadaşına'} hediye edeceksin`
    : pendingResolve?.direction === 'keep'
      ? 'Çeki kendine alacaksın'
      : '';

  // Deck henüz yüklenmediyse (Firestore'dan kart geldi mi?)
  const isDecksLoading = !decksLoaded;
  const deckEmpty = decksLoaded && cards.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Romantik modda tüm ekranı kaplayan sabit kalpli arka plan (normal modda yok) */}
      {currentVariant === 'romantic' && (
        <HeartsBackground color="#dc2626" style={styles.heartsFull} />
      )}

      <ScreenHeader />

      <View style={styles.container}>
        {!activeFriend ? (
          <View style={styles.emptyBox}>
            <UserPlus size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Önce bir arkadaş ekle</Text>
            <Text style={styles.emptySub}>
              Çek koparmak için eşleşeceğin birini eklemen gerekli.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('Friends')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Arkadaşlar'a Git</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Üst başlık - "@xxx ile oynuyorsun" KALDIRILDI */}
            <View style={styles.topInfo}>
              <Text style={styles.prompt}>
                {phase === 'idle' && 'Şansını dene, çekini kopart'}
                {phase === 'shuffling' && 'Kartlar karıştırılıyor...'}
                {phase === 'ready' && 'Kartı kaydır'}
                {phase === 'noting' && ' '}
              </Text>

              {/* Premium yoksa: kilitli "Romantik" ikon */}
              {/* Premium varsa: Normal/Romantik switcher */}
              {phase === 'idle' && !romanticActive && (
                <TouchableOpacity
                  style={styles.lockedRomanticBtn}
                  onPress={() => setPaywallOpen(true)}
                  activeOpacity={0.85}
                >
                  <Lock size={14} color="#dc2626" />
                  <Text style={styles.lockedRomanticText}>Romantik Paket</Text>
                  <Heart size={12} color="#dc2626" fill="#dc2626" />
                </TouchableOpacity>
              )}

              {phase === 'idle' && romanticActive && (
                <View style={styles.variantSwitcher}>
                  <TouchableOpacity
                    style={[
                      styles.variantTab,
                      currentVariant === 'normal' && styles.variantTabActive,
                    ]}
                    onPress={() => handleVariantSelect('normal')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.variantText,
                        currentVariant === 'normal' && styles.variantTextActive,
                      ]}
                    >
                      Normal
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.variantTab,
                      currentVariant === 'romantic' && styles.variantTabActiveRomantic,
                    ]}
                    onPress={() => handleVariantSelect('romantic')}
                    activeOpacity={0.8}
                  >
                    <Heart
                      size={12}
                      color={currentVariant === 'romantic' ? '#fff' : '#dc2626'}
                      fill={currentVariant === 'romantic' ? '#fff' : '#dc2626'}
                    />
                    <Text
                      style={[
                        styles.variantText,
                        currentVariant === 'romantic' && styles.variantTextActiveRomantic,
                      ]}
                    >
                      Romantik
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.cardArea}>
              {isDecksLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={COLORS.text} />
                  <Text style={styles.loadingText}>Kartlar yükleniyor...</Text>
                </View>
              ) : deckEmpty ? (
                <View style={styles.loadingBox}>
                  <Text style={styles.loadingText}>Bu desteye henüz kart eklenmedi.</Text>
                </View>
              ) : (
                <>
                  {phase === 'idle' && idleColor && (
                    <View style={styles.deckWrap}>
                      <DeckCard color={currentVariant === 'romantic' ? (idleColor || ROMANTIC_REDS[0]) : idleColor} />
                      <TouchableOpacity
                        style={styles.copartBtn}
                        onPress={startShuffle}
                        activeOpacity={0.85}
                      >
                        <View style={styles.copartBtnInner}>
                          <Layers size={26} color="#fff" />
                          <Text style={styles.copartBtnText}>KOPART</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}

                  {phase === 'shuffling' && shufflePreview && (
                    <Animated.View style={shuffleAnimStyle}>
                      <ChequeCardStatic template={shufflePreview} />
                    </Animated.View>
                  )}

                  {phase === 'ready' && currentTemplate && (
                    <ChequeCard
                      key={currentTemplate.title + currentTemplate.id}
                      template={currentTemplate}
                      friendName={activeFriend.username}
                      onResolve={handleResolve}
                    />
                  )}

                  {phase === 'noting' && (
                    <View style={{ width: CARD_W, height: CARD_H }} />
                  )}
                </>
              )}
            </View>

            <View style={styles.hintRow}>
              <View style={styles.hintPill}>
                <Text style={styles.hintEmoji}>↑</Text>
                <Text style={styles.hintLabel}>Hediye Et</Text>
              </View>
              <View style={styles.hintPill}>
                <Text style={styles.hintEmoji}>↓</Text>
                <Text style={styles.hintLabel}>Kendine Al</Text>
              </View>
              <View style={styles.hintPill}>
                <Text style={styles.hintEmoji}>←</Text>
                <Text style={styles.hintLabel}>Pas</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {!isOnboarded && activeFriend && (
        <OnboardingOverlay onDismiss={setOnboarded} />
      )}

      <PaywallSheet
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onSuccess={async () => {
          // Satın alma başarılı → romantik paketi AKTİF İLİŞKİYE bağla.
          try {
            await activateRomanticForFriend(activeFriend?.id);
          } catch (e) {
            Alert.alert('Hata', e.message || 'Romantik paket etkinleştirilemedi');
            return;
          }
          setSelectedDeckVariant('romantic');
          goToIdle();
        }}
      />

      <BottomSheet
        visible={passPromptOpen}
        onClose={() => setPassPromptOpen(false)}
        title="Ücretsiz pas hakkın tükendi"
        maxHeight={380}
      >
        <Text style={styles.modalBody}>
          Günlük ücretsiz pas hakkını kullandın. İstersen bir bonus pas hakkı kullanabilirsin.
          Pas hakkın 24 saat içinde otomatik yenilenir.
        </Text>
        <TouchableOpacity style={styles.watchBtn} onPress={claimBonusPass} activeOpacity={0.85}>
          <PlayCircle size={18} color="#fff" />
          <Text style={styles.watchBtnText}>Bonus Pas Kullan</Text>
        </TouchableOpacity>
      </BottomSheet>

      <BottomSheet
        visible={noteSheetOpen}
        onClose={closeNoteSheetWithoutAction}
        title={directionLabel || 'Not eklemek ister misin?'}
        maxHeight={520}
      >
        <Text style={styles.modalBody}>
          İstersen bu çekin kazanılma sebebini yazabilirsin. (Ör: "Tabu'da kaybettiğim için")
        </Text>
        <TextInput
          style={styles.realNoteInput}
          placeholder="Kısa bir not ekle..."
          placeholderTextColor={COLORS.textLight}
          value={noteText}
          onChangeText={setNoteText}
          multiline
          maxLength={160}
        />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: SPACING.md }}>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={skipNote}
            disabled={saving}
          >
            <Text style={styles.ghostBtnText}>Atla</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 1, opacity: saving ? 0.6 : 1 }]}
            onPress={finalizeResolve}
            disabled={saving}
          >
            <Text style={styles.primaryBtnText}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};

// Statik kart (shuffle sırasında)
const ChequeCardStatic = ({ template }) => (
  <View style={[staticStyles.card, { backgroundColor: template.color }]}>
    <View style={staticStyles.topRow}>
      <View style={staticStyles.chipLight}>
        <Text style={staticStyles.chipLightText}>HEDİYE ÇEKİ</Text>
      </View>
    </View>
    <View style={staticStyles.center}>
      <Text style={staticStyles.title}>{template.title}</Text>
      <Text style={staticStyles.subtitle} numberOfLines={3}>{template.subtitle}</Text>
    </View>
    <View style={staticStyles.bottom}>
      <View>
        <Text style={staticStyles.label}>ÇEKEN</Text>
        <Text style={staticStyles.value}>Sen</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={staticStyles.label}>GEÇERLİLİK</Text>
        <Text style={staticStyles.value}>Süresiz</Text>
      </View>
    </View>
  </View>
);

const staticStyles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    justifyContent: 'space-between',
    ...SHADOW.strong,
  },
  topRow: { flexDirection: 'row', justifyContent: 'flex-start' },
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
  center: { alignItems: 'center', paddingHorizontal: 8 },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.text,
    opacity: 0.75,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  bottom: { flexDirection: 'row', justifyContent: 'space-between' },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 1.3,
    color: COLORS.text,
    opacity: 0.55,
  },
  value: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.text,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  heartsFull: { zIndex: 0 },
  container: { flex: 1, paddingHorizontal: SPACING.lg },
  topInfo: {
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  prompt: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.text,
    textAlign: 'center',
    minHeight: 28,
    letterSpacing: -0.4,
  },
  // Premium yoksa: kilitli buton
  lockedRomanticBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  lockedRomanticText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#dc2626',
  },
  // Premium varsa: switcher
  variantSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    padding: 4,
    ...SHADOW.soft,
  },
  variantTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  variantTabActive: {
    backgroundColor: COLORS.text,
  },
  variantTabActiveRomantic: {
    backgroundColor: '#dc2626',
  },
  variantText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  variantTextActive: {
    color: '#fff',
  },
  variantTextActiveRomantic: {
    color: '#fff',
  },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckWrap: {
    width: CARD_W,
    height: CARD_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copartBtn: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.strong,
  },
  copartBtnInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  copartBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#fff',
    letterSpacing: 1.2,
  },
  loadingBox: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 110,
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    ...SHADOW.soft,
  },
  hintEmoji: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.text,
  },
  hintLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: SPACING.lg,
    maxWidth: 280,
  },
  primaryBtn: {
    backgroundColor: COLORS.text,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 13,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#fff',
  },
  modalBody: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.text,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
  },
  watchBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#fff',
  },
  realNoteInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  ghostBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 13,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  ghostBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
});

export default HomeScreen;
