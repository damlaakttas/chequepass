import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Modal,
  TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore }  from '../../src/store/authStore';
import { useMatchStore } from '../../src/store/matchStore';
import { signOut, changePassword, changeEmail } from '../../src/services/authService';
import { updateProfile } from '../../src/services/userService';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';
import { CpLogo } from '../../src/components/shared/CpLogo';

// ─── Şifre Değiştir Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next,    setNext]    = useState('');
  const [loading, setLoading] = useState(false);

  async function handle() {
    if (!current || !next) { Alert.alert('Hata', 'Tüm alanları doldur.'); return; }
    if (next.length < 6)  { Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalı.'); return; }
    setLoading(true);
    try {
      await changePassword(current, next);
      Alert.alert('Başarılı ✓', 'Şifren güncellendi.');
      setCurrent(''); setNext('');
      onClose();
    } catch {
      Alert.alert('Hata', 'Mevcut şifren hatalı.');
    } finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Şifre Değiştir</Text>
          <TextInput
            style={styles.input}
            placeholder="Mevcut şifre"
            placeholderTextColor={Colors.textHint}
            secureTextEntry
            value={current}
            onChangeText={setCurrent}
          />
          <TextInput
            style={styles.input}
            placeholder="Yeni şifre (en az 6 karakter)"
            placeholderTextColor={Colors.textHint}
            secureTextEntry
            value={next}
            onChangeText={setNext}
          />
          <TouchableOpacity style={styles.modalBtn} onPress={handle} disabled={loading}>
            <Text style={styles.modalBtnText}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
            <Text style={styles.modalCancelText}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── E-posta Güncelle Modal ──────────────────────────────────────────────────
function ChangeEmailModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [password,  setPassword]  = useState('');
  const [newEmail,  setNewEmail]  = useState('');
  const [loading,   setLoading]   = useState(false);

  async function handle() {
    if (!password || !newEmail) { Alert.alert('Hata', 'Tüm alanları doldur.'); return; }
    setLoading(true);
    try {
      await changeEmail(password, newEmail);
      Alert.alert('Başarılı ✓', 'E-posta adresin güncellendi.');
      setPassword(''); setNewEmail('');
      onClose();
    } catch {
      Alert.alert('Hata', 'Şifren hatalı veya e-posta geçersiz.');
    } finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>E-posta Güncelle</Text>
          <TextInput
            style={styles.input}
            placeholder="Mevcut şifren"
            placeholderTextColor={Colors.textHint}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Yeni e-posta adresi"
            placeholderTextColor={Colors.textHint}
            keyboardType="email-address"
            autoCapitalize="none"
            value={newEmail}
            onChangeText={setNewEmail}
          />
          <TouchableOpacity style={styles.modalBtn} onPress={handle} disabled={loading}>
            <Text style={styles.modalBtnText}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
            <Text style={styles.modalCancelText}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Ana Profil Ekranı ───────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router  = useRouter();
  const { user, clear } = useAuthStore();
  const { clearMatches } = useMatchStore();

  const [showPwModal,    setShowPwModal]    = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  async function handleSignOut() {
    Alert.alert('Çıkış Yap', 'Hesabından çıkmak istediğinden emin misin?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          clear(); clearMatches();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const stats = user?.stats ?? { totalWon: 0, totalPassed: 0, totalFriends: 0 };

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <CpLogo size="sm" />
          </View>

          {/* Avatar & isim */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>
                {user?.displayName?.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text style={styles.displayName}>{user?.displayName ?? '—'}</Text>
            <Text style={styles.username}>@{user?.username ?? '—'}</Text>
          </View>

          {/* İstatistikler: Kazanılan / Paslanan / Arkadaşlarım */}
          <View style={styles.statsRow}>
            {[
              { label: 'Kazanılan', value: stats.totalWon },
              { label: 'Paslanan',  value: stats.totalPassed },
              { label: 'Arkadaşlarım', value: stats.totalFriends },
            ].map((s) => (
              <View key={s.label} style={styles.statBox}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Ayarlar */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hesap</Text>

            {/* E-posta — tıklayınca modal */}
            <TouchableOpacity style={styles.row} onPress={() => setShowEmailModal(true)}>
              <Text style={styles.rowLabel}>E-posta</Text>
              <Text style={styles.rowValue} numberOfLines={1}>{user?.email ?? '—'}</Text>
              <Text style={styles.rowChevron}>›</Text>
            </TouchableOpacity>

            {/* Kullanıcı adı — salt okunur */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => Alert.alert('Kullanıcı Adı', 'Kullanıcı adı değiştirilemez.')}
            >
              <Text style={styles.rowLabel}>Kullanıcı Adı</Text>
              <Text style={styles.rowValue}>@{user?.username ?? '—'}</Text>
              <Text style={styles.rowChevron}>🔒</Text>
            </TouchableOpacity>

            {/* Şifre değiştir — modal açar */}
            <TouchableOpacity style={styles.row} onPress={() => setShowPwModal(true)}>
              <Text style={styles.rowLabel}>Şifre Değiştir</Text>
              <Text style={styles.rowChevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Çıkış */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <ChangePasswordModal visible={showPwModal}    onClose={() => setShowPwModal(false)} />
      <ChangeEmailModal    visible={showEmailModal} onClose={() => setShowEmailModal(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md },

  avatarWrap: { alignItems: 'center', paddingVertical: Spacing.lg },
  avatar: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: Colors.lavender,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.sm,
  },
  avatarLetter: { fontFamily: Typography.fontBrand, fontSize: 36, color: Colors.brand },
  displayName:  { ...Typography.h2 },
  username:     { ...Typography.bodySm, color: Colors.textMuted, marginTop: 2 },

  statsRow: {
    flexDirection:    'row',
    marginHorizontal: Spacing.lg,
    backgroundColor:  Colors.surface,
    borderRadius:     Radius.lg,
    padding:          Spacing.md,
    justifyContent:   'space-around',
    marginBottom:     Spacing.lg,
    shadowColor:      '#fac5cd',
    shadowOffset:     { width: 0, height: 4 },
    shadowOpacity:    0.15,
    shadowRadius:     10,
    elevation:        3,
  },
  statBox:   { alignItems: 'center', flex: 1 },
  statValue: { fontFamily: Typography.fontBrand, fontSize: 28, color: Colors.brand },
  statLabel: { ...Typography.caption, marginTop: 2, textAlign: 'center' },

  section: {
    marginHorizontal: Spacing.lg,
    backgroundColor:  Colors.surface,
    borderRadius:     Radius.lg,
    overflow:         'hidden',
    marginBottom:     Spacing.lg,
    shadowColor:      '#fac5cd',
    shadowOffset:     { width: 0, height: 4 },
    shadowOpacity:    0.10,
    shadowRadius:     10,
    elevation:        2,
  },
  sectionTitle: {
    ...Typography.caption,
    paddingHorizontal: Spacing.md,
    paddingTop:        Spacing.md,
    paddingBottom:     Spacing.xs,
    textTransform:     'uppercase',
  },
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.md,
    borderTopWidth:    1,
    borderTopColor:    Colors.border,
  },
  rowLabel:   { ...Typography.bodyMed, flex: 1 },
  rowValue:   { ...Typography.bodySm, color: Colors.textMuted, flex: 1, textAlign: 'right', marginRight: 8 },
  rowChevron: { fontSize: 16, color: Colors.textMuted },

  signOutBtn: {
    marginHorizontal: Spacing.lg,
    height:           50,
    borderRadius:     Radius.md,
    backgroundColor:  'rgba(231,76,60,0.08)',
    borderWidth:      1,
    borderColor:      'rgba(231,76,60,0.2)',
    alignItems:       'center',
    justifyContent:   'center',
  },
  signOutText: { fontFamily: Typography.fontBodySem, fontSize: 15, color: Colors.error },

  // Modaller
  modalBg: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.40)',
    justifyContent:  'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding:         Spacing.lg,
    gap:             Spacing.sm,
  },
  modalTitle: { ...Typography.h2, marginBottom: Spacing.sm },
  input: {
    height:          50,
    backgroundColor: Colors.gradientStart,
    borderRadius:    Radius.md,
    paddingHorizontal: 14,
    fontFamily:      Typography.fontBody,
    fontSize:        14,
    color:           Colors.textPrimary,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  modalBtn: {
    height:          50,
    borderRadius:    Radius.md,
    backgroundColor: Colors.brand,
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       Spacing.xs,
  },
  modalBtnText:    { fontFamily: Typography.fontBodySem, fontSize: 15, color: '#fff' },
  modalCancel: {
    height:          44,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  modalCancelText: { fontFamily: Typography.fontBodyMed, fontSize: 14, color: Colors.textMuted },
});
