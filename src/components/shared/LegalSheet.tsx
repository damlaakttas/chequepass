import React from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { Colors, Typography, Radius, Spacing } from '../../theme';

const { height } = Dimensions.get('window');

interface Props {
  visible:  boolean;
  type:     'terms' | 'privacy';
  onClose:  () => void;
}

const TERMS = `Kullanım Şartları

ChequePass uygulamasını kullanarak aşağıdaki şartları kabul etmiş olursunuz.

1. Hizmet Kullanımı
Uygulama yalnızca kişisel, ticari olmayan amaçlarla kullanılabilir.

2. Hesap Sorumluluğu
Hesap güvenliğinizden siz sorumlusunuz. Şifrenizi kimseyle paylaşmayın.

3. İçerik Politikası
Diğer kullanıcılara zarar verecek içerik oluşturmak yasaktır.

4. Fikri Mülkiyet
ChequePass markası ve uygulama tasarımı telif hakkı ile korunmaktadır.

5. Değişiklikler
Bu şartları dilediğimiz zaman güncelleme hakkımızı saklı tutarız.`;

const PRIVACY = `Gizlilik Politikası

Kişisel verilerinizi nasıl işlediğimizi açıklayan politikamız.

1. Toplanan Veriler
Ad soyad, e-posta adresi ve uygulama kullanım verileri.

2. Veri Kullanımı
Verileriniz yalnızca hizmeti sunmak amacıyla kullanılır.

3. Üçüncü Taraflar
Verileriniz reklam amaçlı üçüncü taraflarla paylaşılmaz.

4. Güvenlik
Verileriniz Firebase güvenlik altyapısıyla korunmaktadır.

5. Haklarınız
Verilerinizi görme, düzeltme veya silme hakkına sahipsiniz.`;

export function LegalSheet({ visible, type, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>
            {type === 'terms' ? 'Kullanım Şartları' : 'Gizlilik Politikası'}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            <Text style={styles.content}>
              {type === 'terms' ? TERMS : PRIVACY}
            </Text>
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Anladım, Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent:  'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding:         Spacing.lg,
    maxHeight:       height * 0.75,
  },
  handle: {
    width:         40,
    height:        4,
    borderRadius:  2,
    backgroundColor: Colors.border,
    alignSelf:     'center',
    marginBottom:  Spacing.md,
  },
  title: {
    ...Typography.h2,
    marginBottom: Spacing.md,
  },
  scroll: { marginBottom: Spacing.md },
  content: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  closeBtn: {
    height:          52,
    borderRadius:    Radius.md,
    backgroundColor: Colors.brand,
    alignItems:      'center',
    justifyContent:  'center',
  },
  closeText: {
    fontFamily: Typography.fontBodySem,
    fontSize:   15,
    color:      '#fff',
  },
});
