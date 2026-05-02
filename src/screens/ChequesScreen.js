// src/screens/ChequesScreen.js
//
// Değişiklikler:
// - Sekmeler: "Benim" / "Onun"
// - Sekme altında filtre chip'leri: Kullanılabilir / Kullanılmış / Tümü
// - Kullanılmış kartlar opacity 0.55
// - Sola swipe → "Sil" butonu çıkar; tıklayınca onay diyaloğu sonra siler
// - Detayda not ve "Çeki Kullandım" sadece kullanılmamış kart için

import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Inbox, Gift, CheckCircle2, FileText, X, Edit3, Trash2 } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import ScreenHeader from '../components/ScreenHeader';
import BottomSheet from '../components/BottomSheet';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { formatDate, formatRelative } from '../utils/helpers';

// Üst sekmeler:
// mine    = sahibi benim olan çekler
// theirs  = sahibi karşı taraf olan çekler
const TABS = [
  { key: 'mine', label: 'Benim', icon: Inbox },
  { key: 'theirs', label: 'Onun', icon: Gift },
];

// Alt filtre chip'leri:
// active = kullanılabilir (status !== 'used')
// used   = kullanılmış (status === 'used')
// all    = tümü
const FILTERS = [
  { key: 'active', label: 'Kullanılabilir' },
  { key: 'used', label: 'Kullanılmış' },
  { key: 'all', label: 'Tümü' },
];

const ChequesScreen = () => {
  const {
    chequesForActiveFriend,
    activeFriend,
    updateChequeNote,
    useChequeCard,
    deleteChequeCard,
    user,
  } = useApp();

  const [tab, setTab] = useState('mine');
  const [filter, setFilter] = useState('active');
  const [selected, setSelected] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Aktif Swipeable referansı (aynı anda birden fazla açılmasın)
  const openRowRef = useRef(null);

  const baseList = tab === 'mine' ? chequesForActiveFriend.mine : chequesForActiveFriend.theirs;

  const list = useMemo(() => {
    if (filter === 'active') return baseList.filter((c) => c.status !== 'used');
    if (filter === 'used') return baseList.filter((c) => c.status === 'used');
    return baseList;
  }, [baseList, filter]);

  // Üst sekmenin badge sayıları (kullanılmamışlar)
  const myActive = chequesForActiveFriend.mine.filter((c) => c.status !== 'used').length;
  const theirActive = chequesForActiveFriend.theirs.filter((c) => c.status !== 'used').length;

  const openDetail = (c) => {
    setSelected(c);
    setNoteDraft(c.reason || '');
    setEditing(false);
  };

  const closeDetail = () => {
    Keyboard.dismiss();
    setSelected(null);
    setEditing(false);
  };

  const saveNote = async () => {
    if (!selected || saving) return;
    Keyboard.dismiss();
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

  const handleDelete = (item, swipeRef) => {
    Alert.alert(
      'Çek silinsin mi?',
      'Kullanılmış olan bu çek listeden tamamen kaldırılacak.',
      [
        {
          text: 'Vazgeç',
          style: 'cancel',
          onPress: () => {
            try { swipeRef?.current?.close(); } catch (e) {}
          },
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChequeCard(item.id);
              if (selected?.id === item.id) setSelected(null);
            } catch (e) {
              Alert.alert('Hata', e.message || 'Silinemedi');
            }
          },
        },
      ]
    );
  };

  const getOriginLabel = (item) => {
    const myUid = user?.uid;
    const friendName = activeFriend?.username || 'arkadaş';

    if (item.direction === 'gift') {
      if (item.ownerId === myUid) {
        return `@${friendName} hediye etti`;
      }
      return `Sen @${friendName}'e hediye ettin`;
    }
    // keep
    if (item.ownerId === myUid) {
      return 'Kendine aldın';
    }
    return `@${friendName} kendine aldı`;
  };

  const renderRightActions = (item, swipeRef) => () => {
    // Sadece kullanılmış çek silinebilir + sadece sahibi (mine sekmesi)
    if (item.status !== 'used' || tab !== 'mine') return null;
    return (
      <View style={styles.deleteWrap}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => handleDelete(item, swipeRef)}
          activeOpacity={0.8}
        >
          <Trash2 size={20} color="#fff" />
          <Text style={styles.deleteActionText}>Sil</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Her satır için ayrı bir wrapper component (her satır kendi ref'ine sahip olsun)
  const SwipeableChequeRow = ({ item }) => {
    const swipeRef = useRef(null);

    const card = (
      <TouchableOpacity
        style={[styles.row, item.status === 'used' && styles.rowUsed]}
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
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{getOriginLabel(item)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );

    const canDelete = item.status === 'used' && tab === 'mine';
    if (!canDelete) return card;

    return (
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions(item, swipeRef)}
        onSwipeableWillOpen={() => {
          // Diğer açık satırları kapat
          if (openRowRef.current && openRowRef.current !== swipeRef.current) {
            try { openRowRef.current.close(); } catch (e) {}
          }
          openRowRef.current = swipeRef.current;
        }}
        friction={1.5}
        rightThreshold={40}
        overshootRight={false}
      >
        {card}
      </Swipeable>
    );
  };

  const renderItem = ({ item }) => <SwipeableChequeRow item={item} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader />

      <View style={styles.titleWrap}>
        <Text style={styles.pageTitle}>Çekler</Text>
        <Text style={styles.pageSub}>
          {activeFriend ? `@${activeFriend.username} ile olan tüm çekler` : 'Arkadaş seçilmedi'}
        </Text>
      </View>

      {/* Üst sekme: Benim / Onun */}
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          const count = t.key === 'mine' ? myActive : theirActive;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.85}
            >
              <Icon size={16} color={active ? COLORS.text : COLORS.textMuted} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              {count > 0 && (
                <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                  <Text style={[styles.countText, active && styles.countTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Alt filtre chipleri */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!activeFriend ? (
        <View style={styles.empty}>
          <FileText size={44} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Henüz arkadaş yok</Text>
          <Text style={styles.emptySub}>Çekleri görmek için bir arkadaş eklemen lazım.</Text>
        </View>
      ) : list.length === 0 ? (
        <View style={styles.empty}>
          <FileText size={44} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>
            {filter === 'used' ? 'Kullanılmış çek yok' : filter === 'active' ? 'Kullanılabilir çek yok' : 'Henüz çek yok'}
          </Text>
          <Text style={styles.emptySub}>
            {tab === 'mine'
              ? 'Sana ait çekler burada görünecek.'
              : `@${activeFriend.username}'in çekleri burada görünecek.`}
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

      {/* Detay modalı */}
      <BottomSheet
        visible={!!selected}
        onClose={closeDetail}
        title="Çek Detayı"
        maxHeight={620}
      >
        {selected && (
          <View>
            <View style={styles.detailHeader}>
              <View style={[styles.detailStripe, { backgroundColor: selected.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{selected.title}</Text>
                <Text style={styles.detailSub}>{selected.subtitle}</Text>
              </View>
            </View>

            <View style={styles.detailMetaRow}>
              <View style={styles.metaCell}>
                <Text style={styles.metaCellLabel}>NEREDEN</Text>
                <Text style={styles.metaCellValue}>{getOriginLabel(selected)}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaCellLabel}>TARİH</Text>
                <Text style={styles.metaCellValue}>{formatDate(selected.createdAtMillis)}</Text>
              </View>
            </View>

            {selected.status === 'used' && selected.usedAtMillis && (
              <View style={styles.usedRow}>
                <CheckCircle2 size={14} color={COLORS.textMuted} />
                <Text style={styles.usedRowText}>
                  {formatDate(selected.usedAtMillis)} tarihinde kullanıldı
                </Text>
              </View>
            )}

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
                    : tab === 'mine' && selected.status !== 'used'
                      ? 'Henüz bir not eklenmedi. Düzenlemek için "Not ekle"ye dokun.'
                      : 'Bu çek için not eklenmemiş.'}
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
                      Keyboard.dismiss();
                    }}
                    disabled={saving}
                  >
                    <X size={16} color={COLORS.text} />
                    <Text style={styles.ghostBtnText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { flex: 1, opacity: saving ? 0.6 : 1 }]}
                    onPress={saveNote}
                    disabled={saving}
                  >
                    <Text style={styles.primaryBtnText}>
                      {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {tab === 'mine' && selected.status !== 'used' && (
                    <TouchableOpacity style={styles.ghostBtn} onPress={() => setEditing(true)}>
                      <Edit3 size={16} color={COLORS.text} />
                      <Text style={styles.ghostBtnText}>
                        {selected.reason ? 'Düzenle' : 'Not ekle'}
                      </Text>
                    </TouchableOpacity>
                  )}
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
    marginBottom: SPACING.sm,
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
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeActive: { backgroundColor: COLORS.text },
  countText: { fontFamily: FONTS.bold, fontSize: 10, color: COLORS.textMuted },
  countTextActive: { color: '#fff' },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    ...SHADOW.soft,
  },
  filterChipActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  filterText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textMuted },
  filterTextActive: { color: '#fff', fontFamily: FONTS.semiBold },
  row: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  rowUsed: {
    opacity: 0.55,
  },
  colorStrip: { width: 5 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  rowTitle: { fontFamily: FONTS.semiBold, fontSize: 15, color: COLORS.text, flex: 1 },
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
  deleteWrap: {
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: {
    backgroundColor: COLORS.danger,
    width: 80,
    height: '88%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 4,
    borderRadius: RADIUS.md,
  },
  deleteActionText: {
    color: '#fff',
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  detailStripe: { width: 6, height: 48, borderRadius: 3 },
  detailTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  detailSub: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  detailMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md,
  },
  metaCell: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  metaCellLabel: {
    fontFamily: FONTS.bold,
    fontSize: 9,
    letterSpacing: 1,
    color: COLORS.textLight,
  },
  metaCellValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.text,
    marginTop: 4,
  },
  usedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  usedRowText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textMuted,
  },
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
