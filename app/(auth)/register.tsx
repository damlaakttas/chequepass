import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { register } from '../../src/services/authService';
import { CpLogo }      from '../../src/components/shared/CpLogo';
import { CpButton }    from '../../src/components/shared/CpButton';
import { CpTextField } from '../../src/components/shared/CpTextField';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';

export default function RegisterScreen() {
  const router = useRouter();

  const [name,     setName]     = useState('');
  const [username, setUsername] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleRegister() {
    setError('');
    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setError('Tüm alanları doldur'); return;
    }
    if (password.length < 6) { setError('Şifre en az 6 karakter olmalı'); return; }
    setLoading(true);
    try {
      await register(email, password, name.trim(), username.trim());
      router.replace('/(tabs)/coupons');
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') setError('Bu e-posta zaten kayıtlı.');
      else setError('Kayıt olunamadı. Tekrar dene.');
    } finally {
      setLoading(false);
    }
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

            <View style={styles.logoWrap}>
              <CpLogo variant="auth" />
            </View>

            {/* Tab seçici */}
            <View style={styles.tabBar}>
              <TouchableOpacity style={styles.tabBtn} onPress={() => router.back()}>
                <Text style={styles.tabText}>Giriş Yap</Text>
              </TouchableOpacity>
              <View style={[styles.tabBtn, styles.tabBtnActive]}>
                <Text style={styles.tabTextActive}>Üye Ol</Text>
              </View>
            </View>

            <View style={styles.card}>
              <CpTextField
                label="Ad Soyad"
                placeholder="Adınız ve soyadınız"
                value={name}
                onChangeText={(t) => { setName(t); setError(''); }}
              />
              <CpTextField
                label="Kullanıcı Adı"
                placeholder="kullanici_adi"
                value={username}
                onChangeText={(t) => { setUsername(t.toLowerCase()); setError(''); }}
                autoCapitalize="none"
              />
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
                placeholder="En az 6 karakter"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                isPassword
              />

              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <CpButton label="Hesap Oluştur" onPress={handleRegister} loading={loading} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  tabBtnActive:  { backgroundColor: Colors.yellow },
  tabText:       { fontFamily: Typography.fontBodyMed, fontSize: 14, color: Colors.textMuted },
  tabTextActive: { color: Colors.textPrimary, fontFamily: Typography.fontBodyMed, fontSize: 14 },
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
});
