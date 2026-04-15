import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, where, Timestamp, getDoc, getDocs,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Match, FriendRequest } from '../types';
import { incrementStats } from './userService';

function uid() {
  const u = auth.currentUser;
  if (!u) throw new Error('Giriş yapılmamış');
  return u.uid;
}

function toMatch(id: string, d: any): Match {
  return {
    matchId:              id,
    participants:         d.participants,
    participantNames:     d.participantNames ?? {},
    participantUsernames: d.participantUsernames ?? {},
    initiatorId:          d.initiatorId,
    status:               d.status,
    createdAt:            d.createdAt.toDate(),
    lastActivity:         d.lastActivity.toDate(),
  };
}

export function watchMyMatches(cb: (matches: Match[]) => void) {
  const q = query(
    collection(db, 'matches'),
    where('participants', 'array-contains', uid()),
    where('status', '==', 'active'),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => toMatch(d.id, d.data())));
  });
}

// Arkadaşlık isteği gönder
export async function sendFriendRequest(toUserId: string, toUserInfo: { displayName: string; username: string }) {
  const meDoc = await getDoc(doc(db, 'users', uid()));
  const me = meDoc.data()!;

  // Zaten istek var mı?
  const existing = await getDocs(
    query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', uid()),
      where('toUserId',   '==', toUserId),
      where('status',     '==', 'pending'),
    ),
  );
  if (!existing.empty) throw new Error('Zaten bekleyen bir isteğin var');

  await addDoc(collection(db, 'friendRequests'), {
    fromUserId:   uid(),
    fromUserName: me.displayName,
    fromUsername: me.username,
    toUserId,
    status:       'pending',
    createdAt:    Timestamp.now(),
  });
}

export function watchIncomingRequests(cb: (reqs: FriendRequest[]) => void) {
  const q = query(
    collection(db, 'friendRequests'),
    where('toUserId', '==', uid()),
    where('status',   '==', 'pending'),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({
      requestId:    d.id,
      fromUserId:   d.data().fromUserId,
      fromUserName: d.data().fromUserName,
      fromUsername: d.data().fromUsername,
      toUserId:     d.data().toUserId,
      status:       d.data().status,
      createdAt:    d.data().createdAt.toDate(),
    })));
  });
}

export async function acceptFriendRequest(reqId: string, fromUserId: string, fromUserInfo: any) {
  const meDoc = await getDoc(doc(db, 'users', uid()));
  const me = meDoc.data()!;

  await updateDoc(doc(db, 'friendRequests', reqId), { status: 'accepted' });

  const matchRef = await addDoc(collection(db, 'matches'), {
    participants: [uid(), fromUserId],
    participantNames: {
      [uid()]: me.displayName,
      [fromUserId]: fromUserInfo.fromUserName,
    },
    participantUsernames: {
      [uid()]: me.username,
      [fromUserId]: fromUserInfo.fromUsername,
    },
    initiatorId:  fromUserId,
    status:       'active',
    createdAt:    Timestamp.now(),
    lastActivity: Timestamp.now(),
  });

  await incrementStats(uid(), 'totalFriends');
  await incrementStats(fromUserId, 'totalFriends');

  return matchRef.id;
}

export async function rejectFriendRequest(reqId: string) {
  await updateDoc(doc(db, 'friendRequests', reqId), { status: 'rejected' });
}
