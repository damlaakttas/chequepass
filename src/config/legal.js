// src/config/legal.js
//
// Kullanım Şartları ve Gizlilik Politikası metinleri.
// Hem AuthScreen (kayıt) hem ProfileScreen (hesap) tarafından kullanılır.
//
// ÖNEMLİ: Apple, beyan ile uygulamanın davranışını karşılaştırır. Uygulamaya
// bir SDK eklenip metin güncellenmezse (veya tersi) inceleme reddedilebilir.
// Şu an kapsananlar: AdMob ödüllü reklam, RevenueCat satın alma, mesajlaşma.

export const TERMS_TEXT = `ChequePass uygulamasını kullanarak aşağıdaki şartları kabul etmiş sayılırsın.

1. Uygulama; çiftler ve arkadaşlar arasında eğlence amaçlı "hediye çeki" mekaniği sunar. Çeklerin gerçek parasal değeri yoktur.

2. Hesap bilgilerinin güvenliğinden kullanıcı sorumludur. Kullanıcı adı ve e-posta doğruluğunu sağlamak kullanıcının yükümlülüğüdür.

3. Uygulama içi etkileşim (çek gönderme, pas geçme, not yazma) karşılıklı rızaya dayanır. Kullanıcılar birbirine saygılı davranmayı taahhüt eder.

4. Günlük ücretsiz pas hakkı 24 saatte bir yenilenir; uygulama ayrıca bonus pas hakkı tanımlayabilir.

5. "Romantik Paket" tek seferlik uygulama içi satın almadır; ödeme Apple App Store üzerinden gerçekleşir ve Apple'ın satın alma koşullarına tabidir.

6. Uygulama, önceden haber vermeksizin özelliklerini güncelleyebilir veya kaldırabilir.

7. Kötüye kullanım tespit edilen hesaplar askıya alınabilir.

8. MESAJLAŞMA VE KULLANICI İÇERİĞİ
Uygulama, eşleştiğin arkadaşlarınla birebir mesajlaşma imkânı sunar. Gönderdiğin mesajların içeriğinden yalnızca sen sorumlusun.

Aşağıdakiler kesinlikle yasaktır ve sıfır tolerans uygulanır:
- Taciz, hakaret, nefret söylemi, tehdit veya şiddet çağrısı
- Reşit olmayan kişileri konu alan ya da hedef alan her türlü içerik
- İzinsiz özel bilgi paylaşımı, spam ve dolandırıcılık
- Yasa dışı içerik

Uygunsuz ifade içeren mesajlar otomatik olarak engellenir. Herhangi bir mesaja uzun basarak şikayet edebilir, sohbet menüsünden kullanıcıyı engelleyebilirsin. Engellediğin kişi sana mesaj gönderemez ve seni dürtemez; engeli Profil > Engellenen kullanıcılar bölümünden kaldırabilirsin.

Şikayetler en geç 24 saat içinde incelenir. Kuralları ihlal eden içerik kaldırılır ve ilgili hesap uyarılır, askıya alınır veya kalıcı olarak kapatılır.

Şikayet ve destek için: destek@chequepass.app

Bu şartları ayrıntılı olarak okuman önerilir.`;

export const PRIVACY_TEXT = `Gizliliğine saygı duyuyoruz.

- Hangi verileri toplarız: kullanıcı adı, e-posta, uygulama içi etkileşim verileri (çek geçmişi, notlar, başarılar).

- Neden toplarız: hesabını yönetmek, eşleşme özelliğini sunmak ve deneyimini kişiselleştirmek için.

- Nerede saklanır: Google Firebase altyapısında saklanır.

- Üçüncü taraflar: Satın alma işlemleri Apple App Store ve RevenueCat altyapısı üzerinden yürütülür.

- Reklamlar: Günlük ücretsiz pas hakkın bittiğinde, ekstra pas kazanmak için Google AdMob üzerinden ÖDÜLLÜ reklam izlemeyi seçebilirsin. Reklam izlemek tamamen isteğe bağlıdır; izlemezsen pas hakkın 24 saat içinde zaten yenilenir.

  Gösterilen reklamlar KİŞİSELLEŞTİRİLMEMİŞTİR. Seni takip etmiyoruz, reklam kimliğini (IDFA) kullanmıyoruz ve reklam verenlerle kişisel verilerini paylaşmıyoruz. AdMob, reklam gösterimi ve sahtecilik önleme amacıyla cihaz türü ve yaklaşık konum (ülke) gibi teknik bilgileri işleyebilir. Google'ın uygulamaları için: policies.google.com/technologies/partner-sites

- Mesajlaşma: Arkadaşlarınla gönderdiğin mesajlar Firebase'de saklanır ve yalnızca sohbetin iki tarafı okuyabilir. Şikayet edilen mesajlar inceleme amacıyla ayrıca kaydedilir.

- Haklarınız: Hesabını ve tüm verilerini Profil ekranındaki "Hesabı Sil" seçeneğiyle kalıcı olarak silebilirsin. Veri dışa aktarma ve düzeltme taleplerin için bizimle iletişime geçebilirsin.

- İletişim: privacy@chequepass.app`;
