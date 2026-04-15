import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, where, orderBy, runTransaction, Timestamp, getDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Coupon, CouponDirection, CouponStatus } from '../types';
import { incrementStats } from './userService';

function uid() {
  const u = auth.currentUser;
  if (!u) throw new Error('Giriş yapılmamış');
  return u.uid;
}

function toCoupon(id: string, d: any): Coupon {
  return {
    couponId:    id,
    matchId:     d.matchId,
    winnerId:    d.winnerId,
    giverId:     d.giverId,
    title:       d.title,
    description: d.description,
    category:    d.category,
    direction:   d.direction,
    recipientId: d.recipientId,
    status:      d.status,
    createdAt:   d.createdAt.toDate(),
    usedAt:      d.usedAt?.toDate(),
    expiresAt:   d.expiresAt?.toDate(),
    templateId:  d.templateId,
    usageLimit:  d.usageLimit,
    usageCount:  d.usageCount ?? 0,
    gameNote:    d.gameNote ?? '',
  };
}

// Benim çeklerim
export function watchMyCoupons(matchId: string | null, cb: (coupons: Coupon[]) => void) {
  const constraints: any[] = [
    where('winnerId', '==', uid()),
    orderBy('createdAt', 'desc'),
  ];
  if (matchId) constraints.push(where('matchId', '==', matchId));
  const q = query(collection(db, 'coupons'), ...constraints);
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => toCoupon(d.id, d.data()))));
}

// Partnerin çekleri
export function watchPartnerCoupons(
  partnerId: string,
  matchId: string | null,
  cb: (coupons: Coupon[]) => void,
) {
  const constraints: any[] = [
    where('winnerId', '==', partnerId),
    orderBy('createdAt', 'desc'),
  ];
  if (matchId) constraints.push(where('matchId', '==', matchId));
  const q = query(collection(db, 'coupons'), ...constraints);
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => toCoupon(d.id, d.data()))));
}

// Çek oluştur (swipe sonrası)
export async function createCoupon(params: {
  templateId: string;
  matchId:    string;
  giverId:    string;
  winnerId:   string;
  direction:  CouponDirection;
  gameNote?:  string;
}) {
  const templateSnap = await getDoc(doc(db, 'couponTemplates', params.templateId));
  if (!templateSnap.exists()) throw new Error('Şablon bulunamadı');
  const t = templateSnap.data();

  const recipientId = params.direction === 'gift' ? params.giverId : params.winnerId;

  await addDoc(collection(db, 'coupons'), {
    matchId:     params.matchId,
    winnerId:    params.winnerId,
    giverId:     params.giverId,
    recipientId,
    direction:   params.direction,
    title:       t.title,
    description: t.description,
    category:    t.category,
    templateId:  params.templateId,
    status:      'active',
    usageLimit:  t.usageLimit ?? null,
    usageCount:  0,
    gameNote:    params.gameNote ?? '',
    createdAt:   Timestamp.now(),
    expiresAt:   t.expiryDays
      ? Timestamp.fromDate(new Date(Date.now() + t.expiryDays * 86400000))
      : null,
  });

  // İstatistik güncelle
  if (params.direction === 'self') {
    await incrementStats(params.winnerId, 'totalWon');
  } else {
    await incrementStats(params.winnerId, 'totalWon');
    await incrementStats(params.giverId,  'totalPassed');
  }
}

// Çek kullan
export async function redeemCoupon(couponId: string) {
  const ref = doc(db, 'coupons', couponId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Çek bulunamadı');
    const c = toCoupon(snap.id, snap.data());
    if (c.status !== 'active') throw new Error('Bu çek artık aktif değil');

    const newCount  = c.usageCount + 1;
    const newStatus: CouponStatus =
      c.usageLimit && newCount >= c.usageLimit ? 'used' : 'active';

    tx.update(ref, {
      usageCount: newCount,
      status:     newStatus,
      usedAt:     Timestamp.now(),
    });
  });
}

// Oyun notunu güncelle
export async function updateGameNote(couponId: string, note: string) {
  await updateDoc(doc(db, 'coupons', couponId), { gameNote: note });
}

// Demo şablonlar (Firestore'da couponTemplates koleksiyonuna yüklenecek)
export const DEMO_TEMPLATES = [
  {
    templateId:  'tpl_dinner',
    title:       'Akşam Yemeği Seçimi',
    description: 'Nereye gidileceğine sen karar verirsin!',
    category:    'date',
    iconName:    'utensils',
    isActive:    true,
    usageLimit:  1,
    expiryDays:  30,
  },
  {
    templateId:  'tpl_chores',
    title:       'Bulaşık Görevi',
    description: 'Bir hafta bulaşıkları ben yıkarım.',
    category:    'chore',
    iconName:    'sparkles',
    isActive:    true,
    usageLimit:  1,
    expiryDays:  14,
  },
  {
    templateId:  'tpl_movie',
    title:       'Film Seçimi',
    description: 'İstediğin filmi seçmek senin hakkın!',
    category:    'fun',
    iconName:    'film',
    isActive:    true,
    usageLimit:  1,
    expiryDays:  30,
  },
  {
    templateId:  'tpl_massage',
    title:       'Sırt Masajı',
    description: '15 dakika sırt masajı hakkı!',
    category:    'fun',
    iconName:    'heart',
    isActive:    true,
    usageLimit:  1,
    expiryDays:  60,
  },
  {
    templateId:  'tpl_custom',
    title:       'Özel İstek',
    description: 'Sana özel bir istek hakkı!',
    category:    'custom',
    iconName:    'star',
    isActive:    true,
    usageLimit:  1,
  },
];
