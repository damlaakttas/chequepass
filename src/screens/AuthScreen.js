// src/screens/AuthScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Check, X } from 'lucide-react-native';
import { sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';
import AppLogo from '../components/AppLogo';
import BottomSheet from '../components/BottomSheet';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../theme/theme';
import { useApp } from '../context/AppContext';
import { validateEmail } from '../utils/helpers';
import {
  checkUsernameAvailable,
  validateUsername,
} from '../services/firebase-service';
import { auth } from '../config/firebase';

const MODE = { LOGIN: 'login', SIGNUP: 'signup', FORGOT: 'forgot' };

// Firebase Auth error kodlarını Türkçe'ye çevir
const translateAuthError = (code) => {
  const map = {
    'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı',
    'auth/invalid-email': 'Geçersiz e-posta adresi',
    'auth/weak-password': 'Şifre çok zayıf, en az 6 karakter olmalı',
    'auth/user-not-found': 'Bu e-posta ile kayıtlı kullanıcı bulunamadı',
    'auth/wrong-password': 'Hatalı şifre',
    'auth/invalid-credential': 'E-posta veya şifre hatalı',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı, birazdan tekrar dene',
    'auth/network-request-failed': 'İnternet bağlantını kontrol et',
    'auth/user-disabled': 'Bu hesap devre dışı bırakılmış',
  };
  return map[code] || null;
};

const AuthScreen = () => {
  const { signIn, signUp, resetPassword } = useApp();
  const [mode, setMode] = useState(MODE.LOGIN);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [legalOpen, setLegalOpen] = useState(null);

  // Username live check state
  // status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [usernameMsg, setUsernameMsg] = useState('');

  const checkTimerRef = React.useRef(null);

  const onUsernameChange = (text) => {
    setUsername(text);

    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
    }

    if (!text.trim()) {
      setUsernameStatus('idle');
      setUsernameMsg('');
      return;
    }

    const validation = validateUsername(text);
    if (!validation.valid) {
      setUsernameStatus('invalid');
      setUsernameMsg(validation.error);
      return;
    }

    setUsernameStatus('checking');
    setUsernameMsg('Kontrol ediliyor...');
    checkTimerRef.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(validation.value);
        if (available) {
          setUsernameStatus('available');
          setUsernameMsg('Bu kullanıcı adı müsait');
        } else {
          setUsernameStatus('taken');
          setUsernameMsg('Bu kullanıcı adı zaten alınmış');
        }
      } catch (e) {
        setUsernameStatus('idle');
        setUsernameMsg('');
      }
    }, 500);
  };

  // Email doğrulanmamış kullanıcıya "yeniden gönder" seçeneği sun
  const handleUnverifiedLogin = async (userEmail, userPassword) => {
    try {
      // Geçici olarak giriş yap, sendEmailVerification çağır, sonra yine çıkış
      const credential = await signInWithEmailAndPassword(
        auth,
        userEmail.trim().toLowerCase(),
        userPassword
      );
      await sendEmailVerification(credential.user);
      await auth.signOut();
      Alert.alert('Gönderildi', 'Doğrulama linki yeniden gönderildi. Gelen kutunu kontrol et.');
    } catch (e) {
      Alert.alert('Hata', 'Link gönderilemedi. Birazdan tekrar dene.');
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      if (mode === MODE.LOGIN) {
        if (!validateEmail(email)) throw new Error('Geçerli bir e-posta gir');
        if (!password) throw new Error('Şifreni gir');

        await signIn({ email, password });

        // signIn başarılı. Şimdi emailVerified kontrolü yap.
        // onAuthStateChanged doğrulanmamışsa otomatik signOut yapacak
        // ama kullanıcıya net mesaj verelim.
        setTimeout(() => {
          const current = auth.currentUser;
          if (current && !current.emailVerified) {
            const savedEmail = email;
            const savedPassword = password;
            Alert.alert(
              'Email doğrulanmamış',
              'Giriş yapabilmek için önce email adresini doğrulaman gerekiyor. Gelen kutunu kontrol et.',
              [
                {
                  text: 'Yeniden gönder',
                  onPress: () => handleUnverifiedLogin(savedEmail, savedPassword),
                },
                { text: 'Tamam', style: 'cancel' },
              ]
            );
          }
        }, 600);
      } else if (mode === MODE.SIGNUP) {
        const validation = validateUsername(username);
        if (!validation.valid) throw new Error(validation.error);
        if (usernameStatus === 'taken') {
          throw new Error('Bu kullanıcı adı zaten alınmış');
        }
        if (!validateEmail(email)) throw new Error('Geçerli bir e-posta gir');
        if (password.length < 6) throw new Error('Şifre en az 6 karakter olmalı');

        await signUp({ username: validation.value, email, password });

        Alert.alert(
          'Hesabın oluşturuldu 🎉',
          `${email.trim()} adresine doğrulama linki gönderildi. Linke tıkladıktan sonra giriş yapabilirsin.`,
          [
            {
              text: 'Tamam',
              onPress: () => {
                setMode(MODE.LOGIN);
                setPassword('');
                setUsername('');
                setUsernameStatus('idle');
                setUsernameMsg('');
              },
            },
          ]
        );
      } else if (mode === MODE.FORGOT) {
        if (!validateEmail(email)) throw new Error('Geçerli bir e-posta gir');
        await resetPassword(email);
        Alert.alert(
          'Bağlantı gönderildi',
          'E-posta adresine şifre sıfırlama bağlantısı gönderildi.',
          [{ text: 'Tamam', onPress: () => setMode(MODE.LOGIN) }]
        );
      }
    } catch (e) {
      const friendly = e.code ? translateAuthError(e.code) : null;
      Alert.alert('Hata', friendly || e.message || 'Bir şeyler ters gitti');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setPassword('');
    setUsernameStatus('idle');
    setUsernameMsg('');
  };

  const titleMap = {
    [MODE.LOGIN]: 'Tekrar hoş geldin',
    [MODE.SIGNUP]: 'Hesap oluştur',
    [MODE.FORGOT]: 'Şifreni sıfırla',
  };
  const subMap = {
    [MODE.LOGIN]: 'Çekini koparmaya devam etmek için giriş yap.',
    [MODE.SIGNUP]: 'Birkaç saniyede hesap oluştur ve eğlenceye başla.',
    [MODE.FORGOT]: 'E-posta adresine sıfırlama bağlantısı gönderelim.',
  };

  const renderUsernameStatusIcon = () => {
    if (usernameStatus === 'checking') {
      return <ActivityIndicator size="small" color={COLORS.textMuted} />;
    }
    if (usernameStatus === 'available') {
      return <Check size={18} color={COLORS.success} />;
    }
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      return <X size={18} color={COLORS.danger} />;
    }
    return null;
  };

  const getStatusColor = () => {
    if (usernameStatus === 'available') return COLORS.success;
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return COLORS.danger;
    return COLORS.textMuted;
  };

  const submitDisabled =
    loading ||
    (mode === MODE.SIGNUP &&
      (usernameStatus === 'checking' ||
        usernameStatus === 'taken' ||
        usernameStatus === 'invalid'));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <AppLogo size="md" />
          </View>

          <View style={styles.hero}>
            <AppLogo size="lg" />
          </View>

          <Text style={styles.title}>{titleMap[mode]}</Text>
          <Text style={styles.subtitle}>{subMap[mode]}</Text>

          <View style={styles.form}>
            {mode === MODE.SIGNUP && (
              <>
                <View
                  style={[
                    styles.inputWrap,
                    usernameStatus === 'available' && {
                      borderColor: COLORS.success,
                      borderWidth: 1.5,
                    },
                    (usernameStatus === 'taken' || usernameStatus === 'invalid') && {
                      borderColor: COLORS.danger,
                      borderWidth: 1.5,
                    },
                  ]}
                >
                  <User size={18} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Kullanıcı adı"
                    placeholderTextColor={COLORS.textLight}
                    value={username}
                    onChangeText={onUsernameChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={20}
                  />
                  {renderUsernameStatusIcon()}
                </View>
                {!!usernameMsg && (
                  <Text style={[styles.statusMsg, { color: getStatusColor() }]}>
                    {usernameMsg}
                  </Text>
                )}
              </>
            )}

            <View style={styles.inputWrap}>
              <Mail size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="E-posta"
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>

            {mode !== MODE.FORGOT && (
              <View style={styles.inputWrap}>
                <Lock size={18} color={COLORS.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Şifre"
                  placeholderTextColor={COLORS.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={8}>
                  {showPass ? (
                    <EyeOff size={18} color={COLORS.textMuted} />
                  ) : (
                    <Eye size={18} color={COLORS.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {mode === MODE.LOGIN && (
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => switchMode(MODE.FORGOT)}
              >
                <Text style={styles.forgotText}>Şifremi unuttum</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, submitDisabled && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={submitDisabled}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitText}>
                    {mode === MODE.LOGIN
                      ? 'Giriş Yap'
                      : mode === MODE.SIGNUP
                      ? 'Hesap Oluştur'
                      : 'Bağlantı Gönder'}
                  </Text>
                  <ArrowRight size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {mode === MODE.SIGNUP && (
              <Text style={styles.legalLine}>
                Devam ederek{' '}
                <Text style={styles.legalLink} onPress={() => setLegalOpen('terms')}>
                  Kullanım Şartları
                </Text>{' '}
                ve{' '}
                <Text style={styles.legalLink} onPress={() => setLegalOpen('privacy')}>
                  Gizlilik Politikası
                </Text>
                'nı kabul ediyorsun.
              </Text>
            )}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {mode === MODE.SIGNUP
                ? 'Hesabın var mı?'
                : mode === MODE.FORGOT
                ? 'Hatırladın mı?'
                : 'Hesabın yok mu?'}
            </Text>
            <TouchableOpacity
              onPress={() =>
                switchMode(
                  mode === MODE.SIGNUP || mode === MODE.FORGOT ? MODE.LOGIN : MODE.SIGNUP
                )
              }
            >
              <Text style={styles.switchLink}>
                {mode === MODE.SIGNUP || mode === MODE.FORGOT ? 'Giriş Yap' : 'Hesap Oluştur'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={!!legalOpen}
        onClose={() => setLegalOpen(null)}
        title={legalOpen === 'terms' ? 'Kullanım Şartları' : 'Gizlilik Politikası'}
      >
        <Text style={styles.legalBody}>
          {legalOpen === 'terms' ? TERMS_TEXT : PRIVACY_TEXT}
        </Text>
      </BottomSheet>
    </SafeAreaView>
  );
};

const TERMS_TEXT = `ChequePass uygulamasını kullanarak aşağıdaki şartları kabul etmiş sayılırsın.

1. Uygulama; çiftler ve arkadaşlar arasında eğlence amaçlı "hediye çeki" mekaniği sunar. Çeklerin gerçek parasal değeri yoktur.

2. Hesap bilgilerinin güvenliğinden kullanıcı sorumludur. Kullanıcı adı ve e-posta doğruluğunu sağlamak kullanıcının yükümlülüğüdür.

3. Uygulama içi etkileşim (çek gönderme, pas geçme, not yazma) karşılıklı rızaya dayanır. Kullanıcılar birbirine saygılı davranmayı taahhüt eder.

4. Pas hakkı, reklam izleme karşılığında kazanılabilir. Üçüncü taraf reklam ağlarının şartları ayrıca geçerlidir.

5. Uygulama, önceden haber vermeksizin özelliklerini güncelleyebilir veya kaldırabilir.

6. Kötüye kullanım tespit edilen hesaplar askıya alınabilir.

Bu şartları ayrıntılı olarak okuman önerilir.`;

const PRIVACY_TEXT = `Gizliliğine saygı duyuyoruz.

- Hangi verileri toplarız: kullanıcı adı, e-posta, uygulama içi etkileşim verileri (çek geçmişi, notlar, başarılar).

- Neden toplarız: hesabını yönetmek, eşleşme özelliğini sunmak ve deneyimini kişiselleştirmek için.

- Nerede saklanır: Firebase altyapısında şifreli olarak saklanır.

- Üçüncü taraflar: Yalnızca reklam gösterimi için AdMob servisi cihaz düzeyinde anonim tanımlayıcılara erişebilir.

- Haklarınız: Hesap silme, veri dışa aktarma ve düzeltme taleplerinizi profil ekranından iletebilirsin.

- İletişim: privacy@chequepass.app`;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  header: { paddingTop: SPACING.sm, paddingBottom: SPACING.lg },
  hero: { alignItems: 'center', paddingVertical: SPACING.lg },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  form: { gap: 12 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 54,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...SHADOW.soft,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
  },
  statusMsg: {
    fontFamily: FONTS.medium,
    fontSize: 11.5,
    paddingHorizontal: 6,
    marginTop: -6,
  },
  forgotBtn: { alignSelf: 'flex-end', padding: 4 },
  forgotText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  submitBtn: {
    backgroundColor: COLORS.text,
    borderRadius: RADIUS.pill,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    ...SHADOW.medium,
  },
  submitText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: '#fff',
  },
  legalLine: {
    fontFamily: FONTS.regular,
    fontSize: 11.5,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 6,
  },
  legalLink: {
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    textDecorationLine: 'underline',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.lg,
  },
  switchText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  switchLink: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.text,
  },
  legalBody: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 22,
  },
});

export default AuthScreen;