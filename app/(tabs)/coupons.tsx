import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore }  from '../../src/store/authStore';
import { useMatchStore } from '../../src/store/matchStore';
import {
  watchMyCoupons, watchPartnerCoupons, redeemCoupon, updateGameNote,
} from '../../src/services/couponService';
import { Coupon, CouponStatus, Match } from '../../src/types';
import { Colors, Typography, Spacing, Radius, categoryColor } from '../../src/theme';
import { CpLogo } from '../../src/components/shared/CpLogo';

const { height: SH } = Dimensions.get('window');

// ─── Çek Detay Modal ────────────────────────────────────────────────────────
function CouponDetail({
  coupon, onClose, onRedeem,
}: { coupon: Coupon | null; onClose: () => void; onRedeem: (id: string) => void }) {
  const [note, setNote]       = useState(coupon?.gameNote ?? '');
  const [saving, setSaving]   = useState(false);

  useEffect(() => { setNote(coupon?.gameNote ?? ''); }, [coupon]);

  if (!coupon) return null;

  async function saveNote() {
    setSaving(true);
    await updateGameNote(coupon!.couponId, note);
    setSaving(false);
  }

  const isActive  = coupon.status === 'active';
  const dateStr   = coupon.createdAt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Modal visible={!!coupon} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={onClose} />
      <View style={styles.detailSheet}>
        {/* Sağ üst: Tarih */}
        <View style={styles.detailHeader}>
          <View style={styles.detailHandle} />
          <Text style={styles.detailDate}>{dateStr}</Text>
        </View>

        <View style={[styles.detailCatPill, { backgroundColor: categoryColor(0) }]}>
          <Text style={styles.detailCatText}>{coupon.category.toUpperCase()}</Text>
        </View>
        <Text style={styles.detailTitle}>{coupon.title}</Text>
        <Text style={styles.detailDesc}>{coupon.description}</Text>

        {/* Oyun notu */}
        <Text style={styles.noteLabel}>Oyun Notu</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          onBlur={saveNote}
          placeholder="Hangi oyun / iddia? (opsiyonel)"
          placeholderTextColor={Colors.textHint}
          multiline
        />

        {/* Durum etiketi */}
        <View style={[styles.statusBadge, { backgroundColor: statusBg(coupon.status) }]}>
          <Text style={styles.statusText}>{statusLabel(coupon.status)}</Text>
        </View>

        {isActive && (
          <TouchableOpacity style={styles.redeemBtn} onPress={() => { onRedeem(coupon.couponId); onClose(); }}>
            <Text style={styles.redeemText}>Çeki Kullan</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Kapat</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function statusLabel(s: CouponStatus) {
  return s === 'active' ? 'Aktif' : s === 'used' ? 'Kullanıldı' : 'Süresi Doldu';
}
function statusBg(s: CouponStatus) {
  return s === 'active' ? Colors.teal : s === 'used' ? Colors.textHint : Colors.peach;
}

// ─── Çek Satırı ─────────────────────────────────────────────────────────────
function CouponRow({ coupon, onPress, idx }: { coupon: Coupon; onPress: () => void; idx: number }) {
  const isActive = coupon.status === 'active';
  return (
    <TouchableOpacity
      style={[styles.row, !isActive && { opacity: 0.55 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.rowCat, { backgroundColor: categoryColor(idx) }]} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowTitle}>{coupon.title}</Text>
          <View style={[styles.rowStatus, { backgroundColor: statusBg(coupon.status) }]}>
            <Text style={styles.rowStatusText}>{statusLabel(coupon.status)}</Text>
          </View>
        </View>
        {/* Açıklama biraz aşağıda, boşluk bırakıldı */}
        <Text style={[styles.rowDesc, { marginTop: 8 }]} numberOfLines={1}>{coupon.description}</Text>
        {!!coupon.gameNote && (
          <Text style={styles.rowNote} numberOfLines={1}>📝 {coupon.gameNote}</Text>
        )}
        <Text style={styles.rowDate}>
          {coupon.createdAt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Ana Ekran ───────────────────────────────────────────────────────────────
export default function CouponsScreen() {
  const { user }                        = useAuthStore();
  const { selectedMatch, matches, selectMatch } = useMatchStore();

  const [tab,          setTab]          = useState<'mine' | 'partner'>('mine');
  const [filter,       setFilter]       = useState<CouponStatus | null>(null);
  const [myCoupons,    setMyCoupons]    = useState<Coupon[]>([]);
  const [partnerCoupons, setPartnerCoupons] = useState<Coupon[]>([]);
  const [selected,     setSelected]     = useState<Coupon | null>(null);

  const partnerId   = selectedMatch?.participants.find((p) => p !== user?.uid) ?? null;
  const partnerName = selectedMatch
    ? (selectedMatch.participantNames[partnerId ?? ''] ?? 'Partner')
    : 'Partner';

  useEffect(() => {
    if (!user) return;
    const unsub = watchMyCoupons(selectedMatch?.matchId ?? null, setMyCoupons);
    return unsub;
  }, [user?.uid, selectedMatch?.matchId]);

  useEffect(() => {
    if (!user || !partnerId) return;
    const unsub = watchPartnerCoupons(partnerId, selectedMatch?.matchId ?? null, setPartnerCoupons);
    return unsub;
  }, [partnerId, selectedMatch?.matchId]);

  const coupons = (tab === 'mine' ? myCoupons : partnerCoupons).filter(
    (c) => !filter || c.status === filter,
  );

  async function handleRedeem(id: string) {
    try { await redeemCoupon(id); } catch {}
  }

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <CpLogo size="sm" />
          {/* Partner seçici */}
          {matches.length > 0 && (
            <TouchableOpacity style={styles.partnerPill}>
              <Text style={styles.partnerText}>{partnerName} ▾</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {(['mine', 'partner'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'mine' ? 'Benim Çeklerim' : `${partnerName}'nin Çekleri`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filtre — yatay scroll */}
        <View style={styles.filterRow}>
          {([null, 'active', 'used', 'expired'] as const).map((f) => (
            <TouchableOpacity
              key={String(f)}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === null ? 'Tümü' : statusLabel(f)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Liste */}
        <FlatList
          data={coupons}
          keyExtractor={(c) => c.couponId}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <CouponRow
              coupon={item}
              idx={index}
              onPress={() => setSelected(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎫</Text>
              <Text style={styles.emptyTitle}>Henüz çek yok</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      <CouponDetail
        coupon={selected}
        onClose={() => setSelected(null)}
        onRedeem={handleRedeem}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  partnerPill: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  partnerText: { fontFamily: Typography.fontBodyMed, fontSize: 13, color: Colors.brand },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.lg,
    padding: 4,
    marginBottom: Spacing.sm,
  },
  tabBtn: {
    flex: 1, height: 38, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  tabBtnActive:  { backgroundColor: Colors.yellow },
  tabText:       { fontFamily: Typography.fontBodyMed, fontSize: 13, color: Colors.textMuted },
  tabTextActive: { color: Colors.textPrimary },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: 8,
    marginBottom: Spacing.sm,
    flexWrap: 'nowrap',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.teal, borderColor: Colors.teal },
  filterText:       { fontFamily: Typography.fontBody, fontSize: 12, color: Colors.textMuted },
  filterTextActive: { color: Colors.textPrimary, fontFamily: Typography.fontBodyMed },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 24, gap: 10 },

  row: {
    flexDirection:   'row',
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
    shadowColor:     '#fac5cd',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.15,
    shadowRadius:    10,
    elevation:       3,
  },
  rowCat:  { width: 6 },
  rowBody: { flex: 1, padding: Spacing.md },
  rowTop: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  rowTitle: { ...Typography.h3, flex: 1, marginRight: 8 },
  rowStatus: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      Radius.full,
  },
  rowStatusText: { fontFamily: Typography.fontBodyMed, fontSize: 10, color: '#fff' },
  rowDesc: { ...Typography.bodySm, color: Colors.textSecondary },
  rowNote: { fontFamily: Typography.fontBody, fontSize: 11, color: Colors.brand, marginTop: 4 },
  rowDate: { fontFamily: Typography.fontBody, fontSize: 10, color: Colors.textHint, marginTop: 4 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { ...Typography.h3, color: Colors.textMuted },

  // Detail modal
  modalBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  detailSheet: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding:         Spacing.lg,
    maxHeight:       SH * 0.75,
  },
  detailHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   Spacing.md,
    position:       'relative',
  },
  detailHandle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  detailDate: {
    position:   'absolute',
    right:      0,
    fontFamily: Typography.fontBody,
    fontSize:   11,
    color:      Colors.textMuted,
  },
  detailCatPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  detailCatText: { fontFamily: Typography.fontBodyMed, fontSize: 10, color: Colors.brand },
  detailTitle:   { ...Typography.h2, marginBottom: Spacing.xs },
  detailDesc:    { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.md },
  noteLabel:     { ...Typography.caption, marginBottom: 6 },
  noteInput: {
    backgroundColor: Colors.gradientStart,
    borderRadius:    Radius.md,
    padding:         Spacing.sm,
    fontFamily:      Typography.fontBody,
    fontSize:        14,
    color:           Colors.textPrimary,
    minHeight:       64,
    marginBottom:    Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  statusBadge: {
    alignSelf:       'flex-start',
    paddingHorizontal: 12,
    paddingVertical:   4,
    borderRadius:    Radius.full,
    marginBottom:    Spacing.md,
  },
  statusText: { fontFamily: Typography.fontBodyMed, fontSize: 12, color: '#fff' },
  redeemBtn: {
    height:          50,
    borderRadius:    Radius.md,
    backgroundColor: Colors.brand,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.sm,
  },
  redeemText:  { fontFamily: Typography.fontBodySem, fontSize: 15, color: '#fff' },
  closeBtn: {
    height:          44,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  closeBtnText: { fontFamily: Typography.fontBodyMed, fontSize: 14, color: Colors.textMuted },
});
