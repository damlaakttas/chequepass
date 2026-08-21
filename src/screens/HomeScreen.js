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
import BottomSheet from '../components/BottomSheet';
import PaywallSheet from '../components/PaywallSheet';
import RomanticBackdrop from '../components/RomanticBackdrop';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import {
  ROMANTIC,
  isRomanticVariant,
  resolveIdleColor,
  tintTemplate,
} from '../theme/romantic';
import { expiryDaysFor } from '../config/cheques';
import { useApp } from '../context/AppContext';
import { usePremium } from '../context/PremiumContext';
import { pickRandom } from '../utils/helpers';
import { playShuffleSound } from '../utils/sound';
import { showRewardedAd, getAdDiagnostics } from '../services/ads';
import { isTestAdAccount, SHOW_AD_DIAGNOSTICS } from '../config/ads';

// İLK AÇILIŞ TANITIMI
//
// Ayrı bir tanıtım ekranı YOK. Kullanıcı doğrudan Kopart ekranında,
// gerçek kartla üç hareketi sırayla yapıyor. Bu üç kart Firestore'a
// YAZILMAZ — Çeklerim'e yansımaz, sadece öğretme amaçlıdır.
const TUTORIAL_STEPS = [
  { dir: 'gift', text: 'Kartı yukarı kaydır: çeki arkadaşına hediye edersin.' },
  { dir: 'keep', text: 'Kartı aşağı kaydır: çeki kendine alırsın.' },
  { dir: 'pass', text: 'Kartı sola kaydır: bu çeki istemedin, pas geçersin.' },
];

// Deste henüz yüklenmediyse ya da arkadaş yoksa gösterilecek örnek kartlar.
const TUTORIAL_FALLBACK = [
  { id: 't1', title: 'Kahve Senden', subtitle: 'Bir sonraki buluşmada kahveyi sen ısmarlıyorsun.', color: COLORS.primary },
  { id: 't2', title: 'Film Seçimi', subtitle: 'Bu akşam ne izleyeceğimize sen karar veriyorsun.', color: COLORS.secondary },
  { id: 't3', title: 'Bulaşık Nöbeti', subtitle: 'Bu haftanın bulaşıkları sana emanet.', color: '#c7d2fe' },
];

const HomeScreen = ({ navigation }) => {
  const {
    user,
    activeDeckInfo,
    decks,
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
  const isRomanticMode = isRomanticVariant(currentVariant);

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
  const [adLoading, setAdLoading] = useState(false);

  const shuffleRotate = useSharedValue(0);
  const shuffleY = useSharedValue(0);
  const shuffleTimerRef = useRef(null);

  // ---- İlk açılış tanıtımı (gerçek ekranın içinde) ----
  //
  // Yalnızca uygulama ilk kurulduğunda çalışır: isOnboarded cihaza yazılır,
  // çıkış yapınca veya hesap silinince sıfırlanmaz.
  const tutorialActive = !isOnboarded;
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialCards, setTutorialCards] = useState([]);
  const tutorial = TUTORIAL_STEPS[tutorialStep] || null;

  // Tanıtımda HER ZAMAN normal deste kullanılır — romantik kartlar örnek
  // olarak gösterilmez. baseVariant ilişki türüne göre 'partner' ya da 'friend'.
  const normalDeck = (decks?.[baseVariant]?.length ? decks[baseVariant] : decks?.friend) || [];

  // Üç adım için birbirinden farklı üç kart seç (deste geldiğinde bir kez).
  useEffect(() => {
    if (!tutorialActive || !normalDeck.length) return;
    const shuffled = [...normalDeck].sort(() => Math.random() - 0.5);
    setTutorialCards(
      TUTORIAL_STEPS.map((_, i) => shuffled[i % shuffled.length])
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialActive, normalDeck.length]);

  // Deste henüz gelmediyse örnek kartlarla başla.
  const tutorialTemplate = tutorialCards[tutorialStep] || TUTORIAL_FALLBACK[tutorialStep];

  // Tanıtımda swipe Firestore'a YAZILMAZ; sadece sonraki adıma geçilir.
  const handleTutorialResolve = (direction) => {
    if (!tutorial || direction !== tutorial.dir) return;
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep((s) => s + 1);
    } else {
      setOnboarded();
      setTutorialStep(0);
    }
  };

  // Varyant veya aktif arkadaş değişince: akışı sıfırla ve kapalı kartın rengini
  // DOĞRUDAN yeni varyanta göre ata. (Eskiden iki ayrı effect vardı; ikincisi
  // birincinin romantik rengini normal deste rengiyle eziyordu — "Romantik"e ilk
  // tıklamada kart kırmızı gelmemesinin sebebi buydu.)
  useEffect(() => {
    if (shuffleTimerRef.current) {
      clearInterval(shuffleTimerRef.current);
      shuffleTimerRef.current = null;
    }
    setShufflePreview(null);
    setCurrentTemplate(null);
    setPhase('idle');
    setIdleColor(resolveIdleColor(currentVariant, cards));
    // `cards` bilerek bağımlılıkta değil: Firestore deste güncellemesi
    // devam eden bir kopart akışını bozmasın.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFriend?.id, currentVariant]);

  // Uygulama ilk açılışında deste Firestore'dan sonra gelirse rengi tamamla.
  useEffect(() => {
    if (phase !== 'idle' || idleColor || !cards.length) return;
    setIdleColor(resolveIdleColor(currentVariant, cards));
  }, [cards, currentVariant, phase, idleColor]);


  const startShuffle = useCallback(() => {
    if (phase !== 'idle' || !activeFriend || cards.length === 0) return;
    playShuffleSound();
    setPhase('shuffling');

    let i = 0;
    const tickMs = 100;
    const totalMs = 1500;
    const ticks = Math.floor(totalMs / tickMs);
    // Romantik modda kart yüzünü kırmızının tonlarına boya.
    const tint = (t) => tintTemplate(t, currentVariant);
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
  }, [phase, activeFriend, cards, currentVariant, shuffleRotate, shuffleY]);

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
    setShufflePreview(null);
    setIdleColor(resolveIdleColor(currentVariant, cards));
    setPhase('idle');
  };

  const handleVariantSelect = (variant) => {
    if (variant === currentVariant) return;
    if (variant === 'romantic' && !romanticActive) {
      setPaywallOpen(true);
      return;
    }
    // Rengi burada set etmiyoruz; varyant değişince yukarıdaki effect
    // yeni varyanta göre doğru rengi atıyor. (Aksi halde eski varyantın
    // rengi bir kare boyunca görünürdü.)
    setSelectedDeckVariant(variant);
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

  /**
   * Pas hakkı bitince ödüllü reklam izleyerek bonus pas kazan.
   *
   * - Reklam sonuna kadar izlenirse    → pas verilir
   * - Reklam yarıda kapatılırsa         → pas VERİLMEZ
   * - Reklam hiç yüklenemezse           → pas yine verilir (kullanıcı
   *   internet/envanter sorunundan dolayı tıkanmasın diye)
   */
  const claimBonusPass = async () => {
    if (adLoading) return;
    setAdLoading(true);

    let result = { available: false, rewarded: false, reason: 'istisna' };
    try {
      // Test hesaplarına gerçek reklam yerine test reklamı gösterilir;
      // biz test ederken reklama dokunmak sorun olmaz.
      result = await showRewardedAd({ email: user?.email });
    } catch (e) {
      console.warn('Rewarded ad failed:', e);
      result = { available: false, rewarded: false, reason: `istisna: ${e?.message || e}` };
    }
    setAdLoading(false);

    // Reklam açıldı ama kullanıcı ödülü hak etmeden kapattı.
    if (result.available && !result.rewarded) {
      Alert.alert(
        'Reklam tamamlanmadı',
        'Bonus pas kazanmak için reklamı sonuna kadar izlemen gerekiyor.'
      );
      return;
    }

    setPassPromptOpen(false);
    grantExtraPass();
    if (pendingPassTemplate) {
      try {
        await resolveCheque(pendingPassTemplate, 'pass', '');
      } catch (e) {
        console.warn('Pass resolve failed:', e);
      }
      setPendingPassTemplate(null);
    }

    // Teşhis modu açıkken ve test hesabındayken, reklam gelmediyse nedenini göster.
    // Normalde kapalı; gerçek kullanıcılar bu metni hiçbir koşulda görmez.
    if (SHOW_AD_DIAGNOSTICS && !result.available && isTestAdAccount(user?.email)) {
      const d = getAdDiagnostics({ email: user?.email });
      Alert.alert(
        'Ekstra pas kazandın! (reklam gelmedi)',
        `Neden: ${result.reason}\n\n` +
          `modül: ${d.moduleLoaded ? 'var' : 'YOK'}\n` +
          `mobileAds(): ${d.mobileAdsFn ? 'var' : 'YOK'}\n` +
          `init: ${d.initState}${d.lastInitError ? ' — ' + d.lastInitError : ''}\n` +
          `reklam: ${d.usingTestAd ? 'TEST' : 'GERÇEK'}` +
          (d.importError ? `\nimport hatası: ${d.importError}` : '')
      );
      return;
    }

    Alert.alert('Ekstra pas kazandın!', 'Bonus pas hakkın tanımlandı.');
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
      {/* Romantik modda tüm ekranı kaplayan gradient + kalp deseni (normal modda yok).
          Tanıtım normal kartlarla anlatıldığı için o sırada gösterilmez. */}
      {isRomanticMode && !tutorialActive && <RomanticBackdrop />}

      <ScreenHeader />

      <View style={styles.container}>
        {/* Tanıtım sürerken arkadaş yoksa bile ekranı gösteriyoruz;
            kullanıcı önce kartı kullanmayı öğreniyor. */}
        {!activeFriend && !tutorialActive ? (
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
              {tutorialActive ? (
                <>
                  <View style={styles.tutorialDots}>
                    {TUTORIAL_STEPS.map((s, i) => (
                      <View
                        key={s.dir}
                        style={[
                          styles.tutorialDot,
                          i === tutorialStep && styles.tutorialDotActive,
                          i < tutorialStep && styles.tutorialDotDone,
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.tutorialText}>{tutorial?.text}</Text>
                </>
              ) : (
                <Text style={[styles.prompt, isRomanticMode && styles.promptRomantic]}>
                  {phase === 'idle' &&
                    (isRomanticMode ? 'Romantik çekini kopart' : 'Şansını dene, çekini kopart')}
                  {phase === 'shuffling' && 'Kartlar karıştırılıyor...'}
                  {phase === 'ready' && 'Kartı kaydır'}
                  {phase === 'noting' && ' '}
                </Text>
              )}

              {/* Premium yoksa: kilitli "Romantik" ikon */}
              {/* Premium varsa: Normal/Romantik switcher */}
              {!tutorialActive && phase === 'idle' && !romanticActive && (
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

              {!tutorialActive && phase === 'idle' && romanticActive && (
                <View
                  style={[styles.variantSwitcher, isRomanticMode && styles.variantSwitcherRomantic]}
                >
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
              {tutorialActive ? (
                // Tanıtım: gerçek kart, yön kilitli + otomatik ipucu hareketi.
                // onResolve Firestore'a YAZMAZ, sadece adımı ilerletir.
                tutorialTemplate && (
                  <ChequeCard
                    key={`tutorial-${tutorialStep}`}
                    template={tutorialTemplate}
                    friendName={activeFriend?.username}
                    deckVariant="normal"
                    lockDirection={tutorial?.dir}
                    hintDirection={tutorial?.dir}
                    onResolve={handleTutorialResolve}
                  />
                )
              ) : isDecksLoading ? (
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
                      <DeckCard color={idleColor} romantic={isRomanticMode} />
                      <TouchableOpacity
                        style={[styles.copartBtn, isRomanticMode && styles.copartBtnRomantic]}
                        onPress={startShuffle}
                        activeOpacity={0.85}
                      >
                        <View style={styles.copartBtnInner}>
                          {isRomanticMode ? (
                            <Heart size={26} color="#fff" fill="#fff" />
                          ) : (
                            <Layers size={26} color="#fff" />
                          )}
                          <Text style={styles.copartBtnText}>KOPART</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}

                  {phase === 'shuffling' && shufflePreview && (
                    <Animated.View style={shuffleAnimStyle}>
                      <ChequeCardStatic template={shufflePreview} deckVariant={currentVariant} />
                    </Animated.View>
                  )}

                  {phase === 'ready' && currentTemplate && (
                    <ChequeCard
                      key={currentTemplate.title + currentTemplate.id}
                      template={currentTemplate}
                      friendName={activeFriend.username}
                      deckVariant={currentVariant}
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
              {[
                { arrow: '↑', label: 'Hediye Et', dir: 'gift' },
                { arrow: '↓', label: 'Kendine Al', dir: 'keep' },
                { arrow: '←', label: 'Pas', dir: 'pass' },
              ].map((h) => {
                // Tanıtımda sıradaki hareket vurgulanır, diğerleri soluklaşır.
                const isTarget = tutorialActive && tutorial?.dir === h.dir;
                const dimmed = tutorialActive && !isTarget;
                return (
                  <View
                    key={h.label}
                    style={[
                      styles.hintPill,
                      isRomanticMode && styles.hintPillRomantic,
                      isTarget && styles.hintPillTarget,
                      dimmed && styles.hintPillDimmed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.hintEmoji,
                        isRomanticMode && styles.hintTextRomantic,
                        isTarget && styles.hintTextTarget,
                      ]}
                    >
                      {h.arrow}
                    </Text>
                    <Text
                      style={[
                        styles.hintLabel,
                        isRomanticMode && styles.hintTextRomantic,
                        isTarget && styles.hintTextTarget,
                      ]}
                    >
                      {h.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>


      <PaywallSheet
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        targetFriend={activeFriend}
        onSuccess={async () => {
          // Satın alma başarılı → romantik paketi AKTİF İLİŞKİYE bağla.
          // Hata fırlatırsa PaywallSheet kullanıcıyı uyarır ve modalı kapatmaz.
          await activateRomanticForFriend(activeFriend?.id);
          // Varyant değişimi effect'i tetikler; renk/faz orada sıfırlanır.
          setSelectedDeckVariant('romantic');
        }}
      />

      <BottomSheet
        visible={passPromptOpen}
        onClose={() => setPassPromptOpen(false)}
        title="Ücretsiz pas hakkın tükendi"
        maxHeight={380}
      >
        <Text style={styles.modalBody}>
          Günlük ücretsiz pas hakkını kullandın. Kısa bir reklam izleyerek bir bonus pas
          kazanabilirsin. Pas hakkın 24 saat içinde otomatik yenilenir.
        </Text>
        <TouchableOpacity
          style={[styles.watchBtn, adLoading && { opacity: 0.6 }]}
          onPress={claimBonusPass}
          disabled={adLoading}
          activeOpacity={0.85}
        >
          {adLoading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.watchBtnText}>Reklam yükleniyor...</Text>
            </>
          ) : (
            <>
              <PlayCircle size={18} color="#fff" />
              <Text style={styles.watchBtnText}>Reklam İzle, Pas Kazan</Text>
            </>
          )}
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
            <Text style={styles.ghostBtnText}>Notsuz Gönder</Text>
          </TouchableOpacity>
          {/* Not yazılmadan "Not Ekle" basılamaz; boş not eklemenin anlamı yok.
              Not yazmak istemeyen "Notsuz Gönder"i kullanır. */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { flex: 1, opacity: saving || !noteText.trim() ? 0.45 : 1 },
            ]}
            onPress={finalizeResolve}
            disabled={saving || !noteText.trim()}
          >
            <Text style={styles.primaryBtnText}>
              {saving ? 'Kaydediliyor...' : 'Not Ekle'}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};

// Statik kart (shuffle sırasında)
const ChequeCardStatic = ({ template, deckVariant = 'normal' }) => (
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
        <Text style={staticStyles.value}>{expiryDaysFor(deckVariant)} gün</Text>
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
  promptRomantic: {
    color: ROMANTIC.accentDark,
  },
  // ---- Tanıtım ----
  tutorialDots: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  tutorialDot: {
    width: 26,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  tutorialDotActive: { backgroundColor: COLORS.text },
  tutorialDotDone: { backgroundColor: COLORS.primaryDark },
  tutorialText: {
    fontFamily: FONTS.semiBold,
    fontSize: 17,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
    minHeight: 48,
    maxWidth: 300,
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
  variantSwitcherRomantic: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: ROMANTIC.rowBorder,
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
  copartBtnRomantic: {
    backgroundColor: ROMANTIC.accent,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
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
  hintPillRomantic: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: ROMANTIC.rowBorder,
  },
  hintPillTarget: {
    backgroundColor: COLORS.text,
    transform: [{ scale: 1.06 }],
  },
  hintPillDimmed: { opacity: 0.35 },
  hintTextTarget: { color: '#fff' },
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
  hintTextRomantic: {
    color: ROMANTIC.accentDark,
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
