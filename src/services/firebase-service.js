// src/services/firebase-service.js
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  updateDoc,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { expiryDaysFor, expiryMillisFor } from '../config/cheques';

// Doğrulanmamış kayıtların kullanıcı adını ne kadar süre tuttuğu.
// Bu süre dolduktan sonra ad başkası tarafından devralınabilir.
// Aynı değer firestore.rules ve functions/index.js içinde de kullanılıyor.
export const USERNAME_RESERVATION_TTL_MS = 30 * 60 * 1000; // 30 dakika

// ---- Username validation ----------------------------------------------------

export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Kullanıcı adı gerekli' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Kullanıcı adı en az 3 karakter olmalı' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Kullanıcı adı en fazla 20 karakter olabilir' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Sadece harf, rakam ve alt tire (_) kullanabilirsin',
    };
  }
  return { valid: true, value: trimmed };
};

// Sadece UI ipucu için "yumuşak" kontrol. Auth öncesi çalıştığı için
// okuma başarısız olabilir; bu durumda HATA FIRLATMAZ, 'unknown' döner.
// Gerçek benzersizlik kontrolü kayıt anında transaction ile yapılır.
// Dönüş: 'available' | 'taken' | 'unknown'
export const checkUsernameAvailable = async (username) => {
  const usernameLower = username.toLowerCase();
  try {
    const snap = await getDoc(doc(db, 'usernames', usernameLower));
    if (!snap.exists()) return 'available';
    // Doğrulanmamış ve süresi dolmuş rezervasyon → ad yeniden alınabilir.
    return isExpiredReservation(snap.data()) ? 'available' : 'taken';
  } catch (e) {
    console.warn('checkUsernameAvailable soft-check failed:', e.code, e.message);
    return 'unknown';
  }
};

/**
 * Bir usernames dokümanı "süresi dolmuş, doğrulanmamış rezervasyon" mu?
 *
 * - verified === true  → gerçek hesap, asla devralınamaz.
 * - claimedAt yok      → bu özellikten ÖNCE oluşmuş eski kayıt; dokunma.
 * - claimedAt eski     → e-postası doğrulanmamış, terk edilmiş kayıt; devralınabilir.
 */
const isExpiredReservation = (data, now = Date.now()) => {
  if (!data) return false;
  if (data.verified === true) return false;
  const claimedAt = data.claimedAt;
  if (!claimedAt) return false;
  const millis =
    typeof claimedAt.toMillis === 'function'
      ? claimedAt.toMillis()
      : claimedAt.seconds
        ? claimedAt.seconds * 1000
        : null;
  if (!millis) return false;
  return now - millis > USERNAME_RESERVATION_TTL_MS;
};

// ---- User profile helpers ---------------------------------------------------

// Özel hata: kullanıcı adı başkası tarafından alınmış.
export class UsernameTakenError extends Error {
  constructor() {
    super('Bu kullanıcı adı zaten alınmış');
    this.code = 'username-taken';
    this.name = 'UsernameTakenError';
  }
}

// Kullanıcı ve username kaydını ATOMİK yazar. Kullanıcı bu noktada
// kimliği doğrulanmış (auth'lu) olduğu için okuma güvenle çalışır.
// Transaction sayesinde iki kişi aynı anda aynı adı alamaz.
export const writeUserAndUsername = async ({ uid, username, email, avatar }) => {
  const usernameLower = username.toLowerCase();
  const userRef = doc(db, 'users', uid);
  const usernameRef = doc(db, 'usernames', usernameLower);

  try {
    await runTransaction(db, async (tx) => {
      const existing = await tx.get(usernameRef);

      if (existing.exists()) {
        const data = existing.data();
        const isMine = data?.uid === uid;
        // Başkasının adı: yalnızca doğrulanmamış + süresi dolmuş bir
        // rezervasyonsa devralınabilir. Gerçek hesaplara dokunulmaz.
        if (!isMine && !isExpiredReservation(data)) {
          throw new UsernameTakenError();
        }
      }

      tx.set(userRef, {
        uid,
        username,
        usernameLower,
        email: email.toLowerCase(),
        avatar,
        // E-posta doğrulanana kadar hesap "beklemede" sayılır.
        emailVerified: false,
        createdAt: serverTimestamp(),
      });

      // Kullanıcı adı kaydı DOĞRULANMAMIŞ rezervasyon olarak yazılır.
      // verified=true, kullanıcı e-postasını onaylayıp ilk girişini
      // yaptığında markUsernameVerified() ile işaretlenir.
      tx.set(usernameRef, {
        uid,
        username,
        usernameLower,
        verified: false,
        claimedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    });
  } catch (e) {
    if (e instanceof UsernameTakenError || e.code === 'username-taken') {
      throw e;
    }
    console.error('writeUserAndUsername failed:', e.code, e.message);
    throw new Error('Profil kaydedilemedi: ' + (e.message || 'bilinmeyen hata'));
  }
};

/**
 * E-posta doğrulandıktan sonraki İLK girişte çağrılır.
 * Kullanıcı adı rezervasyonunu kalıcı hale getirir (verified=true) ve
 * profildeki emailVerified bayrağını günceller.
 *
 * Hata fırlatmaz: giriş akışını bloklamamalı. Başarısız olursa bir sonraki
 * girişte tekrar denenir.
 */
export const markUsernameVerified = async ({ uid, username }) => {
  if (!uid || !username) return { ok: false };
  const usernameLower = String(username).toLowerCase();

  // Rezervasyon süresi kısa olduğu için, doğrulama tamamlanana kadar
  // ad başkası tarafından devralınmış olabilir. Önce sahipliği kontrol et.
  try {
    const snap = await getDoc(doc(db, 'usernames', usernameLower));
    if (snap.exists() && snap.data()?.uid !== uid) {
      // Ad artık bizim değil. Çağıran taraf bu durumu ele alır.
      return { ok: false, lost: true };
    }
  } catch (e) {
    // Okuma başarısızsa hiçbir şey varsayma; bir sonraki girişte tekrar denenir.
    console.warn('markUsernameVerified ownership check failed:', e.code, e.message);
    return { ok: false };
  }

  try {
    await setDoc(
      doc(db, 'usernames', usernameLower),
      { uid, username, usernameLower, verified: true },
      { merge: true }
    );
  } catch (e) {
    console.warn('markUsernameVerified (usernames) failed:', e.code, e.message);
    return { ok: false };
  }
  try {
    await setDoc(doc(db, 'users', uid), { emailVerified: true }, { merge: true });
  } catch (e) {
    console.warn('markUsernameVerified (users) failed:', e.code, e.message);
  }
  return { ok: true };
};

export const findUserByUsername = async (username) => {
  const usernameLower = username.toLowerCase();
  const unameSnap = await getDoc(doc(db, 'usernames', usernameLower));
  if (!unameSnap.exists()) return null;

  const { uid } = unameSnap.data();
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) return null;

  return { uid, ...userSnap.data() };
};

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
};

/**
 * Kullanıcının avatar tercihini Firestore'a yaz (cihazlar arası senkron için).
 */
export const updateUserAvatar = async (uid, avatar) => {
  await updateDoc(doc(db, 'users', uid), { avatar });
};

// ---- Friendship helpers -----------------------------------------------------

const friendshipId = (uid1, uid2) => {
  return [uid1, uid2].sort().join('_');
};

/**
 * Arkadaşlık isteği gönder.
 */
export const sendFriendRequest = async ({ sender, targetUsername, relation = 'friend' }) => {
  const cleanTarget = targetUsername.trim().toLowerCase();

  if (sender.username.toLowerCase() === cleanTarget) {
    throw new Error('Kendini ekleyemezsin');
  }

  const targetUser = await findUserByUsername(cleanTarget);
  if (!targetUser) {
    throw new Error('Bu kullanıcı adıyla kimse bulunamadı');
  }

  const fId = friendshipId(sender.uid, targetUser.uid);
  // Var olan friendship var mı kontrol et (rules'ta resource==null bypass var)
  const existing = await getDoc(doc(db, 'friendships', fId));
  if (existing.exists()) {
    const data = existing.data();
    if (data.status === 'accepted') {
      throw new Error('Bu kullanıcıyla zaten arkadaşsınız');
    }
    if (data.status === 'pending') {
      if (data.requestedBy === sender.uid) {
        throw new Error('Bu kullanıcıya zaten istek gönderdin');
      } else {
        throw new Error('Bu kullanıcı sana istek göndermiş, bildirimlerini kontrol et');
      }
    }
    if (data.status === 'blocked') {
      throw new Error('Bu kullanıcıyla ilişki kurulamaz');
    }
  }

  await setDoc(doc(db, 'friendships', fId), {
    userIds: [sender.uid, targetUser.uid],
    users: {
      [sender.uid]: {
        username: sender.username,
        avatar: sender.avatar || null,
        relation,
      },
      [targetUser.uid]: {
        username: targetUser.username,
        avatar: targetUser.avatar || null,
        relation,
      },
    },
    status: 'pending',
    requestedBy: sender.uid,
    createdAt: serverTimestamp(),
  });

  return { friendshipId: fId, targetUsername: targetUser.username };
};

// ---- Cheque helpers ---------------------------------------------------------

/**
 * Yeni bir çek oluştur (swipe sonrası Firestore'a yaz).
 */
export const createCheque = async ({
  template,
  friendshipId,
  ownerId,
  fromId,
  toId,
  direction,
  reason = '',
  participants,
  deckVariant = 'normal',
}) => {
  const ref = doc(collection(db, 'cheques'));

  // Geçerlilik süresi çekin kopartıldığı anda sabitlenir:
  // normal deste 3 gün, romantik deste 6 gün.
  // Cloud Function `expiresAt` alanına bakarak 12 saat kala hatırlatma yollar.
  const expiresAtMillis = expiryMillisFor(deckVariant);

  await setDoc(ref, {
    friendshipId,
    participants,
    ownerId,
    fromId,
    toId,
    title: template.title,
    subtitle: template.subtitle,
    color: template.color,
    reason: reason || '',
    direction,
    deckVariant, // 'normal' | 'romantic' — Çeklerim'de kalpli tema için
    status: 'active',
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(expiresAtMillis),
    expiryDays: expiryDaysFor(deckVariant),
  });
  return ref.id;
};

/**
 * Çekin notunu güncelle. Sadece owner yapabilir.
 */
export const updateChequeReason = async (chequeId, reason) => {
  await setDoc(
    doc(db, 'cheques', chequeId),
    { reason: reason || '' },
    { merge: true }
  );
};

/**
 * Çeki kullanıldı olarak işaretle.
 */
export const markChequeUsed = async (chequeId) => {
  await setDoc(
    doc(db, 'cheques', chequeId),
    { status: 'used', usedAt: serverTimestamp() },
    { merge: true }
  );
};

/**
 * Çeki sil. Sadece kullanılmış (status='used') çekler için anlamlı.
 * Firestore rules tarafında 'sahibi & status==used' kontrolü var.
 */
export const deleteCheque = async (chequeId) => {
  await deleteDoc(doc(db, 'cheques', chequeId));
};
