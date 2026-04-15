import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { signIn } from '../../src/services/authService';
import { CpLogo }      from '../../src/components/shared/CpLogo';
import { CpButton }    from '../../src/components/shared/CpButton';
import { CpTextField } from '../../src/components/shared/CpTextField';
import { LegalSheet }  from '../../src/components/shared/LegalSheet';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();

  // Tab state (Giriş / Üye Ol) + slide animasyonu
  const [tab, setTab]     = useState<'login' | 'register'>('login');
  const slideAnim         = useRef(new Animated.Value(0)).current;

  const switchTab = (next: 'login' | 'register') => {
    if (tab === next) return;
    Animated.timing(slideAnim, {
      toValue:         next === 'register' ? 1 : 0,
      duration:        250,
      useNativeDriver: true,
    }).start();
    setTab(next);
    if (next === 'register') router.push('/(auth)/register');
  };

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const [legalType, setLegalType]       = useState<'terms' | 'privacy'>('terms');
  const [legalVisible, setLegalVisible] = useState(false);

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password) { setError('E-posta ve şifre gerekli'); return; }
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)/coupons');
    } catch (e: any) {
      setError(parseError(e.code));
    } finally {
      setLoading(false);
    }
  }

  function parseError(code: string) {
    if (code === 'auth/user-not-found')    return 'Bu e-posta ile kayıtlı hesap yok.';
    if (code === 'auth/wrong-password')    return 'Şifre hatalı.';
    if (code === 'auth/too-many-requests') return 'Çok fazla deneme. Lütfen bekleyin.';
    return 'Giriş yapılamadı. Tekrar dene.';
  }

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.bg}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            {/* Logo */}
            <View style={styles.logoWrap}>
              <CpLogo variant="auth" />
            </View>

            {/* Tab seçici */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabBtn, tab === 'login' && styles.tabBtnActive]}
                onPress={() => switchTab('login')}
              >
                <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>
                  Giriş Yap
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, tab === 'register' && styles.tabBtnActive]}
                onPress={() => switchTab('register')}
              >
                <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>
                  Üye Ol
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.card}>
              <CpTextField
                label="E-posta"
                placeholder="ornek@email.com"
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <CpTextField
                label="Şifre"
                placeholder="••••••••"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                isPassword
              />

              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity onPress={() => router.push('/(auth)/forgot')} style={styles.forgotWrap}>
                <Text style={styles.forgotText}>Şifremi Unuttum?</Text>
              </TouchableOpacity>

              <CpButton label="Giriş Yap" onPress={handleLogin} loading={loading} />

              {/* Hukuki metinler */}
              <Text style={styles.legal}>
                Devam ederek{' '}
                <Text style={styles.legalLink} onPress={() => { setLegalType('terms'); setLegalVisible(true); }}>
                  Kullanım Şartları
                </Text>
                {' '}ve{' '}
                <Text style={styles.legalLink} onPress={() => { setLegalType('privacy'); setLegalVisible(true); }}>
                  Gizlilik Politikası
                </Text>
                {'\'nı kabul etmiş olursunuz.'}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <LegalSheet
        visible={legalVisible}
        type={legalType}
        onClose={() => setLegalVisible(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg:       { flex: 1 },
  safe:     { flex: 1 },
  scroll:   { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  logoWrap: { alignItems: 'center', marginTop: 32, marginBottom: 28 },

  tabBar: {
    flexDirection:   'row',
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    padding:         4,
    marginBottom:    24,
  },
  tabBtn: {
    flex:            1,
    height:          40,
    borderRadius:    Radius.md,
    alignItems:      'center',
    justifyContent:  'center',
  },
  tabBtnActive: { backgroundColor: Colors.yellow },
  tabText:      { fontFamily: Typography.fontBodyMed, fontSize: 14, color: Colors.textMuted },
  tabTextActive:{ color: Colors.textPrimary },

  card: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    shadowColor:     '#fac5cd',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.25,
    shadowRadius:    20,
    elevation:       6,
  },

  errorBox: {
    backgroundColor: 'rgba(231,76,60,0.08)',
    borderRadius:    Radius.sm,
    padding:         Spacing.sm,
    marginBottom:    Spacing.sm,
    borderWidth:     1,
    borderColor:     'rgba(231,76,60,0.2)',
  },
  errorText: { fontFamily: Typography.fontBody, fontSize: 13, color: Colors.error },

  forgotWrap: { alignSelf: 'flex-end', marginBottom: Spacing.md },
  forgotText: { fontFamily: Typography.fontBodyMed, fontSize: 13, color: Colors.brand },

  legal: {
    fontFamily: Typography.fontBody,
    fontSize:   11,
    color:      Colors.textMuted,
    textAlign:  'center',
    marginTop:  Spacing.md,
    lineHeight: 17,
  },
  legalLink: { color: Colors.brand, fontFamily: Typography.fontBodyMed },
});
