# cpfix6.zip — ChequePass Premium + RevenueCat + TestFlight Hazırlık

Bu sürüm uygulamayı **TestFlight çıkışına hazırlıyor**:

✓ Romantik kart paketi (Premium IAP — şimdilik mock)
✓ Firestore tabanlı kart yönetimi (CMS gibi, build gerektirmez)
✓ 3 ayrı kart destesi: Arkadaş (50), Sevgili (50), Romantik (30)
✓ Çift taraflı ilişki türü değiştirme (Sevgili ↔ Arkadaş)
✓ Paywall ekranı + konfeti animasyonu
✓ RevenueCat altyapısı (production'a geçince tek satır flag yeterli)

## DEĞIŞEN/YENİ DOSYALAR (15 + script + rules + app.json)

```
App.js                              ← PremiumProvider sarmalama
app.json                            ← (değişmedi)
firestore.rules                     ← decks read-only kuralı
scripts/seed-decks.js               ← YENİ - kartları Firestore'a yükle
src/components/AppLogo.js           ← (değişmedi)
src/components/ChequeCard.js        ← (değişmedi)
src/components/DeckCard.js          ← (değişmedi)
src/components/PaywallSheet.js      ← YENİ - premium satın alma ekranı
src/components/ScreenHeader.js      ← (değişmedi)
src/context/AppContext.js           ← deck listener + updateFriendRelation + variant
src/context/PremiumContext.js       ← YENİ - RevenueCat sarmalayıcı (mock)
src/screens/AuthScreen.js           ← (değişmedi)
src/screens/ChequesScreen.js        ← (değişmedi)
src/screens/FriendsScreen.js        ← Sevgili paywall + relation edit modal
src/screens/HomeScreen.js           ← deste switcher + kilitli ikon
src/screens/NotificationsScreen.js  ← (değişmedi)
src/screens/ProfileScreen.js       ← kırmızı premium banner
src/services/firebase-service.js    ← (değişmedi)
```

---

# YÜKLEME — Mac (sırayla yap, her adımı atla)

## ADIM 1 — Git'in son hâline döndür

```bash
cd ~/Desktop/chequepass-1
git fetch origin
git reset --hard origin/main
git clean -fd
```

## ADIM 2 — Yeni paketleri kur

```bash
cd ~/Desktop/chequepass-1
npx expo install expo-blur
npm install react-native-confetti-cannon
npm install --save-dev firebase-admin
```

`expo-blur` paywall blur efekti için.
`react-native-confetti-cannon` satın alma sonrası konfeti için.
`firebase-admin` sadece seed script için (kart yükleme).

> Hata alırsan: `npm install --legacy-peer-deps` ile dene.

## ADIM 3 — Zip'i uygula

```bash
unzip -o ~/Downloads/cpfix6.zip -d /tmp/cpfix6-temp
cp -R /tmp/cpfix6-temp/. .
rm -rf /tmp/cpfix6-temp
```

## ADIM 4 — Doğrula

```bash
ls App.js src/context/PremiumContext.js src/components/PaywallSheet.js scripts/seed-decks.js
```

Dördü de listelenmeli.

## ADIM 5 — Firebase rules'u güncelle

1. https://console.firebase.google.com → projen → **Firestore Database** → **Rules**
2. Mevcut tüm kuralları sil
3. VS Code'dan `firestore.rules` içeriğini kopyala-yapıştır
4. **Yayınla** → 5-10 sn bekle

## ADIM 6 — Kartları Firestore'a yükle (CMS gibi)

### 6a) Service account JSON'unu indir

1. https://console.firebase.google.com → projen → **Project Settings (dişli ikon)** → **Service accounts** sekmesi
2. **"Generate new private key"** butonuna bas → indirilen JSON dosyasını **proje köküne** kopyala (yani `~/Desktop/chequepass-1/service-account.json` olarak)
3. ⚠️ **ÖNEMLİ:** Bu dosyayı **git'e commit ETME**! `.gitignore`'a ekle:

```bash
echo "service-account.json" >> .gitignore
```

### 6b) Seed script'i çalıştır

```bash
node scripts/seed-decks.js
```

Çıktı:
```
Seeding friend deck (50 cards)...
  ✓ 50 cards written to decks/friend/cards
Seeding partner deck (50 cards)...
  ✓ 50 cards written to decks/partner/cards
Seeding romantic deck (30 cards)...
  ✓ 30 cards written to decks/romantic/cards
✅ All decks seeded successfully!
```

> İlerde kart eklemek istersen: `scripts/seed-decks.js` içindeki array'lere ekle, sonra script'i tekrar çalıştır. Apple review beklemen GEREKMEZ — kartlar anında kullanıcıların ekranında belirir.

### 6c) Firebase Console'da kontrol et

Firestore Database → **decks** koleksiyonu görünmeli, içinde 3 belge: `friend`, `partner`, `romantic`. Her birinin altında `cards` alt koleksiyonu olmalı.

## ADIM 7 — Çalıştır

```bash
npx expo start -c
```

`-c` cache temizler.

---

# Test Checklist

### Premium yokken (mock)

- [ ] Ana ekran: "Şansını dene, çekini kopart" yazısı altında **kırmızı kilitli "Romantik Paket"** butonu var
- [ ] Butona basınca **paywall** açılır (3 blurlu kart yelpazesi + fiyat)
- [ ] Paywall'da "Kilidi Aç" → 800ms sonra **konfeti animasyonu** + paywall kapanır
- [ ] Sonrası: ana ekrandaki kilitli buton gitmiş, yerine **"Normal / Romantik" switcher** geldi
- [ ] Switcher'da Romantik seçince → kart içerikleri romantik destesinden gelir

### Tetikleyici 1: FriendsScreen
- [ ] Yeni arkadaş ekleme modal'ında **Sevgili** seç → **kırmızı paywall** açılır (sadece **bir kez**)
- [ ] İkinci sevgili ekleme denediğinde paywall **AÇILMAZ** (tekrar gösterilmez)
- [ ] Paywall kapatınca sevgili olarak ekleyebilirsin (ödeme yapmadan da)

### Tetikleyici 2: ProfileScreen
- [ ] Profilim ekranında istatistik kartları + başarılar arasında **kırmızı banner**: "Romantik Kartları Keşfet"
- [ ] Tıklayınca paywall açılır
- [ ] Premium varsa banner yerine **yeşil "Romantik Paket Aktif ✓"** görünür

### Tetikleyici 3: HomeScreen
- [ ] Yukarıdaki kilitli buton — paywall açar

### İlişki türü değiştirme
- [ ] Arkadaşlar listesinde her arkadaş yanında **kalem ikonu** var
- [ ] Tıklayınca modal açılır: Sevgili / Arkadaş seç
- [ ] Seçince Firestore'da güncellenir, **iki kullanıcının cihazında da** aynı şekilde görünür
- [ ] Sevgili → Arkadaş'a geçişte kart destesi otomatik değişir

### Kart desteleri
- [ ] Arkadaş ilişkisinde "Arkadaş Kartları" gözükür
- [ ] Sevgili ilişkisinde "Sevgili Kartları" (Premium yoksa)
- [ ] Premium varsa Sevgili'de Normal/Romantik seçimi yapılabilir
- [ ] Kart koparıldığında Firestore'dan rastgele kart gelir (her shuffle farklı)

### Mock'u sıfırlamak (test için)
Tarayıcı console'unda VEYA test sırasında uygulamayı silip yeniden kurarak mock state'i sıfırlarsın. Veya geliştirme amaçlı `usePremium` hook'undaki `resetMockPremium` fonksiyonu çağrılabilir.

---

# 🚀 EAS BUILD + TESTFLIGHT (mock'tan gerçek IAP'e geçiş)

Test başarılıysa şimdi gerçek satın almaya geçeceğiz. Bu kısım **tek seferlik kurulum** + her sürümde tekrarlanan **3 komut**.

## A) Ön gereksinimler (1 kez)

### A1) Apple Developer hesabı
- https://developer.apple.com/programs/enroll/ → kayıt + $99/yıl + 24-48 saat onay bekle
- Onay gelince App Store Connect'te **My Apps → +** ile yeni app oluştur
  - **Name:** ChequePass (alınmış olabilir, "ChequePass App" gibi varyasyon dene)
  - **Bundle ID:** `com.berkyilmaz.chequepass` (kendi adına göre — sonradan değiştirilemez)
  - **SKU:** chequepass-001

### A2) RevenueCat hesabı
- https://app.revenuecat.com/signup
- **New Project** oluştur
- iOS ekle: bundle ID'yi yaz (Apple'daki ile aynı olmalı)
- **Project API Keys → Public SDK Key** kopyala (`appl_...` ile başlar)

### A3) App Store Connect'te IAP product oluştur
- App Store Connect → senin uygulamana git → **Features → In-App Purchases** → **+**
- **Type:** Non-Consumable (tek seferlik satın alım)
- **Reference Name:** Romantic Pack
- **Product ID:** `chequepass.romantic.lifetime` ← **ÇOK ÖNEMLI: aynen bu olmalı**
- **Pricing:** 99.99 TRY (Tier seçimi)
- Açıklama, ekran görüntüsü ekle

### A4) RevenueCat'te entitlement + offering tanımla
- RevenueCat dashboard → **Entitlements → +**
  - Identifier: `romantic_pack`
- **Products → +** → App Store'dan import veya manuel ekle: `chequepass.romantic.lifetime`
- Bu ürünü `romantic_pack` entitlement'ına bağla
- **Offerings → Default Offering** → bu paketi ekle

### A5) EAS CLI ve project init
```bash
npm install -g eas-cli
eas login
cd ~/Desktop/chequepass-1
eas init
```

`eas init` `app.json`'a project ID ekler, git'e commit'le.

### A6) Bundle ID'yi `app.json`'da ayarla
```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.berkyilmaz.chequepass"
}
```

### A7) `react-native-purchases` paketini ekle
```bash
npm install react-native-purchases
```

### A8) PremiumContext'te production'a geç
`src/context/PremiumContext.js` → şu satırı değiştir:
```js
const USE_REVENUECAT = true; // ← false'tan true'ya
```

Ve API key'i koy (RevenueCat dashboard'dan):
```js
await Purchases.configure({
  apiKey: 'appl_xxxxxxxxxxxxxxxxx', // ← buraya RevenueCat public SDK key
});
```

### A9) `eas.json` oluştur (proje kökünde)
```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

### A10) İlk build
```bash
eas build:configure
eas build --platform ios --profile preview
```

Build cloud'da çalışır (~15-25 dk). Apple sertifikalarını otomatik oluşturur (Apple ID şifresi ister).

### A11) TestFlight'a yükle
```bash
eas submit --platform ios --latest
```

Apple ID + **app-specific password** ister (https://appleid.apple.com'dan oluştur).
Yükleme 5-10 dk sürer. App Store Connect → TestFlight'ta görürsün.

### A12) Test kullanıcılarını ekle
- App Store Connect → TestFlight → Internal Testing → grup oluştur → email ekle
- Test kullanıcıları telefonlarına **TestFlight** uygulamasını yükler → davet linkine basar → ChequePass yüklenir

### A13) Sandbox IAP test
- App Store Connect → Users and Access → **Sandbox Testers** → yeni hesap oluştur
- Telefonda Settings → App Store → Sign Out
- ChequePass'ı aç → satın al → Sandbox hesabıyla giriş yap (gerçek para çekilmez)
- Konfeti çıkması gerekir, "Romantik Paket Aktif" görünür

## B) Sonraki sürümlerde (kısa süreçli)

```bash
# 1) app.json'da buildNumber'ı 1 artır
# 2) Build al
eas build --platform ios --profile preview

# 3) TestFlight'a yükle
eas submit --platform ios --latest
```

Toplam: ~30 dk. Test kullanıcılarına otomatik update bildirimi gider.

---

# Apple Review Notu (önemli)

Romantik kart içerikleri **bazı kartlarda flörtöz/yetişkin** ifadeler içeriyor. Apple review aşamasında:

1. **Age Rating:** uygulamayı 17+ olarak kategorize et (App Store Connect → App Information)
2. **Description:** "intimate gestures and romantic challenges for couples" gibi nötr dil kullan
3. **Apple gerekçeli reddederse:** `scripts/seed-decks.js` içindeki ROMANTIC_DECK kartlarını yumuşatıp tekrar yükle (build gerekmez!)

---

## Sorun çıkarsa

- **"Cannot find module 'expo-blur'"** → `npx expo install expo-blur`
- **"firebase-admin not found"** → `npm i -D firebase-admin`
- **"Permission denied" seed script'te** → service-account.json yanlış yerde, proje köküne koy
- **Kartlar görünmüyor uygulamada** → Adım 6 (seed) yapılmamış. Console → Firestore Database → `decks/friend/cards` boşsa script çalıştır.
- **"Romantik Paket Aktif" görünmüyor satın alma sonrası** → uygulamayı kapat-aç (mock state initial'a yansır)

---

## Çalışırsa main'e push

```bash
git checkout -b revize-6-premium
git add .
git commit -m "Revize 6: premium IAP, Firestore decks, paywall, relation edit"
git push origin revize-6-premium

git checkout main
git merge revize-6-premium
git push origin main
```

> **service-account.json git'e gitmesin!** `.gitignore`'da olduğundan emin ol.
