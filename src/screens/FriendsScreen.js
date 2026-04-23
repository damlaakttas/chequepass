// src/screens/FriendsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Search, UserPlus, Heart, Users, Trash2, Check, X, Clock, Inbox } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import AnimalAvatar from '../components/AnimalAvatar';
import BottomSheet from '../components/BottomSheet';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { formatDate, formatRelative } from '../utils/helpers';
import { sendFriendRequest } from '../services/firebase-service';

const TABS = [
  { key: 'friends', label: 'Arkadaşlarım', Icon: Users },
  { key: 'requests', label: 'İstekler', Icon: Inbox },
];

const firestoreToMillis = (ts) => {
  if (!ts) return null;
  if (typeof ts === 'number') return ts;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  return null;
};

const FriendsScreen = () => {
  const {
    user,
    friends,
    friendRequests,
    removeFriend,
    activeFriendId,
    setActiveFriend,
    acceptFriendRequest,
    rejectFriendRequest,
  } = useApp();

  const route = useRoute();
  const [tab, setTab] = useState('friends');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newRelation, setNewRelation] = useState('friend');
  const [sending, setSending] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Bildirimler ekranından "İstekler" sekmesine yönlendirme desteği
  useEffect(() => {
    if (route.params?.initialTab === 'requests') {
      setTab('requests');
    }
  }, [route.params?.initialTab]);

  const filtered = friends.filter((f) =>
    f.username.toLowerCase().includes(query.toLowerCase())
  );

  const handleAdd = async () => {
    const u = newUsername.trim();
    if (!u) {
      Alert.alert('Hata', 'Kullanıcı adı gerekli');
      return;
    }
    if (!user) {
      Alert.alert('Hata', 'Oturum bulunamadı');
      return;
    }

    try {
      setSending(true);
      const result = await sendFriendRequest({
        sender: {
          uid: user.uid,
          username: user.username,
          avatar: user.avatar,
        },
        targetUsername: u,
        relation: newRelation,
      });
      setAddOpen(false);
      setNewUsername('');
      setNewRelation('friend');
      Alert.alert(
        'İstek gönderildi 🎉',
        `@${result.targetUsername} kullanıcısına arkadaşlık isteği gönderildi. Kabul ettiğinde arkadaş listende görünecek.`
      );
    } catch (e) {
      Alert.alert('Hata', e.message || 'İstek gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const handleRemove = (f) => {
    Alert.alert(
      `@${f.username} silinsin mi?`,
      'Bu kişiyle olan arkadaşlığın tamamen silinecek.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingId(f.id);
              await removeFriend(f.id);
            } catch (e) {
              Alert.alert('Hata', e.message);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleAccept = async (req) => {
    try {
      setProcessingId(req.id);
      await acceptFriendRequest(req.id);
    } catch (e) {
      Alert.alert('Hata', e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = (req) => {
    Alert.alert(
      `@${req.fromUsername} reddedilsin mi?`,
      'Bu isteği reddedersen tekrar gönderebilir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingId(req.id);
              await rejectFriendRequest(req.id);
            } catch (e) {
              Alert.alert('Hata', e.message);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const renderFriend = ({ item }) => {
    const active = item.id === activeFriendId;
    const processing = processingId === item.id;
    const sinceMillis = firestoreToMillis(item.since);
    return (
      <View style={[styles.row, active && styles.rowActive]}>
        <AnimalAvatar type={item.avatar} size={52} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.name}>@{item.username}</Text>
            {item.relation === 'partner' && (
              <Heart size={12} color={COLORS.danger} fill={COLORS.danger} />
            )}
          </View>
          <Text style={styles.meta}>
            {item.relation === 'partner' ? 'Sevgili' : 'Arkadaş'}
            {sinceMillis && ` · ${formatDate(sinceMillis)}`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.iconBtn, active && styles.iconBtnActive]}
            onPress={() => setActiveFriend(item.id)}
            disabled={processing}
          >
            {active ? (
              <Check size={16} color={COLORS.text} />
            ) : (
              <Text style={styles.selectText}>Seç</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtnDanger}
            onPress={() => handleRemove(item)}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <Trash2 size={15} color={COLORS.danger} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRequest = ({ item }) => {
    const processing = processingId === item.id;
    const createdMillis = firestoreToMillis(item.createdAt);
    return (
      <View style={styles.row}>
        <AnimalAvatar type={item.fromAvatar} size={52} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.name}>@{item.fromUsername}</Text>
            {item.relation === 'partner' && (
              <Heart size={12} color={COLORS.danger} fill={COLORS.danger} />
            )}
          </View>
          <Text style={styles.meta}>
            {item.relation === 'partner' ? 'Sevgili olarak' : 'Arkadaş olarak'} eklemek istiyor
            {createdMillis && ` · ${formatRelative(createdMillis)}`}
          </Text>
        </View>
        {processing ? (
          <ActivityIndicator size="small" color={COLORS.text} />
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => handleAccept(item)}
            >
              <Check size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtnDanger}
              onPress={() => handleReject(item)}
            >
              <X size={16} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        showFriendSwitcher={false}
        rightAction={
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
            <UserPlus size={16} color="#fff" />
            <Text style={styles.addBtnText}>Ekle</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.titleWrap}>
        <Text style={styles.pageTitle}>Arkadaşlar</Text>
        <Text style={styles.pageSub}>
          {friends.length} eşleşme
          {friendRequests.length > 0 && ` · ${friendRequests.length} bekleyen istek`}
        </Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const { Icon } = t;
          const badge = t.key === 'requests' ? friendRequests.length : 0;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.85}
            >
              <Icon size={16} color={active ? COLORS.text : COLORS.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              {badge > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'friends' && (
        <>
          <View style={styles.searchWrap}>
            <Search size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Kullanıcı adı ara..."
              placeholderTextColor={COLORS.textLight}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
          </View>

          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Users size={44} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>
                {friends.length === 0 ? 'Henüz arkadaş yok' : 'Sonuç bulunamadı'}
              </Text>
              <Text style={styles.emptySub}>
                {friends.length === 0
                  ? 'Yeni arkadaş ekleyerek çek göndermeye başla.'
                  : 'Farklı bir kullanıcı adı dene.'}
              </Text>
              {friends.length === 0 && (
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: SPACING.lg }]}
                  onPress={() => setAddOpen(true)}
                >
                  <Text style={styles.primaryBtnText}>İlk arkadaşını ekle</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 120 }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              showsVerticalScrollIndicator={false}
              renderItem={renderFriend}
            />
          )}
        </>
      )}

      {tab === 'requests' && (
        <>
          {friendRequests.length === 0 ? (
            <View style={styles.empty}>
              <Clock size={44} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>Bekleyen istek yok</Text>
              <Text style={styles.emptySub}>
                Sana gelen arkadaşlık istekleri burada görünür.
              </Text>
            </View>
          ) : (
            <FlatList
              data={friendRequests}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 120 }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              showsVerticalScrollIndicator={false}
              renderItem={renderRequest}
            />
          )}
        </>
      )}

      <BottomSheet
        visible={addOpen}
        onClose={() => {
          if (!sending) {
            setAddOpen(false);
            setNewUsername('');
          }
        }}
        title="Yeni arkadaş ekle"
        maxHeight={460}
      >
        <Text style={styles.sheetSub}>
          Arkadaşının ChequePass kullanıcı adını girerek eşleş. İstek kabul edilince arkadaş listende görünür.
        </Text>

        <View style={styles.inputBox}>
          <Text style={styles.at}>@</Text>
          <TextInput
            style={styles.input}
            placeholder="kullaniciadi"
            placeholderTextColor={COLORS.textLight}
            value={newUsername}
            onChangeText={setNewUsername}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!sending}
          />
        </View>

        <Text style={[styles.sheetSub, { marginTop: SPACING.md }]}>İlişki türü</Text>
        <View style={styles.relationRow}>
          {[
            { key: 'partner', label: 'Sevgili', Icon: Heart },
            { key: 'friend', label: 'Arkadaş', Icon: Users },
          ].map(({ key, label, Icon }) => {
            const active = newRelation === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.relationPill, active && styles.relationPillActive]}
                onPress={() => !sending && setNewRelation(key)}
                disabled={sending}
              >
                <Icon size={15} color={active ? COLORS.text : COLORS.textMuted} />
                <Text style={[styles.relationText, active && styles.relationTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: SPACING.lg }, sending && { opacity: 0.6 }]}
          onPress={handleAdd}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>İstek Gönder</Text>
          )}
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  titleWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  pageTitle: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.text, letterSpacing: -0.5 },
  pageSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
  },
  addBtnText: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#fff' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    padding: 4,
    marginBottom: SPACING.md,
    ...SHADOW.soft,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.text, fontFamily: FONTS.semiBold },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: '#fff',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOW.soft,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.md,
    ...SHADOW.soft,
  },
  rowActive: {
    borderWidth: 2,
    borderColor: COLORS.primaryDark,
  },
  name: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },
  meta: { fontFamily: FONTS.regular, fontSize: 11.5, color: COLORS.textMuted, marginTop: 2 },
  iconBtn: {
    minWidth: 46,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  iconBtnActive: {
    backgroundColor: COLORS.primary,
  },
  iconBtnDanger: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectText: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.text },
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
    marginTop: SPACING.md,
  },
  emptySub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: COLORS.text,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
  },
  primaryBtnText: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#fff' },
  sheetSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginBottom: 8, lineHeight: 19 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 50,
    gap: 4,
  },
  at: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.textMuted },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
  },
  relationRow: { flexDirection: 'row', gap: 10 },
  relationPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  relationPillActive: {
    backgroundColor: COLORS.primary + '40',
    borderColor: COLORS.primaryDark,
  },
  relationText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textMuted },
  relationTextActive: { color: COLORS.text, fontFamily: FONTS.semiBold },
});

export default FriendsScreen;