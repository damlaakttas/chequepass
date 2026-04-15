import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection, query, where, orderBy, onSnapshot, updateDoc, doc, Timestamp,
} from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useAuthStore } from '../../src/store/authStore';
import { AppNotification } from '../../src/types';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';
import { CpLogo } from '../../src/components/shared/CpLogo';

function toNotif(id: string, d: any): AppNotification {
  return {
    notifId:      id,
    toUserId:     d.toUserId,
    fromUserId:   d.fromUserId,
    fromUserName: d.fromUserName ?? '',
    type:         d.type,
    payload:      d.payload ?? {},
    isRead:       d.isRead,
    createdAt:    (d.createdAt as Timestamp).toDate(),
  };
}

function notifMessage(n: AppNotification) {
  switch (n.type) {
    case 'coupon_received':
      return `${n.fromUserName} sana bir çek pasladı! 🎫`;
    case 'friend_request':
      return `${n.fromUserName} sana arkadaşlık isteği gönderdi.`;
    case 'reminder':
      return `Hatırlatma: Aktif çekin süresi doluyor!`;
    default:
      return 'Yeni bildirim';
  }
}

function notifIcon(type: string) {
  if (type === 'coupon_received') return '🎁';
  if (type === 'friend_request')  return '👋';
  return '🔔';
}

export default function NotificationsScreen() {
  const { user }     = useAuthStore();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifs(snap.docs.map((d) => toNotif(d.id, d.data())));
    });
    return unsub;
  }, [user?.uid]);

  async function markRead(id: string) {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  }

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <CpLogo size="sm" />
        </View>

        <FlatList
          data={notifs}
          keyExtractor={(n) => n.notifId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.isRead && styles.cardUnread]}
              onPress={() => markRead(item.notifId)}
              activeOpacity={0.8}
            >
              <Text style={styles.icon}>{notifIcon(item.type)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.message}>{notifMessage(item)}</Text>
                <Text style={styles.time}>
                  {item.createdAt.toLocaleDateString('tr-TR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
              {!item.isRead && <View style={styles.dot} />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔕</Text>
              <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
            </View>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  list:   { paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: 24 },
  card: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    gap:             Spacing.sm,
    shadowColor:     '#fac5cd',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.10,
    shadowRadius:    8,
    elevation:       2,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: Colors.brand },
  icon:       { fontSize: 28 },
  message:    { ...Typography.bodyMed, flex: 1, lineHeight: 20 },
  time:       { ...Typography.caption, marginTop: 3 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.brand,
  },
  empty:      { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon:  { fontSize: 44 },
  emptyTitle: { ...Typography.h3, color: Colors.textMuted },
});
