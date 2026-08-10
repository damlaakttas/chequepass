// src/screens/NotificationsScreen.js
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  Bell,
  Gift,
  CheckCircle2,
  UserPlus,
  Sparkles,
  CheckCheck,
  Vibrate,
  ChevronLeft,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { formatRelative } from '../utils/helpers';

const ICON_MAP = {
  gift_received: { Icon: Gift, bg: COLORS.primary },
  cheque_used_by_friend: { Icon: CheckCircle2, bg: COLORS.secondary },
  friend_request: { Icon: UserPlus, bg: COLORS.secondary },
  nudge_received: { Icon: Vibrate, bg: '#fde68a' },
  system: { Icon: Sparkles, bg: COLORS.secondary },
};

const NotificationsScreen = () => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    unreadCount,
  } = useApp();
  const navigation = useNavigation();

  // Ekrana odaklanılınca 1.5 sn sonra topluca okundu işaretle
  useFocusEffect(
    useCallback(() => {
      if (unreadCount === 0) return undefined;
      const timer = setTimeout(() => {
        markAllNotificationsRead();
      }, 1500);
      return () => clearTimeout(timer);
    }, [unreadCount, markAllNotificationsRead])
  );

  const handleNotifPress = (item) => {
    markNotificationRead(item.id);
    // Bildirimler artık sekme değil, Profil'den açılan bir ekran.
    // Sekmelere giderken önce Main'e dönüyoruz.
    if (item.type === 'friend_request') {
      navigation.navigate('Main', {
        screen: 'Friends',
        params: { initialTab: 'requests' },
      });
      return;
    }
    if (item.type === 'gift_received' || item.type === 'cheque_used_by_friend') {
      navigation.navigate('Main', { screen: 'Cheques' });
      return;
    }
    if (item.type === 'nudge_received') {
      navigation.navigate('Main', { screen: 'Messages' });
      return;
    }
  };

  const renderItem = ({ item }) => {
    const { Icon, bg } = ICON_MAP[item.type] || ICON_MAP.system;
    const clickable =
      item.type === 'friend_request' ||
      item.type === 'gift_received' ||
      item.type === 'cheque_used_by_friend' ||
      item.type === 'nudge_received';

    const inner = (
      <>
        <View style={[styles.iconCircle, { backgroundColor: bg }]}>
          <Icon size={18} color={COLORS.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.itemTime}>{formatRelative(item.createdAtMillis)}</Text>
        </View>
        {!item.read && <View style={styles.dot} />}
      </>
    );

    if (clickable) {
      return (
        <TouchableOpacity
          style={[styles.item, !item.read && styles.itemUnread]}
          onPress={() => handleNotifPress(item)}
          activeOpacity={0.85}
        >
          {inner}
        </TouchableOpacity>
      );
    }
    return <View style={[styles.item, !item.read && styles.itemUnread]}>{inner}</View>;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        rightAction={
          unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markBtn}
              onPress={markAllNotificationsRead}
              hitSlop={6}
            >
              <CheckCheck size={16} color={COLORS.text} />
            </TouchableOpacity>
          ) : null
        }
      />

      <View style={styles.titleWrap}>
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <ChevronLeft size={18} color={COLORS.textMuted} />
          <Text style={styles.backText}>Profilim</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Bildirimler</Text>
        <Text style={styles.pageSub}>
          {notifications.length} bildirim
          {unreadCount > 0 ? ` · ${unreadCount} okunmamış` : ''}
        </Text>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Bell size={44} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
          <Text style={styles.emptySub}>Yeni etkileşimler burada görünecek.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  titleWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4, alignSelf: 'flex-start' },
  backText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  pageTitle: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.text, letterSpacing: -0.5 },
  pageSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  markBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.md,
    gap: 12,
    ...SHADOW.soft,
  },
  itemUnread: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryDark,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { fontFamily: FONTS.semiBold, fontSize: 14, color: COLORS.text },
  itemBody: { fontFamily: FONTS.regular, fontSize: 12.5, color: COLORS.textMuted, marginTop: 2 },
  itemTime: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textLight, marginTop: 4 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryDark,
    marginTop: 6,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});

export default NotificationsScreen;
