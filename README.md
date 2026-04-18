# ChequePass

Çiftlerin ve arkadaşların oyun sonrası kazananın uygulamadan bir "hediye çeki" çekip partnerine hediye ettiği, kendine aldığı veya pas geçtiği eğlenceli bir mobil uygulama.

## 🚀 Kurulum

### 1. Bağımlılıkları yükle

```bash
cd ChequePass
npm install
```

### 2. Expo CLI yoksa kur

```bash
npm install -g expo-cli
# veya Expo 51 ile çalışmak için npx yeterli
```

### 3. Uygulamayı başlat

```bash
npx expo start
```

### 4. Telefonunda test et
- **iOS**: App Store'dan **Expo Go** indir → terminaldeki QR kodu kamera ile tara
- **Android**: Play Store'dan **Expo Go** indir → Expo Go içindeki "Scan QR Code" ile tara

## 📁 Klasör Yapısı

```
ChequePass/
├── App.js                          # Ana giriş - Font + Provider + Navigator
├── app.json                        # Expo config
├── babel.config.js                 # Reanimated plugin
├── package.json
└── src/
    ├── theme/
    │   └── theme.js                # Renkler, fontlar, spacing, shadow
    ├── context/
    │   └── AppContext.js           # Merkezi state (AsyncStorage tabanlı)
    ├── utils/
    │   └── helpers.js              # Tarih formatlama, random, vb.
    ├── components/
    │   ├── AppLogo.js              # Sol üst logo + marka
    │   ├── AnimalAvatar.js         # 6 vektörel hayvan avatarı
    │   ├── ScreenHeader.js         # Header + arkadaş switcher
    │   ├── ChequeCard.js           # ⭐ Swipeable çek kartı (Reanimated)
    │   ├── OnboardingOverlay.js    # İlk kullanımda yönlendirme
    │   └── BottomSheet.js          # Legal/modal sheet
    ├── screens/
    │   ├── AuthScreen.js           # Login / Signup / Forgot
    │   ├── HomeScreen.js           # ⭐ Swipe mekaniği
    │   ├── ChequesScreen.js        # 2 sekmeli liste + detay
    │   ├── NotificationsScreen.js  # Bildirim listesi
    │   ├── FriendsScreen.js        # Arkadaş yönetimi
    │   └── ProfileScreen.js        # Profil + başarılar
    └── navigation/
        └── RootNavigator.js        # Custom bottom tab + stack
```

## 🎨 Tema

| Renk | Kod |
|------|-----|
| Birincil | `#add7c4` |
| İkincil | `#ebf381` |
| Arkaplan | `#f0e9e9` |

Font: **Poppins** (Regular / Medium / SemiBold / Bold)

İkonografi: **Lucide** (vektörel, premium). Emoji kullanılmamıştır.

## 🕹️ Swipe Mekaniği

- **Yukarı kaydır** → Çeki aktif arkadaşa hediye et 🎁
- **Aşağı kaydır** → Çeki kendine al 📥
- **Sola kaydır** → Pas geç (1 ücretsiz hak / sonrası ödüllü reklam)

## 🔥 Firebase'e Geçiş

Şu an proje **AsyncStorage** üzerinde çalışıyor (Expo Go'da anında test için). Firebase'e geçmek için:

1. `npm install firebase` çalıştır
2. `src/context/AppContext.js` içindeki `signIn`, `signUp`, `resolveCheque` vb. fonksiyonlarını Firebase çağrılarıyla değiştir:
   - `signIn` → `signInWithEmailAndPassword`
   - `signUp` → `createUserWithEmailAndPassword` + `sendEmailVerification`
   - State persistlerini `firestore.collection('cheques').onSnapshot(...)` ile değiştir
3. `src/config/firebase.js` oluştur ve credentials'ı koy
4. AdMob için: `expo install expo-ads-admob` (EAS Build gerekir, Expo Go'da çalışmaz)

## 📱 Build & Yayın

```bash
# EAS Build kurulumu
npm install -g eas-cli
eas login
eas build:configure

# iOS build
eas build -p ios

# Android build
eas build -p android
```

## ✨ Özellikler

- ✅ Cross-platform (iOS + Android + Web)
- ✅ Poppins font + premium UI
- ✅ Reanimated 3 ile 60fps swipe animasyonları
- ✅ Çoklu arkadaş + hızlı switcher
- ✅ Partner/Friend ayrımı
- ✅ Not sistemi (çek detaylarında düzenlenebilir)
- ✅ Başarı/Achievement sistemi
- ✅ Vektörel hayvan avatarları
- ✅ Bottom sheet modal sistemi
- ✅ AsyncStorage persist
- ✅ Onboarding overlay
- ✅ Responsive (tüm cihaz boyutları)
- ✅ Pixel overflow yok (SafeArea + Expanded doğru kullanıldı)

## 🧑‍💻 Yazar

ChequePass © 2026
