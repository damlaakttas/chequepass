# cpfix5.zip — ChequePass Revize 5 (Kesin Düzeltme)

11 dosya. Önceki main'in üstüne yazılır.

## Çözülen sorunlar

### 1. ✅ Giriş ekranı amblem **ortalı** (kesin çözüm)
Hero container'ı `width: 100% + alignItems: center + justifyContent: center` ile sıkı ortalandı.
AppLogo'nun içinde de `alignSelf: 'center'` yedek olarak var.
ScrollView `flexGrow: 1` ile dikey alanı kapsıyor.

Eğer hâlâ sola kayıyorsa **assets/amblem.png dosyanın kendi içinde sola kaymış olabilir** —
yani PNG'nin içinde sembol sola yapıştırılmış, sağında şeffaflık var. Bu durumda PNG'yi kontrol et:
amblem dosyası açıldığında sembol PNG'nin tam ortasında olmalı.

### 2. ✅ Header logo **görünür boyutta**
Logo container'ı **200×46 px** (önce 170×40 idi). Image `width: 100% + height: 100%` ile bu kutuyu doldurur.
"contain" sayesinde logo içeriği bozulmadan sığar — büyür, küçülmez.

Eğer hâlâ "minicik" gözüküyorsa logo dosyanın içinde çok şeffaf padding olabilir.
Bu durumda logo.png'yi kırparak (etrafındaki boşluğu silerek) tekrar kaydet — render bir anda büyür.

### 3. ✅ "Tekrar hoş geldin" → "Hoş geldin"
İlk kez giriş yapanı dışlayan ifade kaldırıldı. Hem yeni hem eski kullanıcı için doğal.

### 4. ✅ Genel UX
- Title artık sola hizalı, altında subtitle, gevşek aralıklarla
- Hero ile başlık arasına tatlı bir boşluk

## Önemli: Splash ekranındaki "ChequePass" yazısı
Görseldeki **"ChequePass" yazısı + "Building JavaScript bundle... 64%"** yazısı **Expo Go geliştirici modunun göstergesi**.
EAS Build (TestFlight) production build'inde **görünmez**. Geliştirme sırasında Expo Go'da görmek normal.
"Kamera" üst sol köşede de aynı şekilde — Expo Go'nun kamera kısayoluna geri butonu.

## İçerik (10 dosya + README)

```
app.json                            ← (cpfix4'ten aynı)
firestore.rules                     ← (cpfix4'ten aynı)
src/components/AppLogo.js           ← KESIN ÇÖZÜM: 200×46 header / 180×180 hero
src/components/ChequeCard.js        ← (cpfix4'ten aynı)
src/components/DeckCard.js          ← (cpfix4'ten aynı)
src/components/ScreenHeader.js      ← logo container'ı 60min height
src/context/AppContext.js           ← (cpfix4'ten aynı)
src/screens/AuthScreen.js           ← amblem ortalı + tatlı metinler
src/screens/ChequesScreen.js        ← (cpfix4'ten aynı)
src/screens/HomeScreen.js           ← (cpfix4'ten aynı)
src/screens/NotificationsScreen.js  ← (cpfix4'ten aynı)
src/services/firebase-service.js    ← (cpfix4'ten aynı)
```

## YÜKLEME — Mac

### 1. Git'in son hâline döndür
```bash
cd ~/Desktop/chequepass-1
git fetch origin
git reset --hard origin/main
git clean -fd
```

### 2. Logo dosyalarının orada olduğundan emin ol
```bash
ls assets/amblem.png assets/logo.png
```

### 3. Zip'i uygula
```bash
unzip -o ~/Downloads/cpfix5.zip -d /tmp/cpfix5-temp
cp -R /tmp/cpfix5-temp/. .
rm -rf /tmp/cpfix5-temp
```

### 4. Çalıştır (cache temizle - logo değişikliği için kritik)
```bash
npx expo start -c
```

> Telefonda Expo Go'yu kapat-aç ve QR'ı yeniden oku — eski JS bundle cache'lenmiş olabilir.

---

## Logo dosyası kontrol listesi

Eğer hâlâ amblem/logo küçük gözüküyorsa **dosyaların kendi yapısı** sorun olabilir.
Mac'inde dosyayı **Preview** uygulamasında açıp kontrol et:

### `assets/amblem.png` (giriş + mağaza ikonu)
- [ ] 2000×2000 kare boyut
- [ ] Sembol PNG'nin TAM ORTASINDA (sağa-sola-yukarı-aşağı eşit boşluk)
- [ ] Etrafında **çok fazla şeffaf alan yok** (max her bir tarafta toplam %10)

### `assets/logo.png` (sol üst yatay logo)
- [ ] Yatay format (örn 2000×500 veya 4:1 oran)
- [ ] Sembol + yazı yatayda dağılmış, etrafında çok boşluk yok
- [ ] Kareye yakınsa logo "minicik" görünür çünkü 200×46 kutuda kareyi sığdırmaya çalışır

**Logo dosyasında çok boşluk varsa:** Mac'te Preview ile aç → Tools → Crop ile etrafı kırp → kaydet. Sonra `npx expo start -c` ile yeniden başlat.

---

## Test Checklist

### Giriş ekranı
- [ ] Amblem **TAM ORTADA** — sağ-sol simetrik
- [ ] Title: "Hoş geldin" (login modu) — "Tekrar" yok
- [ ] Title sol hizalı, altında subtitle, hepsi temiz dururyor

### Header (tüm ekranlarda)
- [ ] Logo görünür boyutta (önceki "minicik" değil)
- [ ] Logo aynı yerde her sayfada
- [ ] Sağda friend switcher + "Tümünü oku" sığıyor

---

## Çalışırsa main'e push
```bash
git checkout -b revize-5
git add .
git commit -m "Revize 5: logo size + amblem center fix + auth copy"
git push origin revize-5

git checkout main
git merge revize-5
git push origin main
```
