// src/screens/ProfileScreen.js
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LogOut,
  Trophy,
  Users,
  Gift,
  Send,
  Mail,
  AtSign,
  Edit3,
  Lock,
  CheckCircle2,
  Heart,
  ChevronRight,
  Trash2,
  AlertTriangle,
  FileText,
  Shield,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import AnimalAvatar from '../components/AnimalAvatar';
import BottomSheet from '../components/BottomSheet';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { TERMS_TEXT, PRIVACY_TEXT } from '../config/legal';

const AVATAR_OPTIONS = ['fox', 'panda', 'koala', 'bunny', 'cat', 'owl'];

const ProfileScreen = () => {
  const { user, friends, cheques, achievements, signOut, deleteAccount, setAvatar } = useApp();
  // Romantik paket ilişkiye özel: herhangi bir ilişkide aktifse "aktif" say.
  const hasRomantic = friends.some((f) => f.romanticActive === true);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [legalOpen, setLegalOpen] = useState(null); // 'terms' | 'privacy' | null

  // İstatistikler:
  // - won:    bana ait olan tüm çekler (ister kendi aldım, ister hediye aldım)
  // - gifted: ben göndermişim ve sahibi karşı taraf (yani hediye ettiklerim)
  const stats = useMemo(() => {
    if (!user?.uid) return { won: 0, gifted: 0, friends: 0 };
    const won = cheques.filter((c) => c.ownerId === user.uid).length;
    const gifted = cheques.filter((c) => c.ownerId !== user.uid && c.fromId === user.uid).length;
    return { won, gifted, friends: friends.length };
  }, [cheques, friends, user]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const handleLogout = () => {
    Alert.alert('Çıkış yap', 'Hesabından çıkış yapmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
    ]);
  };

  const openDeleteSheet = () => {
    setDeletePassword('');
    setDeleteOpen(true);
  };

  const handleDeleteAccount = () => {
    if (deleting) return;
    if (!deletePassword.trim()) {
      Alert.alert('Şifre gerekli', 'Hesabını silmek için şifreni girmelisin.');
      return;
    }
    Alert.alert(
      'Hesabını silmek üzeresin',
      'Bu işlem geri alınamaz. Profilin, arkadaşlıkların ve tüm çeklerin kalıcı olarak silinecek. Devam etmek istiyor musun?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kalıcı Olarak Sil',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount(deletePassword.trim());
              // deleteAccount başarılıysa auth listener kullanıcıyı
              // otomatik olarak giriş ekranına düşürür.
              setDeleteOpen(false);
            } catch (e) {
              Alert.alert('Hesap silinemedi', e?.message || 'Bilinmeyen bir hata oluştu.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleAvatarSelect = async (key) => {
    if (savingAvatar) return;
    setSavingAvatar(true);
    try {
      await setAvatar(key);
      setAvatarOpen(false);
    } catch (e) {
      Alert.alert('Hata', 'Avatar güncellenemedi.');
    } finally {
      setSavingAvatar(false);
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader showFriendSwitcher={false} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => setAvatarOpen(true)}
            activeOpacity={0.85}
          >
            <AnimalAvatar type={user.avatar || 'fox'} size={96} />
            <View style={styles.editDot}>
              <Edit3 size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.username}>@{user.username}</Text>
          <View style={styles.emailRow}>
            <Mail size={12} color={COLORS.textMuted} />
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: COLORS.primary }]}>
            <Gift size={18} color={COLORS.text} />
            <Text style={styles.statValue}>{stats.won}</Text>
            <Text style={styles.statLabel}>Sana Ait</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.secondary }]}>
            <Send size={18} color={COLORS.text} />
            <Text style={styles.statValue}>{stats.gifted}</Text>
            <Text style={styles.statLabel}>Hediye Ettin</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fff' }]}>
            <Users size={18} color={COLORS.text} />
            <Text style={styles.statValue}>{stats.friends}</Text>
            <Text style={styles.statLabel}>Arkadaş</Text>
          </View>
        </View>

        {/* Premium banner: stats ile achievements arasında */}
        {!hasRomantic ? (
          <TouchableOpacity
            style={styles.premiumBanner}
            onPress={() =>
              Alert.alert(
                'Romantik Paket',
                'Romantik paket kişiye özeldir. Kopart ekranında sevgilini/arkadaşını seçip oradan satın alarak o ilişki için etkinleştirebilirsin.'
              )
            }
            activeOpacity={0.85}
          >
            <View style={styles.premiumIconCircle}>
              <Heart size={20} color="#fff" fill="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumTitle}>Romantik Kartları Keşfet</Text>
              <Text style={styles.premiumSub}>İlişkinizin ateşini yükseltecek kartlar.</Text>
            </View>
            <ChevronRight size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.premiumBannerActive}>
            <View style={styles.premiumIconCircleActive}>
              <Heart size={18} color="#10b981" fill="#10b981" />
            </View>
            <Text style={styles.premiumActiveText}>Romantik Paket Aktif ✓</Text>
          </View>
        )}

        {/* Achievements */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Trophy size={16} color={COLORS.text} />
              <Text style={styles.sectionTitle}>Başarılar</Text>
            </View>
            <Text style={styles.sectionCount}>
              {unlockedCount}/{achievements.length}
            </Text>
          </View>
          <View style={styles.achievementsList}>
            {achievements.map((a) => (
              <View key={a.id} style={styles.achievement}>
                <View
                  style={[
                    styles.achievementIcon,
                    { backgroundColor: a.unlocked ? COLORS.secondary : COLORS.border },
                  ]}
                >
                  {a.unlocked ? (
                    <CheckCircle2 size={18} color={COLORS.text} />
                  ) : (
                    <Lock size={16} color={COLORS.textMuted} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.achievementTitle,
                      !a.unlocked && { color: COLORS.textMuted },
                    ]}
                  >
                    {a.title}
                  </Text>
                  <Text style={styles.achievementDesc}>{a.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Account info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <AtSign size={16} color={COLORS.textMuted} />
              <Text style={styles.infoLabel}>Kullanıcı adı</Text>
              <Text style={styles.infoValue}>@{user.username}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Mail size={16} color={COLORS.textMuted} />
              <Text style={styles.infoLabel}>E-posta</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Yasal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yasal</Text>
          <View style={styles.infoCard}>
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => setLegalOpen('terms')}
              activeOpacity={0.7}
            >
              <FileText size={16} color={COLORS.textMuted} />
              <Text style={styles.infoLabel}>Kullanım Şartları</Text>
              <ChevronRight size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => setLegalOpen('privacy')}
              activeOpacity={0.7}
            >
              <Shield size={16} color={COLORS.textMuted} />
              <Text style={styles.infoLabel}>Gizlilik Politikası</Text>
              <ChevronRight size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <LogOut size={16} color={COLORS.danger} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountBtn}
          onPress={openDeleteSheet}
          activeOpacity={0.85}
        >
          <Trash2 size={14} color={COLORS.textMuted} />
          <Text style={styles.deleteAccountText}>Hesabı Sil</Text>
        </TouchableOpacity>

        <Text style={styles.version}>ChequePass v1.0.0</Text>
      </ScrollView>

      <BottomSheet
        visible={avatarOpen}
        onClose={() => !savingAvatar && setAvatarOpen(false)}
        title="Avatarını seç"
        maxHeight={420}
      >
        <Text style={styles.avatarSub}>Favori hayvanını seç. Arkadaşların seni böyle görecek.</Text>
        <View style={styles.avatarGrid}>
          {AVATAR_OPTIONS.map((key) => {
            const selected = (user.avatar || 'fox') === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.avatarOption, selected && styles.avatarOptionActive]}
                onPress={() => handleAvatarSelect(key)}
                disabled={savingAvatar}
                activeOpacity={0.85}
              >
                <AnimalAvatar type={key} size={64} />
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>

      {/*
        Profil ekranında paywall YOK. Romantik paket ilişkiye özel olduğu için
        satın alma yalnızca hedef kişi belliyken (Kopart veya Arkadaşlar ekranı)
        yapılabilir. Buradaki banner sadece bilgilendirme amaçlı.
      */}

      {/* Yasal metinler */}
      <BottomSheet
        visible={!!legalOpen}
        onClose={() => setLegalOpen(null)}
        title={legalOpen === 'terms' ? 'Kullanım Şartları' : 'Gizlilik Politikası'}
      >
        <Text style={styles.legalBody}>
          {legalOpen === 'terms' ? TERMS_TEXT : PRIVACY_TEXT}
        </Text>
      </BottomSheet>

      {/* Hesap silme (Apple 5.1.1(v)) */}
      <BottomSheet
        visible={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="Hesabı Sil"
        maxHeight={460}
      >
        <View style={styles.deleteWarnBox}>
          <AlertTriangle size={18} color="#b91c1c" />
          <Text style={styles.deleteWarnText}>
            Bu işlem geri alınamaz. Hesabın silindiğinde profilin, kullanıcı adın,
            arkadaşlıkların ve tüm çeklerin kalıcı olarak silinir.
          </Text>
        </View>

        <Text style={styles.deleteLabel}>
          Onaylamak için hesabının şifresini gir:
        </Text>
        <TextInput
          style={styles.deleteInput}
          value={deletePassword}
          onChangeText={setDeletePassword}
          placeholder="Şifren"
          placeholderTextColor={COLORS.textLight}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!deleting}
        />

        <TouchableOpacity
          style={[styles.deleteConfirmBtn, deleting && { opacity: 0.6 }]}
          onPress={handleDeleteAccount}
          disabled={deleting}
          activeOpacity={0.85}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Trash2 size={16} color="#fff" />
              <Text style={styles.deleteConfirmText}>Hesabımı Kalıcı Olarak Sil</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteCancelBtn}
          onPress={() => !deleting && setDeleteOpen(false)}
          disabled={deleting}
        >
          <Text style={styles.deleteCancelText}>Vazgeç</Text>
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  avatarWrap: {
    position: 'relative',
    padding: 4,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    ...SHADOW.soft,
  },
  editDot: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  username: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  email: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    ...SHADOW.soft,
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.text,
    opacity: 0.7,
    marginTop: 2,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: '#dc2626',
    ...SHADOW.medium,
  },
  premiumIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#fff',
  },
  premiumSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  premiumBannerActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: '#d1fae5',
  },
  premiumIconCircleActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16,185,129,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumActiveText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#065f46',
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sectionCount: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  achievementsList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 4,
    ...SHADOW.soft,
  },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: RADIUS.md,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  achievementDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    ...SHADOW.soft,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  infoLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
  },
  infoValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.text,
    maxWidth: '55%',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    backgroundColor: '#fee2e2',
  },
  logoutText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.danger,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    paddingVertical: 12,
  },
  deleteAccountText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },
  legalBody: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  deleteWarnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fee2e2',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: SPACING.md,
  },
  deleteWarnText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 19,
  },
  deleteLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 8,
  },
  deleteInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  deleteConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
  },
  deleteConfirmText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#fff',
  },
  deleteCancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  deleteCancelText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  version: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  avatarSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  avatarOption: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  avatarOptionActive: {
    borderColor: COLORS.primaryDark,
    backgroundColor: COLORS.primary + '30',
  },
});

export default ProfileScreen;
