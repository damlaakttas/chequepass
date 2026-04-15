import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore }  from '../../src/store/authStore';
import { useMatchStore } from '../../src/store/matchStore';
import {
  sendFriendRequest, watchIncomingRequests,
  acceptFriendRequest, rejectFriendRequest,
} from '../../src/services/matchService';
import { searchByUsername } from '../../src/services/userService';
import { FriendRequest, Match } from '../../src/types';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';
import { CpLogo } from '../../src/components/shared/CpLogo';

export default function FriendsScreen() {
  const { user }           = useAuthStore();
  const { matches }        = useMatchStore();
  const [tab,     setTab]  = useState<'requests' | 'friends'>('requests');
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = watchIncomingRequests(setRequests);
    return unsub;
  }, [user?.uid]);

  async function handleSearch() {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const found = await searchByUsername(search.trim());
      if (!found) { Alert.alert('Bulunamadı', `@${search.trim()} kullanıcısı bulunamadı.`); return; }
      if (found.uid === user?.uid) { Alert.alert('Hata', 'Kendin ile eşleşemezsin.'); return; }
      Alert.alert(
        'Arkadaşlık İsteği',
        `${found.displayName} (@${found.username}) kişisine istek gönderilsin mi?`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Gönder',
            onPress: async () => {
              await sendFriendRequest(found.uid, { displayName: found.displayName, username: found.username });
              Alert.alert('Gönderildi ✓', 'Arkadaşlık isteği gönderildi.');
              setSearch('');
            },
          },
        ],
      );
    } catch (e: any) {
      Alert.alert('Hata', e.message ?? 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  async function accept(req: FriendRequest) {
    await acceptFriendRequest(req.requestId, req.fromUserId, {
      fromUserName: req.fromUserName,
      fromUsername: req.fromUsername,
    });
    Alert.alert('Eşleşildi ✓', `${req.fromUserName} ile arkadaş oldunuz!`);
  }

  async function reject(req: FriendRequest) {
    await rejectFriendRequest(req.requestId);
  }

  function getPartnerName(m: Match) {
    const pid = m.participants.find((p) => p !== user?.uid);
    return pid ? m.participantNames[pid] ?? 'Partner' : 'Partner';
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

        {/* Kullanıcı adı ile arama */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Kullanıcı adı ile ara..."
            placeholderTextColor={Colors.textHint}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
            <Text style={styles.searchBtnText}>Ara</Text>
          </TouchableOpacity>
        </View>

        {/* Tab sırası: Bekleyen İstekler önce */}
        <View style={styles.tabBar}>
          {(['requests', 'friends'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'requests'
                  ? `Bekleyen İstekler${requests.length > 0 ? ` (${requests.length})` : ''}`
                  : 'Arkadaşlarım'
                }
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'requests' ? (
          <FlatList
            data={requests}
            keyExtractor={(r) => r.requestId}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.requestCard}>
                <View style={styles.requestAvatar}>
                  <Text style={styles.avatarText}>
                    {item.fromUserName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestName}>{item.fromUserName}</Text>
                  <Text style={styles.requestUsername}>@{item.fromUsername}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => accept(item)}>
                    <Text style={styles.acceptText}>Kabul</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => reject(item)}>
                    <Text style={styles.rejectText}>Reddet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>Bekleyen istek yok</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(m) => m.matchId}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.friendCard}>
                <View style={styles.friendAvatar}>
                  <Text style={styles.avatarText}>
                    {getPartnerName(item).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.friendName}>{getPartnerName(item)}</Text>
                  <Text style={styles.friendSince}>
                    {item.createdAt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' '}tarihinden arkadaşsınız
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>👋</Text>
                <Text style={styles.emptyTitle}>Henüz arkadaşın yok</Text>
                <Text style={styles.emptyHint}>Kullanıcı adı ile arkadaş ara!</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 8,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex:            1,
    height:          46,
    backgroundColor: Colors.surface,
    borderRadius:    Radius.md,
    paddingHorizontal: 14,
    fontFamily:      Typography.fontBody,
    fontSize:        14,
    color:           Colors.textPrimary,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  searchBtn: {
    height:          46,
    paddingHorizontal: 18,
    backgroundColor: Colors.brand,
    borderRadius:    Radius.md,
    alignItems:      'center',
    justifyContent:  'center',
  },
  searchBtnText: { fontFamily: Typography.fontBodySem, fontSize: 14, color: '#fff' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.lg,
    padding: 4,
    marginBottom: Spacing.md,
  },
  tabBtn: {
    flex: 1, height: 38, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  tabBtnActive:  { backgroundColor: Colors.yellow },
  tabText:       { fontFamily: Typography.fontBodyMed, fontSize: 12.5, color: Colors.textMuted },
  tabTextActive: { color: Colors.textPrimary },

  list: { paddingHorizontal: Spacing.lg, gap: 10, paddingBottom: 24 },

  requestCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    gap:             Spacing.sm,
    shadowColor:     '#fac5cd',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.12,
    shadowRadius:    10,
    elevation:       3,
  },
  requestAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.lavender,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:     { fontFamily: Typography.fontBodySem, fontSize: 18, color: Colors.brand },
  requestName:    { ...Typography.bodyMed },
  requestUsername:{ ...Typography.bodySm, color: Colors.textMuted },
  requestActions: { flexDirection: 'row', gap: 6 },
  acceptBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.teal, borderRadius: Radius.sm,
  },
  acceptText:  { fontFamily: Typography.fontBodySem, fontSize: 12, color: '#fff' },
  rejectBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.peach, borderRadius: Radius.sm,
  },
  rejectText:  { fontFamily: Typography.fontBodySem, fontSize: 12, color: Colors.brand },

  friendCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    gap:             Spacing.sm,
    shadowColor:     '#fac5cd',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.12,
    shadowRadius:    10,
    elevation:       3,
  },
  friendAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.teal,
    alignItems: 'center', justifyContent: 'center',
  },
  friendName:  { ...Typography.bodyMed },
  friendSince: { ...Typography.bodySm, color: Colors.textMuted, marginTop: 2 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon:  { fontSize: 40 },
  emptyTitle: { ...Typography.h3, color: Colors.textMuted },
  emptyHint:  { ...Typography.bodySm, color: Colors.textHint },
});
