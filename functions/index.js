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
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

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
