// src/screens/MessagesScreen.js
//
// Mesajlar sekmesi: her arkadaş bir sohbet satırı.
// Son mesaj ve okundu bilgisi friendship dokümanından geldiği için burada
// arkadaş başına ayrı sorgu YOK.

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MessageCircle, Heart, UserPlus, Ban } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import AnimalAvatar from '../components/AnimalAvatar';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { formatRelative } from '../utils/helpers';

const MessagesScreen = () => {
  const { conversations, user } = useApp();
  const navigation = useNavigation();

  const renderItem = ({ item }) => {
    const lm = item.lastMessage;
    const mine = lm?.senderId === user?.uid;
    const preview = lm?.text
      ? `${mine ? 'Sen: ' : ''}${lm.text}`
      : 'Henüz mesaj yok — ilk mesajı sen yaz';

    return (
      <TouchableOpacity
        style={[styles.row, item.unread && styles.rowUnread]}
        onPress={() =>
          navigation.navigate('Chat', { friendId: item.id, username: item.username })
        }
        activeOpacity={0.85}
      >
        <AnimalAvatar type={item.avatar} size={48} />
        <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
          <View style={styles.topRow}>
            <View style={styles.nameWrap}>
              <Text style={[styles.name, item.unread && styles.nameUnread]} numberOfLines={1}>
                @{item.username}
              </Text>
              {item.relation === 'partner' && (
                <Heart size={11} color={COLORS.danger} fill={COLORS.danger} />
              )}
              {item.isBlocked && <Ban size={11} color={COLORS.textLight} />}
            </View>
            {!!lm?.createdAtMillis && (
              <Text style={styles.time}>{formatRelative(lm.createdAtMillis)}</Text>
            )}
          </View>
          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.preview,
                item.unread && styles.previewUnread,
                !lm?.text && styles.previewEmpty,
              ]}
              numberOfLines={1}
            >
              {preview}
            </Text>
            {item.unread && <View style={styles.dot} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader showFriendSwitcher={false} />

      <View style={styles.titleWrap}>
        <Text style={styles.pageTitle}>Mesajlar</Text>
        <Text style={styles.pageSub}>Arkadaşlarınla yazış, dürt</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <MessageCircle size={44} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Henüz sohbet yok</Text>
          <Text style={styles.emptySub}>
            Mesajlaşmak için önce bir arkadaş eklemen gerekiyor.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Friends')}
            activeOpacity={0.85}
          >
            <UserPlus size={15} color="#fff" />
            <Text style={styles.primaryBtnText}>Arkadaş Ekle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 12,
    ...SHADOW.soft,
  },
  rowUnread: {
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 },
  name: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text, flexShrink: 1 },
  nameUnread: { fontFamily: FONTS.bold },
  time: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textLight, flexShrink: 0 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  preview: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, flex: 1 },
  previewUnread: { color: COLORS.text, fontFamily: FONTS.medium },
  previewEmpty: { fontStyle: 'italic', color: COLORS.textLight },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.primaryDark,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: 80,
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
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.lg,
    maxWidth: 260,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.text,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
  },
  primaryBtnText: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#fff' },
});

export default MessagesScreen;
