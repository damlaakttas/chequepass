# ChequePass

Çiftlerin ve arkadaşların oyun/iddia sonrası birbirine "çek" pasladığı eğlenceli platform.

## Kurulum

### 1. Bağımlılıkları yükle
```bash
npm install --legacy-peer-deps
```

### 2. Firebase ayarla
`src/services/firebase.ts` dosyasını aç ve `firebaseConfig` objesini Firebase konsolundaki değerlerle doldur.

### 3. Fontları ekle
`assets/fonts/` klasörüne şu dosyaları koy (Google Fonts'tan indirilebilir):
- CormorantGaramond-Bold.ttf
- CormorantGaramond-SemiBold.ttf
- DMSans-Light.ttf
- DMSans-Regular.ttf
- DMSans-Medium.ttf
- DMSans-SemiBold.ttf

### 4. Görselleri ekle
`assets/images/` klasörüne:
- icon.png (1024x1024)
- splash.png (1284x2778)
- adaptive-icon.png (1024x1024)
- notification-icon.png (96x96, beyaz ikon, şeffaf arka plan)

### 5. Uygulamayı başlat
```bash
npx expo start -c
```

Expo Go ile QR kodu tara → iPhone/Android'de aç.

## Production Build (App Store / Google Play)

```bash
# EAS CLI kur
npm install -g eas-cli

# Giriş yap
eas login

# Build al
eas build --platform ios
eas build --platform android
```

## Proje Yapısı

```
chequepass/
├── app/
│   ├── (auth)/          # Giriş, kayıt, şifremi unuttum
│   └── (tabs)/          # Ana sekmeler
├── src/
│   ├── theme/           # Renkler, tipografi, spacing
│   ├── types/           # TypeScript tipleri
│   ├── services/        # Firebase servisleri
│   ├── store/           # Zustand global state
│   └── components/      # Paylaşılan componentler
├── assets/
│   ├── fonts/           # Fontlar (manuel eklenmeli)
│   └── images/          # Görseller (manuel eklenmeli)
├── firestore.rules      # Firestore güvenlik kuralları
└── firestore.indexes.json
```

## Önemli Notlar

- `google-services.json` ve `GoogleService-Info.plist` dosyaları `.gitignore`'da — Firebase konsolundan indirip projeye ekle
- Expo SDK 54, React Native 0.76.x
