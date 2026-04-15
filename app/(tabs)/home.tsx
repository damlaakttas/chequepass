import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, PanResponder, Animated,
  TouchableOpacity, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuthStore }  from '../../src/store/authStore';
import { useMatchStore } from '../../src/store/matchStore';
import { createCoupon, DEMO_TEMPLATES } from '../../src/services/couponService';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';
import { CpLogo } from '../../src/components/shared/CpLogo';

const { width: SW, height: SH } = Dimensions.get('window');
const THRESHOLD = 100;
const TEMPLATES = DEMO_TEMPLATES;

export default function HomeScreen() {
  const { user }                    = useAuthStore();
  const { selectedMatch, matches, selectMatch } = useMatchStore();

  const [templateIdx, setTemplateIdx] = useState(0);
  const [passCount,   setPassCount]   = useState(1); // 1 ücretsiz pas
  const [gameNote,    setGameNote]    = useState('');
  const [noteVisible, setNoteVisible] = useState(false);
  const [pendingDir,  setPendingDir]  = useState<'up' | 'down' | null>(null);

  const pan       = useRef(new Animated.ValueXY()).current;
  const opacity   = useRef(new Animated.Value(1)).current;
  const overlayUp = useRef(new Animated.Value(0)).current;
  const overlayDn = useRef(new Animated.Value(0)).current;
  const overlayLt = useRef(new Animated.Value(0)).current;

  const template = TEMPLATES[templateIdx % TEMPLATES.length];
  const partner  = selectedMatch
    ? selectedMatch.participantNames[
        selectedMatch.participants.find((p) => p !== user?.uid) ?? ''
      ] ?? 'Partner'
    : 'Partner';

  function resetCard() {
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
    overlayUp.setValue(0);
    overlayDn.setValue(0);
    overlayLt.setValue(0);
    opacity.setValue(1);
  }

  function flyCard(dir: 'up' | 'down' | 'left') {
    const toValue = dir === 'up'
      ? { x: 0, y: -SH }
      : dir === 'down'
      ? { x: 0, y: SH }
      : { x: -SW, y: 0 };

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(pan,     { toValue, duration: 350, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      pan.setValue({ x: 0, y: 0 });
      opacity.setValue(1);
      overlayUp.setValue(0);
      overlayDn.setValue(0);
      overlayLt.setValue(0);

      if (dir !== 'left') {
        // Notu sor ya da direkt işle
        setPendingDir(dir as 'up' | 'down');
        setNoteVisible(true);
      } else {
        setTemplateIdx((i) => i + 1);
      }
    });
  }

  async function processCoupon(direction: 'up' | 'down') {
    if (!user || !selectedMatch) {
      Alert.alert('Eşleşme Yok', 'Önce bir arkadaşla eşleş.');
      return;
    }
    const partnerId = selectedMatch.participants.find((p) => p !== user.uid) ?? '';
    try {
      await createCoupon({
        templateId: template.templateId,
        matchId:    selectedMatch.matchId,
        giverId:    direction === 'up' ? user.uid : partnerId,
        winnerId:   direction === 'up' ? partnerId : user.uid,
        direction:  direction === 'up' ? 'gift' : 'self',
        gameNote,
      });
    } catch (e) {
      Alert.alert('Hata', 'Çek oluşturulamadı.');
    }
    setTemplateIdx((i) => i + 1);
    setGameNote('');
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gs) => {
      pan.setValue({ x: gs.dx * 0.3, y: gs.dy });
      const progress = Math.abs(gs.dy) / THRESHOLD;
      if (gs.dy < -20) {
        overlayUp.setValue(Math.min(progress, 1));
        overlayDn.setValue(0);
        overlayLt.setValue(0);
      } else if (gs.dy > 20) {
        overlayDn.setValue(Math.min(progress, 1));
        overlayUp.setValue(0);
        overlayLt.setValue(0);
      } else if (gs.dx < -20) {
        overlayLt.setValue(Math.min(Math.abs(gs.dx) / THRESHOLD, 1));
        overlayUp.setValue(0);
        overlayDn.setValue(0);
      }
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy < -THRESHOLD || gs.vy < -0.8) {
        flyCard('up');
      } else if (gs.dy > THRESHOLD || gs.vy > 0.8) {
        flyCard('down');
      } else if (gs.dx < -THRESHOLD) {
        if (passCount > 0) {
          setPassCount((c) => c - 1);
          flyCard('left');
        } else {
          Alert.alert('Pas Hakkı Bitti', 'Reklam izleyerek pas hakkı kazanabilirsin.', [
            { text: 'Reklam İzle', onPress: () => setPassCount((c) => c + 1) },
            { text: 'İptal', style: 'cancel' },
          ]);
          resetCard();
        }
      } else {
        resetCard();
      }
    },
  });

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <CpLogo size="sm" />
          {/* Partner seçici */}
          {matches.length > 0 && (
            <TouchableOpacity
              style={styles.partnerPill}
              onPress={() => {
                // Birden fazla eşleşme varsa seçim yap
                if (matches.length === 1) return;
                Alert.alert(
                  'Partner Seç',
                  '',
                  matches.map((m) => ({
                    text: m.participantNames[
                      m.participants.find((p) => p !== user?.uid) ?? ''
                    ] ?? 'Partner',
                    onPress: () => selectMatch(m),
                  })),
                );
              }}
            >
              <Text style={styles.partnerText}>{partner} ▾</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Swipe alanı */}
        <View style={styles.cardArea}>
          {/* Hint — Yukarı */}
          <View style={styles.hintUp}>
            <Text style={styles.hintText}>↑ {partner}'e Pas Ver</Text>
          </View>

          {/* Kart */}
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.card,
              {
                transform: [
                  { translateX: pan.x },
                  { translateY: pan.y },
                  { rotate: pan.x.interpolate({ inputRange: [-SW, SW], outputRange: ['-8deg', '8deg'] }) },
                ],
                opacity,
              },
            ]}
          >
            {/* Up overlay */}
            <Animated.View style={[styles.overlay, styles.overlayUp, { opacity: overlayUp }]}>
              <Text style={styles.overlayIcon}>🎁</Text>
              <Text style={styles.overlayLabel}>{partner}'e Pas Ver</Text>
            </Animated.View>
            {/* Down overlay */}
            <Animated.View style={[styles.overlay, styles.overlayDown, { opacity: overlayDn }]}>
              <Text style={styles.overlayIcon}>⭐</Text>
              <Text style={styles.overlayLabel}>Kendine Al</Text>
            </Animated.View>
            {/* Left (pas) overlay */}
            <Animated.View style={[styles.overlay, styles.overlayLeft, { opacity: overlayLt }]}>
              <Text style={styles.overlayIcon}>⏩</Text>
              <Text style={styles.overlayLabel}>Pas Geç ({passCount} hak)</Text>
            </Animated.View>

            {/* Kart içeriği */}
            <View style={styles.cardTop}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>{template.category.toUpperCase()}</Text>
              </View>
              <Text style={styles.cardEmoji}>🎫</Text>
            </View>
            <View style={styles.cardBottom}>
              <Text style={styles.cardTitle}>{template.title}</Text>
              <Text style={styles.cardDesc}>{template.description}</Text>
            </View>
          </Animated.View>

          {/* Hint — Aşağı */}
          <View style={styles.hintDown}>
            <Text style={styles.hintText}>↓ Kendine Al</Text>
          </View>

          {/* Pas hakkı */}
          <View style={styles.passInfo}>
            <Text style={styles.passText}>← Pas Geç ({passCount} hakkın var)</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Oyun notu modalı */}
      <Modal visible={noteVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.noteSheet}>
            <Text style={styles.noteTitle}>Oyun Notu (Opsiyonel)</Text>
            <Text style={styles.noteHint}>Bu çeki hangi oyun / iddia için kazandın?</Text>
            <TouchableOpacity
              style={styles.noteSkip}
              onPress={() => {
                setNoteVisible(false);
                if (pendingDir) processCoupon(pendingDir);
              }}
            >
              <Text style={styles.noteSkipText}>Not Eklemeden Devam</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.noteConfirm}
              onPress={() => {
                setNoteVisible(false);
                if (pendingDir) processCoupon(pendingDir);
              }}
            >
              <Text style={styles.noteConfirmText}>Kaydet ve Devam Et</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const CARD_W = SW - 64;
const CARD_H = CARD_W * 1.4;

const styles = StyleSheet.create({
  safe:    { flex: 1 },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  partnerPill: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      Radius.full,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  partnerText: { fontFamily: Typography.fontBodyMed, fontSize: 13, color: Colors.brand },

  cardArea: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  hintUp: { marginBottom: Spacing.lg },
  hintDown: { marginTop: Spacing.lg },
  hintText: {
    fontFamily: Typography.fontBodyMed,
    fontSize:   13,
    color:      Colors.textMuted,
  },

  card: {
    width:           CARD_W,
    height:          CARD_H,
    borderRadius:    Radius.xl,
    backgroundColor: Colors.surface,
    shadowColor:     '#fac5cd',
    shadowOffset:    { width: 0, height: 12 },
    shadowOpacity:   0.35,
    shadowRadius:    24,
    elevation:       10,
    overflow:        'hidden',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius:    Radius.xl,
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          10,
  },
  overlayUp:   { backgroundColor: 'rgba(159,214,200,0.85)' },
  overlayDown: { backgroundColor: 'rgba(230,233,159,0.85)' },
  overlayLeft: { backgroundColor: 'rgba(203,185,225,0.85)' },
  overlayIcon:  { fontSize: 48, marginBottom: 8 },
  overlayLabel: { fontFamily: Typography.fontBodySem, fontSize: 18, color: Colors.textPrimary },

  cardTop: {
    flex:           1,
    padding:        Spacing.lg,
    alignItems:     'center',
    justifyContent: 'center',
    backgroundColor: Colors.gradientStart,
  },
  categoryPill: {
    backgroundColor: Colors.lavender,
    paddingHorizontal: 12,
    paddingVertical:   4,
    borderRadius:      Radius.full,
    marginBottom:      Spacing.md,
  },
  categoryText: {
    fontFamily: Typography.fontBodyMed,
    fontSize:   10,
    color:      Colors.brand,
    letterSpacing: 0.8,
  },
  cardEmoji:  { fontSize: 64 },

  cardBottom: {
    padding:         Spacing.lg,
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
  },
  cardTitle: { ...Typography.h2, marginBottom: Spacing.xs },
  cardDesc:  { ...Typography.bodySm, color: Colors.textSecondary },

  passInfo: { marginTop: Spacing.sm },
  passText: { fontFamily: Typography.fontBody, fontSize: 11, color: Colors.textHint },

  // Note modal
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  noteSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap:     Spacing.md,
  },
  noteTitle: { ...Typography.h3 },
  noteHint:  { ...Typography.bodySm, color: Colors.textSecondary },
  noteSkip: {
    height:          48,
    borderRadius:    Radius.md,
    borderWidth:     1.5,
    borderColor:     Colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  noteSkipText:    { fontFamily: Typography.fontBodyMed, fontSize: 14, color: Colors.textMuted },
  noteConfirm: {
    height:          48,
    borderRadius:    Radius.md,
    backgroundColor: Colors.brand,
    alignItems:      'center',
    justifyContent:  'center',
  },
  noteConfirmText: { fontFamily: Typography.fontBodySem, fontSize: 14, color: '#fff' },
});
