import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  updateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserDoc } from './userService';

export function onAuthChange(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function register(
  email: string,
  password: string,
  displayName: string,
  username: string,
) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await createUserDoc(cred.user.uid, { email: email.trim(), displayName, username });
  return cred;
}

export async function sendReset(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Kullanıcı bulunamadı');
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}

export async function changeEmail(currentPassword: string, newEmail: string) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Kullanıcı bulunamadı');
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updateEmail(user, newEmail.trim());
}

export async function signOut() {
  return firebaseSignOut(auth);
}
