// src/components/PaywallSheet.js
//
// Romantik paket satın alma modalı.
//
// ÖNEMLİ — İLİŞKİYE ÖZEL MODEL:
// Romantik paket cihaza/hesaba değil, İKİ KİŞİ ARASINDAKİ İLİŞKİYE tanımlanır.
// Bu yüzden satın alma yalnızca hedef ilişki belliyken (targetFriend) yapılabilir.
// targetFriend verilmezse modal "tanıtım modunda" açılır; satın alma butonu
// yerine kullanıcıyı Kopart ekranına yönlendiren bir bilgi gösterilir.
// (Aksi halde para tahsil edilip hiçbir ilişkiye paket tanımlanmıyordu.)
//
// "Satın alımı geri yükle" butonu bilerek YOK: ürün ilişki başına satılıyor,
// geri yükleme başka bir ilişkide bedava aktivasyona yol açıyordu.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Check, Lock, Sparkles, Heart } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { usePremium, ROMANTIC_PRODUCT_ID } from '../context/PremiumContext';
import { useState, useRef } from 'react';

const TEASE_CARDS = [
  { color: '#fecaca', text: 'Bu gece kontrol...' },
  { color: '#fbcfe8', text: 'Gözlerim bağlı...' },
  { color: '#ddd6fe', text: 'Sözsüz Anlaşma...' },
];

const FEATURES = [
  'Sürekli Genişleyen Deste: Standart destede bulamayacağın, her güncellemeyle yenileri eklenen özel ve flörtöz görevler.',
  'Sınırsız Kullanım: Bir kez al, ömür boyu senin olsun.',
  'Gizem ve Tutku: Kopart butonuna bas, geceyi şansa bırak.',
];

const PaywallSheet = ({ visible, onClose, onSuccess, targetFriend = null }) => {
  const { purchaseRomantic, purchasing, isMock, offerings } = usePremium();
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef(null);

  // Hedef ilişki yoksa satın alma yapılamaz (bkz. dosya başındaki not).
  const canPurchase = !!targetFriend?.id;

  // Gerçek StoreKit fiyatı (yerelleştirilmiş). Apple, vitrindeki gerçek
  // fiyattan farklı hard-coded fiyat gösterimini reddedebilir.
  const romanticPkg = offerings?.availablePackages?.find(
    (p) => p.product.identifier === ROMANTIC_PRODUCT_ID
  );
  const priceString = romanticPkg?.product?.priceString || null;

  const handlePurchase = async () => {
    if (!canPurchase) return;
    const result = await purchaseRomantic();
    if (!result.success) {
      if (!result.cancelled) {
        Alert.alert('Hata', result.error || 'Satın alma tamamlanamadı.');
      }
      return;
    }

    // Ödeme alındı. Aktivasyon BAŞARILI olmadan modalı kapatma —
    // aksi halde para gider, paket açılmaz.
    try {
      if (onSuccess) await onSuccess();
    } catch (e) {
      Alert.alert(
        'Paket etkinleştirilemedi',
        (e?.message || 'Bilinmeyen hata') +
          '\n\nÖdemen alındı. İnternet bağlantını kontrol edip tekrar dene; ' +
          'sorun sürerse bizimle iletişime geç.'
      );
      return;
    }

    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      onClose && onClose();
    }, 1800);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.bg}>
        <View style={styles.sheet}>
          {/* Kapatma */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <X size={20} color={COLORS.text} />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={{ paddingBottom: 200 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Yelpaze: 3 kart üst üste */}
            <View style={styles.fanWrap}>
              {TEASE_CARDS.map((card, i) => {
                const offset = (i - 1) * 14; // -14, 0, +14
                const rotate = (i - 1) * 8; // -8, 0, +8
                return (
                  <View
                    key={i}
                    style={[
                      styles.teaseCard,
                      {
                        backgroundColor: card.color,
                        transform: [{ translateX: offset }, { rotate: `${rotate}deg` }],
                        zIndex: 3 - Math.abs(i - 1),
                      },
                    ]}
                  >
                    <Text style={styles.teaseText}>{card.text}</Text>
                    <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFillObject} />
                    <View style={styles.lockOverlay} pointerEvents="none">
                      <Lock size={20} color="rgba(31,41,55,0.7)" />
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>🔥 Sınırları Kaldır: Romantik Paket</Text>
              <Text style={styles.subtitle}>
                İlişkinizin ateşini yükseltecek, sadece çiftlere özel hazırlanmış cesur iddialar ve görevler.
              </Text>
              {canPurchase && (
                <View style={styles.targetPill}>
                  <Heart size={13} color="#dc2626" fill="#dc2626" />
                  <Text style={styles.targetPillText}>
                    @{targetFriend.username} ile aranızda aktif olacak
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.features}>
              {FEATURES.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={styles.tickCircle}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </View>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            {isMock && (
              <View style={styles.devBadge}>
                <Text style={styles.devBadgeText}>
                  ⚠ Geliştirme modu: gerçek ödeme yok, mock satın alma
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Sticky footer */}
          <View style={styles.footer}>
            {canPurchase ? (
              <>
                <TouchableOpacity
                  style={[styles.ctaBtn, purchasing && { opacity: 0.6 }]}
                  onPress={handlePurchase}
                  disabled={purchasing}
                  activeOpacity={0.85}
                >
                  {purchasing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.ctaText}>
                        {priceString ? `${priceString} ile Kilidi Aç` : 'Kilidi Aç'}
                      </Text>
                      <Sparkles size={18} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.guaranteeText}>
                  Tek seferlik ödemedir. Abonelik gerektirmez. Paket, @
                  {targetFriend.username} ile aranızda geçerlidir; her ilişki için ayrı alınır.
                </Text>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.ctaBtn}
                  onPress={onClose}
                  activeOpacity={0.85}
                >
                  <Text style={styles.ctaText}>Anladım</Text>
                </TouchableOpacity>
                <Text style={styles.guaranteeText}>
                  Romantik paket kişiye özeldir. Kopart ekranında ilgili kişiyi seçip
                  "Romantik Paket"e dokunarak o ilişki için satın alabilirsin.
                </Text>
              </>
            )}
          </View>

          {showConfetti && (
            <ConfettiCannon
              ref={confettiRef}
              count={120}
              origin={{ x: -10, y: 0 }}
              fadeOut
              autoStart
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '92%',
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 100,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  fanWrap: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    position: 'relative',
  },
  teaseCard: {
    position: 'absolute',
    width: 140,
    height: 170,
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden',
    ...SHADOW.medium,
  },
  teaseText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: 'rgba(31,41,55,0.85)',
    textAlign: 'center',
    marginTop: 16,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 28,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: SPACING.sm,
  },
  features: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tickCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
    lineHeight: 19,
  },
  devBadge: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.lg,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: RADIUS.md,
  },
  devBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: '#92400e',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl + 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  ctaBtn: {
    width: '100%',
    backgroundColor: '#dc2626', // kırmızı (premium / dikkat)
    paddingVertical: 16,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...SHADOW.medium,
  },
  ctaText: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.3,
  },
  guaranteeText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  targetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    marginTop: SPACING.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  targetPillText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#9f1239',
  },
});

export default PaywallSheet;
