// src/screens/FriendsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search, UserPlus, Heart, Users, Trash2, Check, X, Clock, Inbox, Edit3 } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import AnimalAvatar from '../components/AnimalAvatar';
import BottomSheet from '../components/BottomSheet';
import PaywallSheet from '../components/PaywallSheet';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { usePremium } from '../context/PremiumContext';
import { formatDate, formatRelative } from '../utils/helpers';
import { sendFriendRequest } from '../services/firebase-service';

const PAYWALL_TEASED_KEY = '@chequepass_paywall_teased_v1';

const TABS = [
  { key: 'friends', label: 'Arkadaşlarım', Icon: Users },
  { key: 'requests', label: 'İstekler', Icon: Inbox },
];

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
    updateFriendRelation,
  } = useApp();

  const route = useRoute();
  const [tab, setTab] = useState('friends');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newRelation, setNewRelation] = useState('friend');
  const [sending, setSending] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  // İlişki türü değiştirme modal'ı
  const [relationEditFriend, setRelationEditFriend] = useState(null);

  useEffect(() => {
    if (route.params?.initialTab === 'requests') {
      setTab('requests');
    }
  }, [route.params?.initialTab]);

  /**
   * "Sevgili" seçildiğinde, kullanıcı henüz premium yoksa
   * VE bu paywall daha önce gösterilmediyse → tek kerelik tease göster.
   */
  const triggerPartnerPaywall = async () => {
    // Romantik paket artık ilişkiye özel; burada sadece tek seferlik tanıtım göster.
    try {
      const teased = await AsyncStorage.getItem(PAYWALL_TEASED_KEY);
      if (teased === 'true') return; // bir kere gösterildi
      await AsyncStorage.setItem(PAYWALL_TEASED_KEY, 'true');
      setPaywallOpen(true);
    } catch (e) {
      console.warn('Paywall tease check failed', e);
    }
  };

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
      'Bu kişiyle olan tüm çekleriniz, notlar ve geçmiş kalır ama ilişki silinir.',
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
      'Bu isteği reddedersen kullanıcı tekrar gönderebilir.',
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
            {item.acceptedAtMillis && ` · ${formatDate(item.acceptedAtMillis)}`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
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
            style={styles.iconBtnLight}
            onPress={() => setRelationEditFriend(item)}
            disabled={processing}
          >
            <Edit3 size={14} color={COLORS.textMuted} />
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
            {item.createdAtMillis && ` · ${formatRelative(item.createdAtMillis)}`}
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
          const Icon = t.Icon;
          const showBadge = t.key === 'requests' && friendRequests.length > 0;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.85}
            >
              <Icon size={16} color={active ? COLORS.text : COLORS.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              {showBadge && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{friendRequests.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'friends' && (
        <>
          {friends.length > 0 && (
            <View style={styles.searchWrap}>
              <Search size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Arkadaş ara..."
                placeholderTextColor={COLORS.textLight}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Users size={44} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>
                {friends.length === 0 ? 'Henüz arkadaşın yok' : 'Sonuç bulunamadı'}
              </Text>
              <Text style={styles.emptySub}>
                {friends.length === 0
                  ? '"Ekle" butonuna basıp ilk arkadaşını davet et.'
                  : 'Farklı bir arama dene.'}
              </Text>
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
                onPress={() => {
                  if (sending) return;
                  setNewRelation(key);
                  if (key === 'partner') {
                    // Sevgili seçildi → paywall tease (tek seferlik)
                    triggerPartnerPaywall();
                  }
                }}
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

      {/* İlişki türünü düzenle modal'ı (çift taraflı) */}
      <BottomSheet
        visible={!!relationEditFriend}
        onClose={() => setRelationEditFriend(null)}
        title="İlişki türünü değiştir"
        maxHeight={420}
      >
        {relationEditFriend && (
          <>
            <Text style={styles.sheetSub}>
              @{relationEditFriend.username} ile ilişki türünü değiştir. Bu değişiklik iki taraf için de geçerli olur.
            </Text>
            <View style={styles.relationRow}>
              {[
                { key: 'partner', label: 'Sevgili', Icon: Heart },
                { key: 'friend', label: 'Arkadaş', Icon: Users },
              ].map(({ key, label, Icon }) => {
                const active = relationEditFriend.relation === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.relationPill, active && styles.relationPillActive]}
                    onPress={async () => {
                      if (relationEditFriend.relation === key) {
                        setRelationEditFriend(null);
                        return;
                      }
                      try {
                        await updateFriendRelation(relationEditFriend.id, key);
                        setRelationEditFriend(null);
                        if (key === 'partner') triggerPartnerPaywall();
                      } catch (e) {
                        Alert.alert('Hata', e.message);
                      }
                    }}
                  >
                    <Icon size={15} color={active ? COLORS.text : COLORS.textMuted} />
                    <Text style={[styles.relationText, active && styles.relationTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </BottomSheet>

      <PaywallSheet
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onSuccess={() => {}}
      />
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
  iconBtnLight: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
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
