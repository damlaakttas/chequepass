// functions/index.js
//
// ChequePass push bildirimleri (Firebase Cloud Functions v2).
// Firestore olaylarını dinler ve ilgili kullanıcıya Expo push bildirimi gönderir.
//
// Kapsanan olaylar:
//  - Arkadaşlık isteği geldi        (friendships create, status=pending)
//  - Arkadaşlık isteği kabul edildi (friendships update, -> accepted)
//  - Çek yollandı/kazanıldı         (cheques create)
//  - Çek kullanıldı                 (cheques update, -> used)
//
// Token'lar Expo push token'ıdır; https://exp.host/--/api/v2/push/send ile gönderilir.
// iOS'ta teslim için EAS credentials'ta APNs anahtarı yapılı olmalıdır.

const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

initializeApp();
const db = getFirestore();

// Çek geçerlilik kuralları — src/config/cheques.js ile AYNI olmalı.
const EXPIRY_REMINDER_HOURS = 12;
// Doğrulanmamış kayıtların kullanıcı adını tuttuğu süre — firestore.rules ile aynı.
const UNVERIFIED_TTL_MS = 30 * 60 * 1000; // 30 dakika

// ---- Yardımcılar -----------------------------------------------------------

async function getPushTokens(uid) {
  if (!uid) return [];
  try {
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) return [];
    const tokens = snap.data().pushTokens || [];
    return Array.isArray(tokens) ? tokens.filter(Boolean) : [];
  } catch (e) {
    console.error('getPushTokens error', e);
    return [];
  }
}

async function sendPush(tokens, title, body, data = {}) {
  const valid = (tokens || []).filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'));
  if (valid.length === 0) return;

  const messages = valid.map((to) => ({
    to,
    title,
    body,
    sound: 'default',
    data,
  }));

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const json = await res.json();
    console.log('Expo push result', JSON.stringify(json));
  } catch (e) {
    console.error('sendPush error', e);
  }
}

async function notifyUser(uid, title, body, data) {
  const tokens = await getPushTokens(uid);
  await sendPush(tokens, title, body, data);
}

// ---- Arkadaşlık isteği geldi ----------------------------------------------

exports.onFriendshipCreated = onDocumentCreated('friendships/{id}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data();
  if (data.status !== 'pending') return;

  const requester = data.requestedBy;
  const recipient = (data.userIds || []).find((u) => u !== requester);
  if (!recipient) return;

  const requesterName = data.users?.[requester]?.username || 'Biri';
  await notifyUser(
    recipient,
    'Yeni arkadaşlık isteği 👋',
    `@${requesterName} sana arkadaşlık isteği gönderdi.`,
    { type: 'friend_request', friendshipId: event.params.id }
  );
});

// ---- Arkadaşlık isteği kabul edildi ---------------------------------------

exports.onFriendshipUpdated = onDocumentUpdated('friendships/{id}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;

  if (before.status !== 'accepted' && after.status === 'accepted') {
    const requester = after.requestedBy;
    const accepter = (after.userIds || []).find((u) => u !== requester);
    const accepterName = after.users?.[accepter]?.username || 'Arkadaşın';
    await notifyUser(
      requester,
      'İsteğin kabul edildi 🎉',
      `@${accepterName} arkadaşlık isteğini kabul etti.`,
      { type: 'friend_accepted', friendshipId: event.params.id }
    );
  }
});

// ---- Çek yollandı / kazanıldı ---------------------------------------------

exports.onChequeCreated = onDocumentCreated('cheques/{id}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const c = snap.data();

  // Bildirimi çeki gönderen değil, karşı taraf alır.
  const sender = c.fromId;
  const recipient = c.ownerId && c.ownerId !== sender ? c.ownerId : (c.participants || []).find((u) => u !== sender);
  if (!recipient || recipient === sender) return;

  // Gönderenin adını bul
  let senderName = 'Arkadaşın';
  try {
    const uSnap = await db.collection('users').doc(sender).get();
    if (uSnap.exists) senderName = uSnap.data().username || senderName;
  } catch (e) {}

  const isGift = c.direction === 'gift';
  await notifyUser(
    recipient,
    isGift ? 'Sana bir çek geldi 🎁' : 'Yeni çek 🧾',
    `@${senderName}: "${c.title}"`,
    { type: 'cheque_new', chequeId: event.params.id }
  );
});

// ---- Çek kullanıldı --------------------------------------------------------

exports.onChequeUpdated = onDocumentUpdated('cheques/{id}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;

  if (before.status !== 'used' && after.status === 'used') {
    // Çeki kullanan sahibi; diğer katılımcıya haber ver.
    const user = after.ownerId;
    const other = (after.participants || []).find((u) => u !== user);
    if (!other) return;

    let userName = 'Arkadaşın';
    try {
      const uSnap = await db.collection('users').doc(user).get();
      if (uSnap.exists) userName = uSnap.data().username || userName;
    } catch (e) {}

    await notifyUser(
      other,
      'Çek kullanıldı ✅',
      `@${userName} "${after.title}" çekini kullandı.`,
      { type: 'cheque_used', chequeId: event.params.id }
    );
  }
});

// ---- Süresi dolmak üzere olan çekler --------------------------------------
//
// Saatte bir çalışır. Bitmesine EXPIRY_REMINDER_HOURS (12) saatten az kalan,
// henüz kullanılmamış ve daha önce hatırlatılmamış çekler için sahibine
// push bildirimi gönderir.
//
// Tekrar göndermeyi önlemek için çeke `expiryNotifiedAt` yazılır.
// `expiresAt` alanı olmayan eski çekler sorguya hiç girmez (süresizler).
//
// GEREKLİ INDEX: cheques (status ASC, expiresAt ASC) — firestore.indexes.json'da.

exports.remindExpiringCheques = onSchedule(
  {
    schedule: 'every 60 minutes',
    timeZone: 'Europe/Istanbul',
    region: 'us-central1',
  },
  async () => {
    const now = Timestamp.now();
    const threshold = Timestamp.fromMillis(
      now.toMillis() + EXPIRY_REMINDER_HOURS * 60 * 60 * 1000
    );

    let snap;
    try {
      snap = await db
        .collection('cheques')
        .where('status', '==', 'active')
        .where('expiresAt', '>', now)
        .where('expiresAt', '<=', threshold)
        .limit(500)
        .get();
    } catch (e) {
      console.error('remindExpiringCheques query failed', e);
      return;
    }

    if (snap.empty) {
      console.log('remindExpiringCheques: gonderilecek cek yok');
      return;
    }

    let sent = 0;
    for (const docSnap of snap.docs) {
      const c = docSnap.data();

      // Daha önce hatırlatıldıysa atla. (Uc filtre birden index karmasikligi
      // yaratmasin diye kodda eleniyor.)
      if (c.expiryNotifiedAt) continue;

      const owner = c.ownerId;
      if (!owner) continue;

      const hoursLeft = Math.max(
        1,
        Math.round((c.expiresAt.toMillis() - now.toMillis()) / (60 * 60 * 1000))
      );

      try {
        await notifyUser(
          owner,
          'Çekinin süresi doluyor ⏳',
          `"${c.title}" çekini kullanmana ${hoursLeft} saat kaldı.`,
          { type: 'cheque_expiring', chequeId: docSnap.id }
        );
        await docSnap.ref.update({ expiryNotifiedAt: FieldValue.serverTimestamp() });
        sent++;
      } catch (e) {
        console.error('remindExpiringCheques notify failed', docSnap.id, e);
      }
    }

    console.log(`remindExpiringCheques: ${sent} bildirim gonderildi`);
  }
);

// ---- Doğrulanmamış kayıtları temizle ---------------------------------------
//
// Saatte bir çalışır. E-postasını 30 dakika içinde doğrulamayan hesapları
// (Auth + users + usernames) siler. Böylece hatalı e-postayla yapılan kayıt
// ne hesap olarak kalır ne de kullanıcı adını tutar.
//
// Kullanıcı adı zaten 30 dakika sonra istemci tarafında devralınabiliyor;
// bu fonksiyon çöpü tamamen ortadan kaldırır.

exports.cleanupUnverifiedSignups = onSchedule(
  {
    schedule: 'every 60 minutes',
    timeZone: 'Europe/Istanbul',
    region: 'us-central1',
  },
  async () => {
    const auth = getAuth();
    const cutoff = Date.now() - UNVERIFIED_TTL_MS;

    let deleted = 0;
    let pageToken;

    do {
      let page;
      try {
        page = await auth.listUsers(1000, pageToken);
      } catch (e) {
        console.error('cleanupUnverifiedSignups listUsers failed', e);
        return;
      }

      for (const user of page.users) {
        if (user.emailVerified) continue;

        const created = Date.parse(user.metadata.creationTime);
        if (!created || created > cutoff) continue;

        // Güvenlik ağı: profilinde emailVerified true ise dokunma.
        try {
          const profile = await db.collection('users').doc(user.uid).get();
          const data = profile.exists ? profile.data() : null;
          if (data?.emailVerified === true) continue;

          const batch = db.batch();
          if (data?.usernameLower) {
            batch.delete(db.collection('usernames').doc(data.usernameLower));
          }
          if (profile.exists) {
            batch.delete(profile.ref);
          }
          await batch.commit();
        } catch (e) {
          console.error('cleanupUnverifiedSignups firestore cleanup failed', user.uid, e);
          continue;
        }

        try {
          await auth.deleteUser(user.uid);
          deleted++;
        } catch (e) {
          console.error('cleanupUnverifiedSignups deleteUser failed', user.uid, e);
        }
      }

      pageToken = page.pageToken;
    } while (pageToken);

    console.log(`cleanupUnverifiedSignups: ${deleted} dogrulanmamis hesap silindi`);
  }
);
