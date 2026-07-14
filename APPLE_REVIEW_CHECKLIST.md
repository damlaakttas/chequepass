# Apple Review — Yeniden Gönderim Kontrol Listesi (v1.0, build 4)

## Kodda yapılan değişiklikler (tamamlandı ✓)

- **Hesap silme (5.1.1(v))**: Profil → "Hesabı Sil" → uyarı + şifre → onay → Auth hesabı,
  profil, kullanıcı adı, arkadaşlıklar ve tüm çekler kalıcı silinir, kullanıcı giriş ekranına düşer.
- **Firestore rules**: kullanıcının kendi verisini silebilmesi için izinler güncellendi (`firestore.rules`).
- **Sahte reklam akışı kaldırıldı**: "Reklam İzle & Pas Kazan" → "Bonus Pas Kullan" (reklam SDK'sı
  olmadığı için yanıltıcı işlevsellik reddi riskini kaldırır).
- **Hard-coded fiyat kaldırıldı**: Paywall artık RevenueCat'ten gelen yerelleştirilmiş StoreKit
  fiyatını gösteriyor; sahte üstü çizili indirim fiyatı silindi.
- **Yasal metinler**: reklam/AdMob referansları temizlendi (`src/config/legal.js`), Profil ekranına
  Kullanım Şartları + Gizlilik Politikası erişimi eklendi.
- **buildNumber**: 3 → 4.

## SENİN yapman gerekenler (sırayla)

1. **Firestore rules deploy** — atlanırsa hesap silme "permission denied" verir:
   ```
   npx firebase-tools deploy --only firestore:rules --project chequepass-app-ae4af
   ```
   (Gerekirse önce `npx firebase-tools login`. Alternatif: Firebase Console → Firestore →
   Rules sekmesine `firestore.rules` içeriğini yapıştır → Publish.)

2. **Yeni build + test**: `eas build --platform ios --profile production`
   Gerçek cihazda tam silme akışını test et (yanlış şifre senaryosu dahil).

3. **Ekran kaydı** (Apple'ın açık isteği) — fiziksel iPhone'da çek:
   - Demo hesapla giriş yap
   - Profil sekmesi → "Hesabı Sil"
   - Şifre gir → onay → hesabın silinip giriş ekranına düşüşü
   Kaydı App Store Connect → App Review Information → **Notes** alanına ekle
   (dosya yüklenemiyorsa Google Drive/iCloud linki koy).

4. **Demo hesap**: Review notlarına **e-postası doğrulanmış** hazır bir hesap yaz
   (uygulama e-posta doğrulaması zorunlu tutuyor; reviewer kendi açarsa doğrulayamaz).
   İdealde iki eşleşmiş demo hesap ver ki çek gönderme de test edilebilsin.

5. **App Store Connect kontrolleri**:
   - Privacy Policy URL dolu mu?
   - App Privacy beyanı doğru mu? (E-posta adresi, kullanıcı adı, satın alım geçmişi —
     "linked to user"; reklam/tracking YOK)
   - Age rating: romantik içerik nedeniyle en az 12+, tercihen 16+/17+
     (Mature/Suggestive Themes) işaretle.

6. Yeni build'i yükle, aşağıdaki yanıtı App Review mesajına yapıştır, gönder.

## App Review'a yanıt taslağı (İngilizce, kopyala-yapıştır)

> Hello,
>
> Thank you for your review. We have addressed Guideline 5.1.1(v) in build 4:
>
> The app now offers full in-app account deletion. Users can navigate to
> Profile → "Hesabı Sil" (Delete Account), confirm with their password, and the
> account is permanently deleted — including the Firebase Auth account, user
> profile, username, friendships, and all cheque data. This is a permanent
> deletion, not a deactivation, and it is completed entirely within the app
> with no customer service contact required.
>
> A screen recording captured on a physical device demonstrating sign-in,
> navigation to the deletion option, and the complete deletion flow has been
> added to the Notes field of the App Review Information section.
>
> Demo account (email already verified):
> Email: [DEMO_EMAIL]
> Password: [DEMO_PASSWORD]
>
> Please let us know if you need anything else.

`[DEMO_EMAIL]` / `[DEMO_PASSWORD]` alanlarını doldurmayı unutma.

## Başka revize gelir mi? — Risk durumu

| Konu | Durum |
|---|---|
| Hesap silme (5.1.1v) | ✓ Çözüldü |
| Restore purchases (3.1.1) | ✓ Zaten vardı |
| Sign in with Apple (4.8) | Gerekmiyor (sadece e-posta/şifre, 3. taraf login yok) |
| Sahte reklam akışı (2.1/2.3.1) | ✓ Kaldırıldı |
| Hard-coded fiyat | ✓ Dinamik fiyata geçildi |
| App Privacy beyanı | ⚠ App Store Connect'te senin kontrolün gerekiyor |
| Age rating | ⚠ Senin kontrolün gerekiyor |
| iPad görünümü (2.4.1) | ⚠ iPad Air simülatöründe bir kez gez (supportsTablet: true) |
| Demo hesap girişi | ⚠ Doğrulanmış demo hesap şart |
