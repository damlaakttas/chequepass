// src/screens/HomeScreen.js
//
// Akış:
// idle      → Kart "kapalı" (sırt görünüyor, rastgele renk) + yuvarlak "Çek Kopart" butonu
// shuffling → Kartlar açık ve hızlıca değişir (yazılı, ama hangisi seçileceği belli değil)
// ready     → Net açık kart; kullanıcı swipe edebilir
// noting    → Keep/Gift sonrası not modalı (X/dış-tık → kart yerinde durur)

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, PlayCircle, UserPlus, Layers } from 'lucide-react-native';
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
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { pickRandom } from '../utils/helpers';

const HomeScreen = ({ navigation }) => {
  const {
    chequeTemplates,
    isOnboarded,
    setOnboarded,
    resolveCheque,
    activeFriend,
    freePassUsed,
    grantExtraPass,
  } = useApp();

  const [phase, setPhase] = useState('idle');
  const [currentTemplate, setCurrentTemplate] = useState(null);
  // Idle'da kapalı kartın rengi (uygulama açılışında rastgele seçilir, sabit kalır
  // her shuffle bittiğinde yeniden rastgelelenir — böylece hep yeşil olmaz)
  const [idleColor, setIdleColor] = useState(null);
  // Shuffle sırasında üstte gösterilen geçici template (hızla değişir)
  const [shufflePreview, setShufflePreview] = useState(null);

  const [passPromptOpen, setPassPromptOpen] = useState(false);
  const [pendingPassTemplate, setPendingPassTemplate] = useState(null);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [pendingResolve, setPendingResolve] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const shuffleRotate = useSharedValue(0);
  const shuffleY = useSharedValue(0);
  const shuffleTimerRef = useRef(null);

  // İlk açılışta ve her ready→idle döngüsünde rastgele renk seç
  useEffect(() => {
    if (!idleColor && chequeTemplates.length) {
      setIdleColor(pickRandom(chequeTemplates).color);
    }
  }, [chequeTemplates, idleColor]);

  const startShuffle = useCallback(() => {
    if (phase !== 'idle' || !activeFriend) return;
    setPhase('shuffling');

    let i = 0;
    const tickMs = 100;
    const totalMs = 1500;
    const ticks = Math.floor(totalMs / tickMs);
    setShufflePreview(pickRandom(chequeTemplates));

    shuffleTimerRef.current = setInterval(() => {
      i++;
      setShufflePreview(pickRandom(chequeTemplates));
      if (i >= ticks) {
        clearInterval(shuffleTimerRef.current);
        shuffleTimerRef.current = null;
        const finalT = pickRandom(chequeTemplates);
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
  }, [phase, activeFriend, chequeTemplates, shuffleRotate, shuffleY]);

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
    // Yeni rastgele renk seç (hep yeşil olmasın)
    setIdleColor(pickRandom(chequeTemplates).color);
    setPhase('idle');
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

  // X / dış tıklama / geri tuşu → kart YERİNDE durur
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

  const watchAdForPass = () => {
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
      Alert.alert('Ekstra pas kazandın!', 'Bir reklam izledin, pas hakkın yenilendi.');
    }, 600);
  };

  const directionLabel = pendingResolve?.direction === 'gift'
    ? `@${activeFriend?.username || 'arkadaşına'} hediye edeceksin`
    : pendingResolve?.direction === 'keep'
      ? 'Çeki kendine alacaksın'
      : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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
            <View style={styles.topInfo}>
              <View style={styles.chip}>
                <Sparkles size={14} color={COLORS.text} />
                <Text style={styles.chipText}>
                  @{activeFriend.username} ile oynuyorsun
                </Text>
              </View>
              <Text style={styles.prompt}>
                {phase === 'idle' && 'Şansını dene, çekini kopart'}
                {phase === 'shuffling' && 'Kartlar karıştırılıyor...'}
                {phase === 'ready' && 'Kartı kaydır'}
                {phase === 'noting' && ' '}
              </Text>
            </View>

            <View style={styles.cardArea}>
              {/* IDLE: kapalı kart (sırtı) + yuvarlak buton */}
              {phase === 'idle' && idleColor && (
                <View style={styles.deckWrap}>
                  <DeckCard color={idleColor} />
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

              {/* SHUFFLING: açık kartlar hızlıca değişir, blur YOK */}
              {phase === 'shuffling' && shufflePreview && (
                <Animated.View style={shuffleAnimStyle}>
                  <ChequeCardStatic template={shufflePreview} />
                </Animated.View>
              )}

              {/* READY: net swipe edilebilir kart */}
              {phase === 'ready' && currentTemplate && (
                <ChequeCard
                  key={currentTemplate.title}
                  template={currentTemplate}
                  friendName={activeFriend.username}
                  onResolve={handleResolve}
                />
              )}

              {/* NOTING: kart "çekildi", boş alan */}
              {phase === 'noting' && (
                <View style={{ width: CARD_W, height: CARD_H }} />
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

      <BottomSheet
        visible={passPromptOpen}
        onClose={() => setPassPromptOpen(false)}
        title="Ücretsiz pas hakkın tükendi"
        maxHeight={380}
      >
        <Text style={styles.modalBody}>
          Günlük ücretsiz pas hakkını kullandın. Ekstra bir pas hakkı kazanmak için kısa bir
          reklam izleyebilirsin. Pas hakkın 24 saat içinde otomatik yenilenir.
        </Text>
        <TouchableOpacity style={styles.watchBtn} onPress={watchAdForPass} activeOpacity={0.85}>
          <PlayCircle size={18} color="#fff" />
          <Text style={styles.watchBtnText}>Reklam İzle & Pas Kazan</Text>
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

// Shuffle sırasında gösterilen swipe edilemeyen ama görünüşü ChequeCard ile aynı olan
// statik kart. (Reanimated parent içinde yer alabilsin diye sade bir View.)
const ChequeCardStatic = ({ template }) => (
  <View style={[staticStyles.card, { backgroundColor: template.color }]}>
    <View style={staticStyles.topRow}>
      <View style={staticStyles.chipLight}>
        <Text style={staticStyles.chipLightText}>HEDİYE ÇEKİ</Text>
      </View>
    </View>
    <View style={staticStyles.center}>
      <Text style={staticStyles.title}>{template.title}</Text>
      <Text style={staticStyles.subtitle}>{template.subtitle}</Text>
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
    fontSize: 34,
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.75,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
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
  container: { flex: 1, paddingHorizontal: SPACING.lg },
  topInfo: { alignItems: 'center', marginTop: SPACING.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    ...SHADOW.soft,
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.text,
  },
  prompt: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: COLORS.text,
    marginTop: 14,
    textAlign: 'center',
    minHeight: 22,
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
  // Yuvarlak Kopart butonu
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
