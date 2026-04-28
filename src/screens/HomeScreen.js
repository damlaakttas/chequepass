// src/screens/HomeScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, PlayCircle, UserPlus } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import ChequeCard from '../components/ChequeCard';
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

  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [hasCard, setHasCard] = useState(false);
  const [passPromptOpen, setPassPromptOpen] = useState(false);
  const [pendingPassTemplate, setPendingPassTemplate] = useState(null);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [pendingResolve, setPendingResolve] = useState(null); // {template, direction}
  const [noteText, setNoteText] = useState('');

  const drawNewCard = useCallback(() => {
    const t = pickRandom(chequeTemplates);
    setCurrentTemplate(t);
    setHasCard(true);
  }, [chequeTemplates]);

  const handleResolve = async (direction) => {
    if (!activeFriend) {
      Alert.alert('Arkadaş seç', 'Önce bir arkadaş eklemelisin veya seçmelisin.');
      setHasCard(false);
      return;
    }
    if (direction === 'pass' && freePassUsed) {
      // Reklam izleme akışı
      setPendingPassTemplate(currentTemplate);
      setPassPromptOpen(true);
      setHasCard(false);
      return;
    }
    if (direction === 'pass') {
      // Pas Firestore'a yazılmaz, direkt çöz
      try {
        await resolveCheque(currentTemplate, 'pass', '');
      } catch (e) {
        Alert.alert('Hata', e.message || 'Pas geçilemedi');
      }
      setHasCard(false);
      return;
    }
    // Keep / Gift → önce not bottom sheet
    setPendingResolve({ template: currentTemplate, direction });
    setNoteText('');
    setHasCard(false);
    setNoteSheetOpen(true);
  };

  const [saving, setSaving] = useState(false);

  const finalizeResolve = async () => {
    if (!pendingResolve || saving) return;
    setSaving(true);
    try {
      await resolveCheque(pendingResolve.template, pendingResolve.direction, noteText);
      setPendingResolve(null);
      setNoteSheetOpen(false);
      setNoteText('');
    } catch (e) {
      Alert.alert('Hata', e.message || 'Çek kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const skipNote = async () => {
    if (!pendingResolve || saving) return;
    setSaving(true);
    try {
      await resolveCheque(pendingResolve.template, pendingResolve.direction, '');
      setPendingResolve(null);
      setNoteSheetOpen(false);
      setNoteText('');
    } catch (e) {
      Alert.alert('Hata', e.message || 'Çek kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const watchAdForPass = () => {
    // Gerçek projede AdMob rewarded ad burada gösterilir
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

  useEffect(() => {
    if (!hasCard && activeFriend) drawNewCard();
  }, [hasCard, activeFriend, drawNewCard]);

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
              <Text style={styles.prompt}>Kartı kaydır ve çekini kopart</Text>
            </View>

            <View style={styles.cardArea}>
              {hasCard && currentTemplate && (
                <ChequeCard
                  key={currentTemplate.title + Date.now()}
                  template={currentTemplate}
                  friendName={activeFriend.username}
                  onResolve={handleResolve}
                />
              )}
            </View>

            <View style={styles.hintRow}>
              <View style={styles.hintPill}>
                <Text style={styles.hintEmoji}>↑</Text>
                <Text style={styles.hintLabel}>Gönder</Text>
              </View>
              <View style={styles.hintPill}>
                <Text style={styles.hintEmoji}>↓</Text>
                <Text style={styles.hintLabel}>Kendine</Text>
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

      {/* Pas reklam modalı */}
      <BottomSheet
        visible={passPromptOpen}
        onClose={() => {
          setPassPromptOpen(false);
          setHasCard(false);
        }}
        title="Ücretsiz pas hakkın tükendi"
        maxHeight={380}
      >
        <Text style={styles.modalBody}>
          Günlük ücretsiz pas hakkını kullandın. Ekstra bir pas hakkı kazanmak için kısa bir
          reklam izleyebilirsin.
        </Text>
        <TouchableOpacity style={styles.watchBtn} onPress={watchAdForPass} activeOpacity={0.85}>
          <PlayCircle size={18} color="#fff" />
          <Text style={styles.watchBtnText}>Reklam İzle & Pas Kazan</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Not bottom sheet */}
      <BottomSheet
        visible={noteSheetOpen}
        onClose={skipNote}
        title="Not eklemek ister misin?"
        maxHeight={440}
      >
        <Text style={styles.modalBody}>
          Bu çekin kazanılma sebebini yazabilirsin. (Ör: Monopoly'de kaybettiğim için…)
        </Text>
        <NoteInputSection value={noteText} onChange={setNoteText} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <TouchableOpacity style={styles.ghostBtn} onPress={skipNote}>
            <Text style={styles.ghostBtnText}>Atla</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 1, opacity: saving ? 0.6 : 1 }]}
            onPress={finalizeResolve}
            disabled={saving}
          >
            <Text style={styles.primaryBtnText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};

// Ayrı küçük bileşen - not girişi
const NoteInputSection = ({ value, onChange }) => (
  <TextInput
    style={styles.realNoteInput}
    placeholder="Kısa bir not ekle..."
    placeholderTextColor={COLORS.textLight}
    value={value}
    onChangeText={onChange}
    multiline
    maxLength={160}
  />
);

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
  },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  noteInputWrap: { display: 'none' },
  noteInput: { display: 'none' },
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
