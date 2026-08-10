// src/screens/ChatScreen.js
//
// Birebir sohbet. Üst barda dürtme, şikayet ve engelleme var.
//
// MODERASYON (App Store Guideline 1.2):
//  - Mesaj gönderilmeden önce içerik filtresinden geçer (utils/moderation).
//  - Herhangi bir mesaja uzun basınca "Şikayet et" çıkar.
//  - Üst bardaki menüden kullanıcı engellenebilir; engellenen kişi Firestore
//    kuralı seviyesinde mesaj gönderemez.

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ChevronLeft,
  Send,
  Vibrate,
  MoreVertical,
  Ban,
  Flag,
  MessageCircle,
} from 'lucide-react-native';
import AnimalAvatar from '../components/AnimalAvatar';
import BottomSheet from '../components/BottomSheet';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { subscribeToMessages } from '../services/firebase-service';
import { MAX_MESSAGE_LENGTH, REPORT_REASONS } from '../utils/moderation';
import { formatRelative } from '../utils/helpers';

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { friendId } = route.params || {};

  const {
    user,
    friends,
    sendChatMessage,
    markChatRead,
    nudgeFriend,
    blockFriend,
    unblockFriend,
    reportMessage,
  } = useApp();

  const friend = friends.find((f) => f.id === friendId) || null;
  const blockedUids = user?.blocked || [];
  const isBlocked = friend ? blockedUids.includes(friend.otherUid) : false;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const listRef = useRef(null);

  // Mesajları dinle
  useEffect(() => {
    if (!friendId) return undefined;
    setLoading(true);
    const unsub = subscribeToMessages(
      friendId,
      (list) => {
        setMessages(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub && unsub();
  }, [friendId]);

  // Sohbet açıkken gelen her yeni mesajda okundu işaretle
  useEffect(() => {
    if (!friendId) return;
    markChatRead(friendId);
  }, [friendId, messages.length, markChatRead]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendChatMessage(friendId, text);
      setDraft('');
    } catch (e) {
      Alert.alert('Gönderilemedi', e.message || 'Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  }, [draft, sending, friendId, sendChatMessage]);

  const handleNudge = async () => {
    if (nudging) return;
    setNudging(true);
    try {
      await nudgeFriend(friendId);
      Alert.alert('Dürttün 👋', `@${friend?.username} bildirim aldı.`);
    } catch (e) {
      Alert.alert('Olmadı', e.message || 'Dürtme gönderilemedi');
    } finally {
      setNudging(false);
    }
  };

  const handleBlockToggle = () => {
    setMenuOpen(false);
    if (!friend) return;
    if (isBlocked) {
      Alert.alert('Engeli kaldır', `@${friend.username} tekrar mesaj gönderebilecek.`, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Engeli kaldır',
          onPress: async () => {
            try {
              await unblockFriend(friend.otherUid);
            } catch (e) {
              Alert.alert('Hata', e.message || 'İşlem başarısız');
            }
          },
        },
      ]);
      return;
    }
    Alert.alert(
      `@${friend.username} engellensin mi?`,
      'Engellediğin kişi sana mesaj gönderemez ve seni dürtemez. Bu işlemi istediğin zaman geri alabilirsin.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Engelle',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockFriend(friend.otherUid);
            } catch (e) {
              Alert.alert('Hata', e.message || 'İşlem başarısız');
            }
          },
        },
      ]
    );
  };

  const submitReport = async (reasonKey) => {
    const target = reportTarget;
    setReportTarget(null);
    if (!target || !friend) return;
    try {
      await reportMessage({
        reportedId: friend.otherUid,
        friendshipId: friendId,
        messageId: target.id || null,
        messageText: target.text || '',
        reason: reasonKey,
      });
      Alert.alert(
        'Şikayetin alındı',
        'İnceleyeceğiz. Rahatsız olduğun kişiyi ayrıca engelleyebilirsin.'
      );
    } catch (e) {
      Alert.alert('Hata', e.message || 'Şikayet gönderilemedi');
    }
  };

  const renderMessage = ({ item }) => {
    const mine = item.senderId === user?.uid;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => {
          if (mine) return; // kendi mesajını şikayet etmek anlamsız
          setReportTarget(item);
        }}
        delayLongPress={350}
        style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}
      >
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
          <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
            {formatRelative(item.createdAtMillis)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!friend) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
            <ChevronLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Sohbet bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Üst bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <AnimalAvatar type={friend.avatar} size={34} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerName} numberOfLines={1}>
            @{friend.username}
          </Text>
          <Text style={styles.headerMeta}>
            {isBlocked ? 'Engellendi' : friend.relation === 'partner' ? 'Sevgili' : 'Arkadaş'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.nudgeBtn}
          onPress={handleNudge}
          disabled={nudging || isBlocked}
          activeOpacity={0.85}
        >
          {nudging ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Vibrate size={17} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen(true)} hitSlop={8}>
          <MoreVertical size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={COLORS.text} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.empty}>
            <MessageCircle size={40} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Sohbet boş</Text>
            <Text style={styles.emptySub}>İlk mesajı sen yaz ya da bir dürtme gönder.</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
          />
        )}

        {isBlocked ? (
          <View style={styles.blockedBar}>
            <Ban size={15} color={COLORS.textMuted} />
            <Text style={styles.blockedText}>
              Bu kişiyi engelledin. Mesajlaşmak için engeli kaldır.
            </Text>
          </View>
        ) : (
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Mesaj yaz..."
              placeholderTextColor={COLORS.textLight}
              multiline
              maxLength={MAX_MESSAGE_LENGTH}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!draft.trim() || sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={17} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Üst bar menüsü */}
      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="Sohbet" maxHeight={320}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => {
            setMenuOpen(false);
            setReportTarget({ id: null, text: '' });
          }}
        >
          <Flag size={17} color={COLORS.text} />
          <Text style={styles.menuLabel}>Kullanıcıyı şikayet et</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuRow} onPress={handleBlockToggle}>
          <Ban size={17} color={isBlocked ? COLORS.text : COLORS.danger} />
          <Text style={[styles.menuLabel, !isBlocked && { color: COLORS.danger }]}>
            {isBlocked ? 'Engeli kaldır' : 'Kullanıcıyı engelle'}
          </Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* Şikayet nedeni */}
      <BottomSheet
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        title="Şikayet nedeni"
        maxHeight={440}
      >
        {!!reportTarget?.text && (
          <View style={styles.reportPreview}>
            <Text style={styles.reportPreviewText} numberOfLines={3}>
              "{reportTarget.text}"
            </Text>
          </View>
        )}
        {REPORT_REASONS.map((r) => (
          <TouchableOpacity key={r.key} style={styles.menuRow} onPress={() => submitReport(r.key)}>
            <Text style={styles.menuLabel}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerName: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },
  headerMeta: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  nudgeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtn: { padding: 2 },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: 8,
  },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    ...SHADOW.soft,
  },
  bubbleMine: { backgroundColor: COLORS.text, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontFamily: FONTS.regular, fontSize: 14.5, color: COLORS.text, lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  bubbleTime: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.6)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontFamily: FONTS.regular,
    fontSize: 14.5,
    color: COLORS.text,
    maxHeight: 110,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  blockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  blockedText: { fontFamily: FONTS.medium, fontSize: 12.5, color: COLORS.textMuted },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  emptySub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuLabel: { fontFamily: FONTS.medium, fontSize: 14.5, color: COLORS.text },
  reportPreview: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: SPACING.sm,
  },
  reportPreviewText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
});

export default ChatScreen;
