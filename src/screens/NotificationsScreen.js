// src/screens/NotificationsScreen.js
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  Bell,
  Gift,
  Send,
  Download,
  SkipForward,
  UserPlus,
  Sparkles,
  CheckCheck,
  Inbox,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { formatRelative } from '../utils/helpers';

// Bildirim tipi → ikon ve renk
const ICON_MAP = {
  gift_received: { Icon: Gift, bg: COLORS.primary },
  gift_sent: { Icon: Send, bg: COLORS.primary + '80' },
  kept: { Icon: Download, bg: COLORS.secondary },
  partner_kept: { Icon: Inbox, bg: COLORS.border },
  pass: { Icon: SkipForward, bg: COLORS.border },
  friend_request: { Icon: UserPlus, bg: COLORS.secondary },
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

  // Ekrana her odaklanışta, okunmamışları kısa bir süre sonra topluca okundu işaretle
  // (kullanıcının görmesine fırsat tanımak için 1.5 sn beklenir).
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
    // Yönlendirmeden önce bu bildirim okundu sayılır
    markNotificationRead(item.id);
    if (item.type === 'friend_request') {
      navigation.navigate('Friends', { initialTab: 'requests' });
      return;
    }
    if (
      item.type === 'gift_received' ||
      item.type === 'gift_sent' ||
      item.type === 'kept' ||
      item.type === 'partner_kept'
    ) {
      navigation.navigate('Cheques');
      return;
    }
  };

  const renderItem = ({ item }) => {
    const { Icon, bg } = ICON_MAP[item.type] || ICON_MAP.system;
    const clickable = [
      'friend_request',
      'gift_received',
      'gift_sent',
      'kept',
      'partner_kept',
    ].includes(item.type);

    const inner = (
      <>
        <View style={[styles.iconCircle, { backgroundColor: bg }]}>
          <Icon size={18} color={COLORS.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemBody} numberOfLines={2}>
            {item.body}
          </Text>
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
            <TouchableOpacity style={styles.markBtn} onPress={markAllNotificationsRead}>
              <CheckCheck size={14} color={COLORS.text} />
              <Text style={styles.markText}>Tümünü oku</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <View style={styles.titleWrap}>
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
  pageTitle: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.text, letterSpacing: -0.5 },
  pageSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  markBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    ...SHADOW.soft,
  },
  markText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.text },
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
