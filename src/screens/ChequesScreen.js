// src/screens/ChequesScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Inbox, Gift, CheckCircle2, FileText, X, Edit3 } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import BottomSheet from '../components/BottomSheet';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { formatDate, formatRelative } from '../utils/helpers';

const TABS = [
  { key: 'mine', label: 'Benim Çeklerim', icon: Inbox },
  { key: 'theirs', label: 'Karşı Tarafın', icon: Gift },
];

const ChequesScreen = () => {
  const { chequesForActiveFriend, activeFriend, updateChequeNote, useChequeCard, user } = useApp();
  const [tab, setTab] = useState('mine');
  const [selected, setSelected] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [editing, setEditing] = useState(false);

  const list = tab === 'mine' ? chequesForActiveFriend.mine : chequesForActiveFriend.theirs;

  const openDetail = (c) => {
    setSelected(c);
    setNoteDraft(c.reason || '');
    setEditing(false);
  };

  const [saving, setSaving] = useState(false);

  const saveNote = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await updateChequeNote(selected.id, noteDraft);
      setSelected({ ...selected, reason: noteDraft });
      setEditing(false);
    } catch (e) {
      Alert.alert('Hata', e.message || 'Not kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const markUsed = () => {
    if (!selected) return;
    Alert.alert('Çeki kullandın mı?', 'Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, kullandım',
        onPress: async () => {
          try {
            await useChequeCard(selected.id);
            setSelected(null);
          } catch (e) {
            Alert.alert('Hata', e.message || 'Çek kullanılamadı');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const ownerLabel =
      item.ownerId === user?.uid
        ? tab === 'mine'
          ? `@${activeFriend?.username}'den geldi`
          : ''
        : `@${activeFriend?.username}'e gönderildi`;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openDetail(item)}
        activeOpacity={0.85}
      >
        <View style={[styles.colorStrip, { backgroundColor: item.color }]} />
        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            {item.status === 'used' && (
              <View style={styles.usedBadge}>
                <CheckCircle2 size={12} color={COLORS.textMuted} />
                <Text style={styles.usedText}>Kullanıldı</Text>
              </View>
            )}
          </View>
          <Text style={styles.rowSub} numberOfLines={1}>
            {item.reason ? `"${item.reason}"` : item.subtitle}
          </Text>
          <View style={styles.rowMeta}>
            <Text style={styles.metaText}>{formatRelative(item.createdAtMillis)}</Text>
            {ownerLabel ? <Text style={styles.metaDot}>•</Text> : null}
            {ownerLabel ? <Text style={styles.metaText}>{ownerLabel}</Text> : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader />

      <View style={styles.titleWrap}>
        <Text style={styles.pageTitle}>Çeklerim</Text>
        <Text style={styles.pageSub}>
          {activeFriend ? `@${activeFriend.username} ile olan tüm çekler` : 'Arkadaş seçilmedi'}
        </Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.85}
            >
              <Icon size={16} color={active ? COLORS.text : COLORS.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {list.length === 0 ? (
        <View style={styles.empty}>
          <FileText size={44} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Henüz çek yok</Text>
          <Text style={styles.emptySub}>
            {tab === 'mine'
              ? 'Kazandığın çekler burada görünecek.'
              : 'Gönderdiğin çekler burada görünecek.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail */}
      <BottomSheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        title="Çek Detayı"
        maxHeight={560}
      >
        {selected && (
          <View>
            <View style={styles.detailHeader}>
              <View style={[styles.detailStripe, { backgroundColor: selected.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{selected.title}</Text>
                <Text style={styles.detailSub}>{selected.subtitle}</Text>
              </View>
              <View style={styles.dateBox}>
                <Text style={styles.dateLabel}>TARİH</Text>
                <Text style={styles.dateValue}>{formatDate(selected.createdAtMillis)}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Not</Text>
            {editing ? (
              <TextInput
                style={styles.noteInput}
                value={noteDraft}
                onChangeText={setNoteDraft}
                multiline
                maxLength={160}
                placeholder="Kazanılma sebebini yaz..."
                placeholderTextColor={COLORS.textLight}
              />
            ) : (
              <View style={styles.noteBox}>
                <Text style={styles.noteText}>
                  {selected.reason
                    ? selected.reason
                    : 'Henüz bir not eklenmedi. Düzenlemek için dokun.'}
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: SPACING.md }}>
              {editing ? (
                <>
                  <TouchableOpacity
                    style={styles.ghostBtn}
                    onPress={() => {
                      setEditing(false);
                      setNoteDraft(selected.reason || '');
                    }}
                  >
                    <X size={16} color={COLORS.text} />
                    <Text style={styles.ghostBtnText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={saveNote}>
                    <Text style={styles.primaryBtnText}>Kaydet</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.ghostBtn} onPress={() => setEditing(true)}>
                    <Edit3 size={16} color={COLORS.text} />
                    <Text style={styles.ghostBtnText}>
                      {selected.reason ? 'Düzenle' : 'Not ekle'}
                    </Text>
                  </TouchableOpacity>
                  {tab === 'mine' && selected.status !== 'used' && (
                    <TouchableOpacity
                      style={[styles.primaryBtn, { flex: 1 }]}
                      onPress={markUsed}
                    >
                      <CheckCircle2 size={16} color="#fff" />
                      <Text style={styles.primaryBtnText}>Çeki Kullandım</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  titleWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  pageTitle: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.text, letterSpacing: -0.5 },
  pageSub: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
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
  row: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  colorStrip: { width: 5 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  rowTitle: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text },
  usedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  usedText: { fontFamily: FONTS.medium, fontSize: 10, color: COLORS.textMuted },
  rowSub: {
    fontFamily: FONTS.regular,
    fontSize: 12.5,
    color: COLORS.textMuted,
    paddingHorizontal: 14,
    marginTop: 2,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  metaText: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textLight },
  metaDot: { fontSize: 11, color: COLORS.textLight },
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
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.lg,
  },
  detailStripe: { width: 6, height: 48, borderRadius: 3 },
  detailTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  detailSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  dateBox: { alignItems: 'flex-end' },
  dateLabel: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 1,
    color: COLORS.textLight,
  },
  dateValue: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.text, marginTop: 2 },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  noteBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 14,
    minHeight: 80,
  },
  noteText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  noteInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 14,
    minHeight: 90,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
    textAlignVertical: 'top',
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 13,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.background,
  },
  ghostBtnText: { fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.text },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.text,
    paddingVertical: 13,
    borderRadius: RADIUS.pill,
  },
  primaryBtnText: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#fff' },
});

export default ChequesScreen;
