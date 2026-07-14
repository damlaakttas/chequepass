// src/config/legal.js
//
// Kullanım Şartları ve Gizlilik Politikası metinleri.
// Hem AuthScreen (kayıt) hem ProfileScreen (hesap) tarafından kullanılır.
// NOT: Uygulamada reklam SDK'sı YOK; bu yüzden metinlerde reklam/AdMob
// referansı bulunmaz (Apple, uygulamayla eşleşmeyen beyanları sorun eder).

export const TERMS_TEXT = `ChequePass uygulamasını kullanarak aşağıdaki şartları kabul etmiş sayılırsın.

1. Uygulama; çiftler ve arkadaşlar arasında eğlence amaçlı "hediye çeki" mekaniği sunar. Çeklerin gerçek parasal değeri yoktur.

2. Hesap bilgilerinin güvenliğinden kullanıcı sorumludur. Kullanıcı adı ve e-posta doğruluğunu sağlamak kullanıcının yükümlülüğüdür.

3. Uygulama içi etkileşim (çek gönderme, pas geçme, not yazma) karşılıklı rızaya dayanır. Kullanıcılar birbirine saygılı davranmayı taahhüt eder.

4. Günlük ücretsiz pas hakkı 24 saatte bir yenilenir; uygulama ayrıca bonus pas hakkı tanımlayabilir.

5. "Romantik Paket" tek seferlik uygulama içi satın almadır; ödeme Apple App Store üzerinden gerçekleşir ve Apple'ın satın alma koşullarına tabidir.

6. Uygulama, önceden haber vermeksizin özelliklerini güncelleyebilir veya kaldırabilir.

7. Kötüye kullanım tespit edilen hesaplar askıya alınabilir.

Bu şartları ayrıntılı olarak okuman önerilir.`;

export const PRIVACY_TEXT = `Gizliliğine saygı duyuyoruz.

- Hangi verileri toplarız: kullanıcı adı, e-posta, uygulama içi etkileşim verileri (çek geçmişi, notlar, başarılar).

- Neden toplarız: hesabını yönetmek, eşleşme özelliğini sunmak ve deneyimini kişiselleştirmek için.

- Nerede saklanır: Google Firebase altyapısında saklanır.

- Üçüncü taraflar: Satın alma işlemleri Apple App Store ve RevenueCat altyapısı üzerinden yürütülür. Verilerin reklam amaçlı hiçbir üçüncü tarafla paylaşılmaz.

- Haklarınız: Hesabını ve tüm verilerini Profil ekranındaki "Hesabı Sil" seçeneğiyle kalıcı olarak silebilirsin. Veri dışa aktarma ve düzeltme taleplerin için bizimle iletişime geçebilirsin.

- İletişim: privacy@chequepass.app`;
