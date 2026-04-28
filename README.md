# cpfix2.zip — ChequePass Refactor

Bu paket önceki sürümün üstüne çıkar ve şu sorunları çözer:

## Çözülen sorunlar

1. ✅ **Permission denied — arkadaş ekleme**
   - Sebep: Firestore rules'ta `allow read: if ...userIds...` kuralı, var olmayan friendship doc'una `getDoc()` çağrısı yapıldığında patlıyor (resource boş, kontrol fail).
   - Çözüm: `allow get: if isAuth() && (resource == null || ...)` — boş doc'a izin ver. Cheques için de aynısı.

2. ✅ **Bildirim sırası ve "şimdi" zamanı**
   - Sebep: Bildirimler local state'teydi, logout-login sonrası `Date.now()` ile yeniden yazılıyordu → her bildirim "şimdi" gözüküyordu.
   - Çözüm: Bildirim listesi artık tamamen **Firestore + local pas event'lerinden TÜRETİLİR** (useMemo). Zamanlar `cheques.createdAt` (server timestamp) ve `friendships.createdAt`'ten gelir. Sıralama `desc` garantili.

3. ✅ **Bildirim tek tek okunabilir**
   - Her bildirime tıklayınca o bildirim okundu olarak işaretlenir. Ayrıca ekran 1.5 sn açık kalırsa hepsi otomatik okunur.
   - "Okundu" durumu ayrı AsyncStorage key'inde tutuluyor (`@chequepass_read_v1`); logout sonrası bile korunuyor.

4. ✅ **Karşı tarafın çekleri bildirimde**
   - Cheque listener'ı `cheques` koleksiyonundan tüm çek tiplerini bildirim olarak türetiyor: gelen hediye, gönderdiğin hediye, kendine aldığın, karşı taraf kendine aldı, pas geçtin.

5. ✅ **Avatar değişikliği kalıcı**
   - Avatar artık Firestore'a yazılıyor (cihazlar arası senkron + logout sonrası kalıcı).

6. ✅ **Pas hakkı 24 saat sonra otomatik yenilenir**
   - Son pas zamanı kaydediliyor, 24 saat geçince hidrasyonda `freePassUsed = false` set ediliyor.

7. ✅ **Mantık iyileştirmeleri**
   - ChequesScreen sekme adları: "Bana Ait" / "Onun" + kullanılmamış sayı badge.
   - Çek detayında "kim hediye etti / kim aldı" net etiketle gösteriliyor.
   - "Çeki kullandım" butonu sadece kullanılmamış çek için ve sadece sahibi için.
   - "Not düzenle" butonu kullanılmış çekte gizli (mantıken artık değiştirilemez).
   - Empty state'ler arkadaş yokken / çek yokken iyileştirildi.
   - Arkadaş silme onayında "geçmiş kayıt edilir, ilişki silinir" notu.
   - "İstekler" sekmesinde bekleyen sayı için kırmızı badge.
   - HomeScreen'de not modal başlığı yön'e göre değişiyor: "@arkadaş'a hediye edeceksin" / "Çeki kendine alacaksın".
   - ProfileScreen istatistik etiketleri daha net: "Sana Ait" / "Hediye Ettin" / "Arkadaş".

## İçerik (11 dosya)

```
firestore.rules                     ← Firebase Console'a yapıştır + Publish (KRİTİK)
firestore.indexes.json              ← local kopya
src/services/firebase-service.js    ← updateUserAvatar eklendi
src/context/AppContext.js           ← Bildirim TÜRETİLMİŞ + pas yenileme + avatar Firestore
src/screens/HomeScreen.js
src/screens/ChequesScreen.js
src/screens/NotificationsScreen.js
src/screens/FriendsScreen.js
src/screens/ProfileScreen.js
src/components/BottomSheet.js
src/utils/helpers.js
```

## YÜKLEME — Mac

### 1. Önce git'in son hâline döndür (mevcut local değişiklikler silinir)

```bash
cd ~/Desktop/chequepass-1
git status                       # neyin değiştiğini gör
git fetch origin
git reset --hard origin/main
git clean -fd
```

### 2. Zip'i uygula

```bash
unzip -o ~/Downloads/cpfix2.zip -d /tmp/cpfix2-temp
cp -R /tmp/cpfix2-temp/. .
rm -rf /tmp/cpfix2-temp
```

### 3. Doğru yere yazıldığını kontrol et

```bash
ls firestore.rules src/services/firebase-service.js src/context/AppContext.js
```

Üçü de listelenmeli.

### 4. ⚠️ KRİTİK — Firebase Console'da rules'u yayınla

Bu adım atlanırsa **arkadaş ekleme permission-denied verir!**

1. https://console.firebase.google.com → projen → **Firestore Database** → **Rules** sekmesi
2. Mevcut tüm kuralları **sil**
3. VS Code'dan `firestore.rules` dosyasının **tüm içeriğini** kopyala-yapıştır
4. **"Yayınla"** (Publish) butonu → 5-10 saniye bekle

### 5. Çalıştır

```bash
cd ~/Desktop/chequepass-1
npx expo start -c
```

Telefonda Expo Go'dan QR'ı oku.

---

## Test Checklist

### Arkadaş ekleme
- [ ] Arkadaş ekle modal'ında geçerli kullanıcı adı gir → permission-denied OLMAMALI
- [ ] İstek gönderildi mesajı gözükür
- [ ] İki cihazda test et: B'nin "İstekler" sekmesinde A görünür, kabul edince A'nın listesinde B çıkar
- [ ] "İstekler" sekme adında kırmızı badge sayısı doğru

### Bildirimler
- [ ] Çek alıp gönderince bildirim badge sayısı artar ve **kalıcı** kalır (örnek: 1, 2, 3)
- [ ] Bildirimler ekranı açılınca 1.5 sn sonra otomatik okundu işaretlenir
- [ ] Tek bir bildirime tıklayınca sadece o okundu olur, diğerleri kalır
- [ ] Bildirimde zaman doğru: "şimdi" → "1 dk önce" → "5 dk önce"
- [ ] En yeni en üstte sıralı
- [ ] Logout-login sonrası bildirimler kaybolmaz, zamanları doğru kalır

### Çekler
- [ ] Hediye et: A'nın bildirimine "Hediye gönderildi", B'ye "Yeni çek geldi 🎁"
- [ ] Kendine al: bildirimde "Yeni çek kazandın", karşı tarafa "Karşı taraf çek aldı"
- [ ] Pas: bildirimde "Pas geçildi"
- [ ] ChequesScreen "Bana Ait" sekmesinde sadece kullanılmamış çekler için badge sayısı
- [ ] Çek detayında "@kullaniciadi hediye etti" / "Sen @kullaniciadi'a hediye ettin" net görünür
- [ ] Çek detayında "Çeki Kullandım" basınca durum güncellenir, "kullanıldı" badge'i çıkar
- [ ] Kullanılmış çekte "Düzenle" ve "Çeki Kullandım" butonları görünmez

### Profil
- [ ] Avatar değiştir → uygulamayı kapat-aç → avatar değişiklik korunur
- [ ] Stats: "Sana Ait" sayısı = bana ait toplam çek; "Hediye Ettin" = ben yolladığım
- [ ] Logout → login → çekler ve avatar duruyor

### Pas
- [ ] İlk pas ücretsiz, ikincisi reklam modalı çıkarır
- [ ] Reklam izle → pas hakkı yenilenir
- [ ] (Manuel test) 24 saat sonra ücretsiz pas hakkı yenilenir

---

## Çalışırsa main'e push

```bash
cd ~/Desktop/chequepass-1
git checkout -b step-3-final
git add .
git commit -m "Step 3 final: refactor notifications, fix permissions, polish UX"
git push origin step-3-final

# main'e merge:
git checkout main
git merge step-3-final
git push origin main
```

## Sorun çıkarsa

Metro log'unu paylaş. Özellikle:
- "permission-denied" varsa → rules yayınlandı mı kontrol et
- "index required" → Metro log'undaki linke tıkla, Create Index, 1-2 dk bekle
