# cpfix7.zip — Shuffle Sesi Ekleme

Kart karıştırma fazına (shuffle, 1.5 saniye) ses ekliyoruz.

## İçerik

```
src/utils/sound.js                  ← YENİ ses yöneticisi
assets/sounds/                       ← (içi boş klasör, mp3'ünü buraya koy)
```

Bu zip mevcut kodu **bozmuyor** — sadece tek bir yeni dosya ekliyor + sen elle 2 küçük değişiklik yapacaksın.

---

## SES DOSYASI HAZIRLIĞI

### Süre
**1.5 saniye** (shuffle süresi). 1.5-1.8 sn arası ideal, max 2 sn.

### Format
**mp3** (en iyi uyumlu).

### Düzenleme önerileri
- Son 200ms **fade-out** (yumuşak bitiş için)
- Volume tepe noktası -3 dB civarı (telefonda bozulma olmasın)

### Dosya adı
**`shuffle.mp3`** (kesinlikle bu isim, kod bunu arıyor)

---

## ADIM ADIM YÜKLEME

### 1. Git'in son hâlini çek
```bash
cd ~/Desktop/chequepass-1
git fetch origin
git reset --hard origin/main
git clean -fd
```

### 2. expo-av paketini kur
```bash
npx expo install expo-av
```

### 3. Zip'i uygula
```bash
unzip -o ~/Downloads/cpfix7.zip -d /tmp/cpfix7-temp
cp -R /tmp/cpfix7-temp/. .
rm -rf /tmp/cpfix7-temp
```

### 4. Ses dosyanı klasöre koy
Hazırladığın `shuffle.mp3`'ü şuraya kopyala:
```
~/Desktop/chequepass-1/assets/sounds/shuffle.mp3
```

Doğrula:
```bash
ls -la assets/sounds/
```

`shuffle.mp3` görünmeli.

### 5. HomeScreen.js'e import ekle

VS Code'da `src/screens/HomeScreen.js` aç. En üstteki **import bloğunun sonuna** (`import { pickRandom } from '../utils/helpers';` satırının altına) bunu ekle:

```js
import { playShuffleSound } from '../utils/sound';
```

### 6. HomeScreen.js'te startShuffle fonksiyonunda ses çağrısı ekle

Aynı dosyada `startShuffle` fonksiyonunu bul. Bu fonksiyonun **EN BAŞINDA** (ilk satırı `setPhase('shuffling');` olan yerin **HEMEN ÜSTÜNE**) bunu ekle:

```js
playShuffleSound();
```

Yani şöyle görünecek:

```js
const startShuffle = useCallback(() => {
  if (phase !== 'idle' || !activeFriend || cards.length === 0) return;
  playShuffleSound();   // ← YENİ EKLENEN SATIR
  setPhase('shuffling');
  // ... fonksiyonun geri kalanı aynı kalsın
```

Kaydet.

### 7. Çalıştır

```bash
npx expo start -c
```

> `-c` cache temizler. Yeni asset (mp3) eklediğin için önemli.

Telefonunda Expo Go ile aç → bir kart kopart → ses çalmalı.

> Not: **Expo Go'da ses çalmaz, çünkü iPhone sessizdeyse Expo Go default audio mode'u override etmez tam.** Gerçek EAS build'de düzgün çalışır. Lokal test için iPhone'u sessize alma, normal ses açık tut.

---

## EAS Build için commit + push

Test ettikten sonra:

```bash
git add .
git commit -m "Add shuffle sound effect"
git push origin main
```

Sonra:
```bash
# app.json'da buildNumber'ı 1 artır (örn 2 → 3)
eas build --platform ios --profile production
eas submit --platform ios --latest
```

TestFlight'a otomatik dağıtılır.

---

## Sorun çıkarsa

**Ses çalmıyor:**
1. Dosya gerçekten `assets/sounds/shuffle.mp3` yolunda mı? `ls assets/sounds/`
2. iPhone'da ses kısık veya sessize mi alınmış? (Gerçek build'de override eder, Expo Go'da etmez)
3. Metro log'unda `Shuffle sound failed: ...` hatası var mı? Hatayı bana yapıştır.

**"Cannot find module 'expo-av'":**
```bash
npx expo install expo-av
npx expo start -c
```

**Ses çok kısa/uzun:**
- Çok kısa: mp3'ünü 1.5-1.8 sn arasına uzat
- Çok uzun: `src/utils/sound.js`'deki `volume: 0.85` değerini ses bitmeden kart durduğunda erken kesmek için `stopShuffleSound()` çağırabilirsin. Ama 1.5 sn altında tutmak en kolay yol.

**Ses çok güçlü/zayıf:**
`src/utils/sound.js`'de:
```js
{ shouldPlay: true, volume: 0.85 }  // 0.0 (sessiz) - 1.0 (max)
```
`0.85`'i ayarla, kaydet, yenile.

---

## Çalışırsa

```bash
git add .
git commit -m "Shuffle sound effect"
git push origin main
```

Test build'i için TestFlight pipeline'ı (eas build + eas submit).
