// src/screens/ProfileScreen.js
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LogOut,
  Trophy,
  Users,
  SkipForward,
  Gift,
  Mail,
  AtSign,
  Edit3,
  Lock,
  CheckCircle2,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import AnimalAvatar from '../components/AnimalAvatar';
import BottomSheet from '../components/BottomSheet';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useApp } from '../context/AppContext';

const AVATAR_OPTIONS = ['fox', 'panda', 'koala', 'bunny', 'cat', 'owl'];

const ProfileScreen = () => {
  const { user, friends, cheques, achievements, signOut, setAvatar } = useApp();
  const [avatarOpen, setAvatarOpen] = useState(false);

  const stats = useMemo(() => {
    const won = cheques.filter((c) => c.ownerId === user?.uid).length;
    const gifted = cheques.filter((c) => c.ownerId !== user?.uid && c.fromId === user?.uid).length;
    const passed = 0; // pass geçmişi ayrı tutulmadığı için bildirimlerden alalım
    return { won, gifted, friends: friends.length };
  }, [cheques, friends, user]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const handleLogout = () => {
    Alert.alert('Çıkış yap', 'Hesabından çıkış yapmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
    ]);
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
            <Text style={styles.statLabel}>Kazanılan</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.secondary }]}>
            <SkipForward size={18} color={COLORS.text} />
            <Text style={styles.statValue}>{stats.gifted}</Text>
            <Text style={styles.statLabel}>Hediye Edilen</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fff' }]}>
            <Users size={18} color={COLORS.text} />
            <Text style={styles.statValue}>{stats.friends}</Text>
            <Text style={styles.statLabel}>Arkadaş</Text>
          </View>
        </View>

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
              <View
                key={a.id}
                style={[styles.achievement, a.unlocked && styles.achievementUnlocked]}
              >
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

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <LogOut size={16} color={COLORS.danger} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        <Text style={styles.version}>ChequePass v1.0.0</Text>
      </ScrollView>

      <BottomSheet
        visible={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        title="Avatarını seç"
        maxHeight={420}
      >
        <Text style={styles.avatarSub}>Favori hayvanını seç.</Text>
        <View style={styles.avatarGrid}>
          {AVATAR_OPTIONS.map((key) => {
            const selected = (user.avatar || 'fox') === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.avatarOption, selected && styles.avatarOptionActive]}
                onPress={() => {
                  setAvatar(key);
                  setAvatarOpen(false);
                }}
                activeOpacity={0.85}
              >
                <AnimalAvatar type={key} size={64} />
              </TouchableOpacity>
            );
          })}
        </View>
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
  achievementUnlocked: {},
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
