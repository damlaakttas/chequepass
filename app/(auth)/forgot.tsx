import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { sendReset } from '../../src/services/authService';
import { CpButton }    from '../../src/components/shared/CpButton';
import { CpTextField } from '../../src/components/shared/CpTextField';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';

export default function ForgotScreen() {
  const router  = useRouter();
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  async function handle() {
    setError('');
    if (!email.trim()) { setError('E-posta adresi gerekli'); return; }
    setLoading(true);
    try {
      await sendReset(email);
      setSent(true);
    } catch {
      setError('E-posta gönderilemedi. Adresi kontrol et.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.container}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <Text style={styles.backText}>← Geri</Text>
            </TouchableOpacity>

            {sent ? (
              <View style={styles.card}>
                <Text style={styles.icon}>📬</Text>
                <Text style={styles.title}>E-posta Gönderildi</Text>
                <Text style={styles.body}>
                  Şifre sıfırlama bağlantısı {email} adresine gönderildi. Spam klasörünü de kontrol et.
                </Text>
                <CpButton
                  label="Giriş Ekranına Dön"
                  onPress={() => router.replace('/(auth)/login')}
                  variant="ghost"
                />
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.icon}>🔑</Text>
                <Text style={styles.title}>Şifreni Sıfırla</Text>
                <Text style={styles.body}>
                  Kayıtlı e-posta adresine sıfırlama bağlantısı göndereceğiz.
                </Text>
                <CpTextField
                  label="E-posta"
                  placeholder="ornek@email.com"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={error}
                />
                <CpButton label="Sıfırlama Linki Gönder" onPress={handle} loading={loading} />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.lg },
  back:      { marginTop: Spacing.md, marginBottom: Spacing.lg },
  backText:  { fontFamily: Typography.fontBodyMed, color: Colors.brand, fontSize: 15 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    gap:             Spacing.md,
    shadowColor:     '#fac5cd',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.25,
    shadowRadius:    20,
    elevation:       6,
  },
  icon:  { fontSize: 40, textAlign: 'center' },
  title: { ...Typography.h2, textAlign: 'center' },
  body:  { ...Typography.bodySm, textAlign: 'center', color: Colors.textSecondary },
});
