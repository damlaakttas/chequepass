// scripts/seed-decks.js
//
// Bu script Firestore'daki `decks` koleksiyonuna 3 destedeki tüm kartları yükler.
//
// Kullanım:
//   1. Firebase Console → Project Settings → Service accounts → Generate new private key
//   2. İndirilen JSON dosyasını şu klasöre koy: ./service-account.json (proje köküne)
//   3. Terminal'de: cd ~/Desktop/chequepass-1
//   4. Çalıştır: node scripts/seed-decks.js
//
// Script idempotent: tekrar çalıştırırsan kartları silip yeniden yazar.
// Yeni kart eklemek istediğinde bu dosyaya ekleyip yeniden çalıştırırsın.

const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ---- KART İÇERİKLERİ ----

// Tatlı pastel renk paleti (kart arka planları)
const COLORS = [
  '#add7c4', '#ebf381', '#fbcfe8', '#fde68a', '#c7d2fe',
  '#bae6fd', '#fecaca', '#ddd6fe', '#bbf7d0', '#fed7aa',
];
const c = (i) => COLORS[i % COLORS.length];

// === ARKADAŞ DESTESİ (50 kart) ===
const FRIEND_DECK = [
  { title: 'Kahve Günü', subtitle: 'Günün kahvesi senden! Benim seçeceğim mekanda, en sevdiğim kahveyi ısmarlıyorsun.' },
  { title: 'Gece Atıştırması', subtitle: 'Gece yarısı canım ne isterse (kokoreç, çiğköfte, dürüm) siparişler senin cüzdanından.' },
  { title: 'Tatlı Borcu', subtitle: 'Yemekten sonra yenilecek tatlıların hesabı tamamen sende.' },
  { title: 'Market Amelesi', subtitle: 'Kendi cebinden benim istediğim 3 abur cuburu alıp ayağıma getiriyorsun.' },
  { title: 'Ulaşım Sende', subtitle: 'Bugünkü taksi, dolmuş veya benzin masrafı sana ait.' },
  { title: 'İlk Turlar', subtitle: 'Mekana oturduğumuzda içilecek ilk içecekleri sen ısmarlıyorsun.' },
  { title: 'Sinema/Oyun Bileti', subtitle: 'Birlikte gideceğimiz ilk sinema, maç veya konserin bileti senden.' },
  { title: 'Yemek Kredisi', subtitle: 'Bu hafta içi bir gün öğle/akşam yemeğimi sen karşılıyorsun.' },
  { title: 'Kasa Benim', subtitle: 'Bugün gideceğimiz mekanı ben seçiyorum, hesap geldiğinde elini cebine sadece sen atıyorsun.' },
  { title: 'Zorunlu Hediye', subtitle: 'İnternette gördüğüm ve sana linkini attığım o ucuz ama gereksiz şeyi bana hediye olarak alıyorsun.' },
  { title: 'Özel Şoför', subtitle: 'Bugün direksiyonda sen varsın, ben nereye dersem itiraz etmeden oraya sürüyorsun.' },
  { title: 'Garsonum Ol', subtitle: 'Bugün evde/kafede oturduğum yerden kalkmıyorum, çay/su servisim tamamen sende.' },
  { title: 'Çantacı', subtitle: 'Bütün gün eşyalarımı, montumu veya alışveriş poşetlerimi sen taşıyorsun.' },
  { title: 'Temizlik İhalesi', subtitle: 'Evdeysek benim dağıttığım yeri toplama veya bulaşıkları yıkama görevi sende.' },
  { title: 'Kişisel Fotoğrafçı', subtitle: 'Ben "Tamam oldu" diyene kadar bıkmadan, 40 farklı açıdan fotoğrafımı çekeceksin.' },
  { title: 'Oyun Yamağı', subtitle: 'Konsolda/PC\'de oyun oynarken bana su, atıştırmalık ve peçete taşıma görevi sende.' },
  { title: 'Canlı Alarm', subtitle: 'Yarın sabah uyanmam gereken saatte beni arayıp zorla uyandırıyorsun. Uyuyakalırsam ceza katlanır.' },
  { title: 'Ayak İşleri', subtitle: 'Bugün çok üşendiğim 2 ufak işi (kargoya gitmek, birini aramak vb.) benim yerime sen hallediyorsun.' },
  { title: 'Sosyal Medya Asistanı', subtitle: 'Göndereceğim fotoğrafa en havalı caption\'ı (açıklama metnini) sen buluyorsun.' },
  { title: 'Hamallık', subtitle: 'Benim için ağır bir eşyayı (su damacanası, koli vb.) taşıma veya yerleştirme işini sen yapıyorsun.' },
  { title: 'Övgü Yağmuru', subtitle: 'Bana neden harika bir arkadaş olduğumu anlatan, 3 maddelik uzun bir mesaj atıyorsun.' },
  { title: 'Koşulsuz Destek', subtitle: 'Bugün ortamda anlattığım konu ne kadar saçma olursa olsun beni %100 desteklemek zorundasın.' },
  { title: 'Sırdaş', subtitle: 'Bugün kimseye anlatmadığın bir sırrını, derdini veya itirafını bana anlatıyorsun. Aramızda kalacak.' },
  { title: 'Geçmişe Yolculuk', subtitle: 'Birlikte yaşadığımız en komik veya en rezil anıyı ortamda detaylarıyla anlat.' },
  { title: 'VIP Dinleyici', subtitle: 'Anlatacağım bir derdi 15 dakika boyunca telefonu bırakıp can kulağıyla dinleyeceksin.' },
  { title: 'Ortak Düşman', subtitle: 'Benim gıcık olduğum kişiye bugün sen de gıcık oluyorsun, objektif olmak yasak.' },
  { title: 'İtibar Suikastine Son', subtitle: 'Bugün diğer arkadaşlarımızın yanında beni gömmek veya eski defterleri açmak yasak.' },
  { title: 'Dürüstlük Saati', subtitle: 'Bende sevmediğin veya acilen düzeltmemi istediğin bir huyumu dürüstçe söyle.' },
  { title: 'Wingman/Wingwoman', subtitle: 'Gözüme kestirdiğim biriyle tanışmam için ortamı bugün sen ayarlıyorsun.' },
  { title: 'Teselli Kredisi', subtitle: 'Bugün moralim bozuksa beni neşelendirmek için ekstra çaba sarf etme görevi sende.' },
  { title: 'Telefon Ruleti', subtitle: 'Telefonunu 1 dakikalığına, ekran kilidi açık şekilde bana veriyorsun. Sadece bir şeye bakıp vereceğim.' },
  { title: 'Rezil Story', subtitle: 'Sosyal medyada 24 saatliğine benim seçeceğim en utanç verici/komik fotoğrafını paylaşıyorsun.' },
  { title: 'Kötü Şöhret', subtitle: 'Bir sonraki buluşmamızda benim seçeceğim, sana hiç yakışmayan en rüküş kıyafetle geleceksin.' },
  { title: 'Amigo', subtitle: 'Bugün ben ne söylersem söyleyeyim, yanımda abartılı bir şekilde alkışlayıp "Adamsın/Kraliçesin" diyeceksin.' },
  { title: 'Köle İsmi', subtitle: 'Bugün sana gerçek adınla değil, benim taktığım komik bir lakapla sesleneceğim. Tepki vermek yasak.' },
  { title: 'Utanç Mesajı', subtitle: 'Rehberinden benim rastgele seçeceğim birine, yine benim yazacağım tuhaf bir mesajı atacaksın.' },
  { title: 'Eski Defterler', subtitle: 'En eski eski sevgilinin Instagram\'da bir fotoğrafını beğenmek zorundasın.' },
  { title: 'Köpek Taklidi', subtitle: 'Bugün bana itiraz ettiğin ilk an, 10 saniye boyunca havlamak zorundasın.' },
  { title: 'Absürt Vokal', subtitle: 'Ortam sessizken aniden en absürt şarkıyı yüksek sesle söylemeye başla.' },
  { title: 'Alın Yazısı', subtitle: 'Bugün buluştuğumuzda elinin üstüne tükenmez kalemle benim seçeceğim komik bir kelimeyi yazacaksın.' },
  { title: 'Bağlamsız Yorum', subtitle: 'Instagram\'da ana sayfana düşen ilk 3 fotoğrafın altına alakasız yorumlar yazıyorsun.' },
  { title: 'İğrenç Selfie', subtitle: 'Kamerayı en aşağıdan, gıdının çıkacağı şekilde aç, en iğrenç selfie\'ni çek ve seçtiğim 3 kişiye at.' },
  { title: 'Tat Testi', subtitle: 'Benim seçeceğim, senin en nefret ettiğin yemeği bir lokma da olsa tadacaksın.' },
  { title: 'İfşa Saati', subtitle: 'Telefonunun galerisindeki en son çekilen 10 fotoğrafı/videoyu bana gösteriyorsun.' },
  { title: 'Susma Orucu', subtitle: 'Önümüzdeki 15 dakika boyunca tek kelime etmek yasak. Bana derdini sadece mimiklerle anlatacaksın.' },
  { title: '"Evet" Günü', subtitle: 'Önümüzdeki 1 saat boyunca benden gelecek hiçbir soruya "Hayır" diyemezsin.' },
  { title: 'Fiziksel Eziyet', subtitle: 'Hemen şimdi 20 şınav veya 30 squat çekiyorsun. Mızmızlanırsan sayı artar.' },
  { title: 'Sosyal Medya Detoksu', subtitle: 'Buluşmamız bitene kadar telefonuna dokunmak tamamen yasak.' },
  { title: 'Son Arama', subtitle: 'Telefonunun arama geçmişinden 3. kişiyi arayıp 1 dakika havadan sudan konuş.' },
  { title: 'Açık Çek', subtitle: 'Bu çeki kazanan taraf, kuralları tamamen kendi koyduğu yepyeni bir görev icat etme hakkına sahiptir!' },
];

// === SEVGİLİ DESTESİ (50 kart - tatlı/romantik ama açık değil) ===
const PARTNER_DECK = [
  { title: 'Kahve Ismarlama', subtitle: 'Bugün kahveler senden! En sevdiğim kahveyi alıp bana getiriyorsun.' },
  { title: 'Akşam Yemeği', subtitle: 'Bu akşam yemeğin hesabı sende. Mekan seçiminde itiraz hakkın yok.' },
  { title: 'Tatlı Krizi', subtitle: 'Canım tatlı çekti! Bana en sevdiğim tatlıyı ısmarlıyorsun.' },
  { title: 'Sinema Bileti', subtitle: 'Bir sonraki sinema randevumuzda biletler ve mısırlar senin cüzdanından çıkıyor.' },
  { title: 'Abur Cubur Sepeti', subtitle: 'Dizi gecesi için marketten abur cubur alışverişini sen yapıyorsun.' },
  { title: 'Kahvaltı Borcu', subtitle: 'Pazar kahvaltısını sen ısmarlıyorsun (ister dışarıda, ister eve sipariş).' },
  { title: 'Sokak Lezzeti', subtitle: 'Gece yarısı canım ne isterse bana ısmarlama borcun var.' },
  { title: 'Sürpriz Kutu', subtitle: 'Bana fiyatı önemli olmayan, ufak ama tatlı bir sürpriz hediye alıyorsun.' },
  { title: 'İlk İçecekler', subtitle: 'Bir sonraki dışarı çıkışımızda ilk içecekler senden.' },
  { title: 'Paket Servis', subtitle: 'Akşam yemeği için eve sipariş veriyorsun, hesap sende.' },
  { title: 'Bulaşık Muafiyeti', subtitle: 'Bugün bulaşık sırası veya makineyi boşaltma görevi tamamen sende.' },
  { title: 'Çöp Atma Görevi', subtitle: 'Bu haftanın çöp atma sorumlusu resmen sensin. Mızmızlanmak yok!' },
  { title: 'Özel Şoför', subtitle: 'Bir sonraki buluşmamızda beni sen bırakıyorsun/alıyorsun.' },
  { title: 'Kahvaltı Servisi', subtitle: 'Sabah kahvaltımı hazırlayıp yatağıma veya masaya kadar getiriyorsun.' },
  { title: 'Temizlik Günü', subtitle: 'Evin veya odanın toparlanmasında bana itirazsız yardım ediyorsun.' },
  { title: 'Ayak Masajı', subtitle: 'Günün yorgunluğunu atmam için bana 15 dakikalık bir ayak masajı yapıyorsun.' },
  { title: 'Omuz Masajı', subtitle: 'Telefonu bırak, omuzlarıma 10 dakika boyunca masaj yap.' },
  { title: 'Uyanma Servisi', subtitle: 'Yarın sabah beni en tatlı halinle (belki bir kahveyle) sen uyandırıyorsun.' },
  { title: 'Çamaşır Katlama', subtitle: 'Yıkanan çamaşırları asma veya katlama görevi bu seferlik sende.' },
  { title: 'Alışveriş Taşıyıcısı', subtitle: 'Bir sonraki market alışverişinde tüm poşetleri sen taşıyorsun.' },
  { title: 'Uzun Sarılma', subtitle: 'Şu an ne yapıyorsan bırak ve bana 2 dakika boyunca sımsıkı sarıl.' },
  { title: 'İltifat Yağmuru', subtitle: 'Bana neden aşık olduğunu anlatan 3 farklı ve içten şey söyle.' },
  { title: 'Profil Fotoğrafı', subtitle: 'Birlikte çekildiğimiz en sevdiğim fotoğrafı 24 saatliğine WhatsApp profil fotoğrafın yapıyorsun.' },
  { title: 'Sosyal Medya İlanı', subtitle: 'Instagram hikayende benim en güzel çıktığım bir fotoğrafı tatlı bir notla paylaş.' },
  { title: 'Müzik Kutusu', subtitle: 'Benim için, bana olan hislerini anlatan bir şarkı seçip gönderiyorsun.' },
  { title: 'Aşk Mektubu', subtitle: 'Bana hislerini anlatan kısa ama çok içten bir not/mesaj yazıyorsun.' },
  { title: 'Göz Teması', subtitle: '1 dakika boyunca hiç konuşmadan, sadece gözlerimin içine bakacaksın.' },
  { title: 'El Ele Yürüyüş', subtitle: 'Telefonları cebe atıyoruz, en az 30 dakika boyunca el ele yürüyüşe çıkıyoruz.' },
  { title: 'İlk Buluşma Anısı', subtitle: 'Bana ilk tanıştığımız gün ne hissettiğini detaylıca anlat.' },
  { title: 'Romantik Dans', subtitle: 'Odanın ortasında, benim seçeceğim yavaş bir şarkıda benimle dans edeceksin.' },
  { title: 'Kumanda Hakimiyeti', subtitle: 'Bu akşam ne izleyeceğimize tamamen ben karar veriyorum. İtiraz yasak.' },
  { title: 'Şarkı Seçimi', subtitle: 'Arabada veya evde müzik dinlerken DJ tamamen benim. Şarkı atlamak yasak.' },
  { title: 'Haklılık Payı', subtitle: 'Konu ne olursa olsun, bir sonraki ufak tartışmamızda "Sen haklısın hayatım" demek zorundasın.' },
  { title: 'Telefon Molası', subtitle: 'Bu çeki kullandığım an, 1 saat boyunca telefonunu sessize alıp kenara bırakıyorsun.' },
  { title: 'Geç Hazırlanma Hakkı', subtitle: 'Bir sonraki buluşmamızda hazırlanmam uzun sürerse trip atmak veya acele ettirmek yasak.' },
  { title: 'Oyun Molası', subtitle: 'Konsolda oyun oynarken bu çeki gösterdiğimde oyunu anında durdurup benimle ilgileniyorsun.' },
  { title: 'Ne İstersen', subtitle: 'Bugün yapacağımız aktiviteyi tamamen ben belirliyorum, sen sadece uyum sağlıyorsun.' },
  { title: 'Alttan Alma Kredisi', subtitle: 'Bugün biraz huysuz olabilirim, beni şımartma ve alttan alma görevi sende.' },
  { title: 'İstediğim Mekan', subtitle: 'Bir sonraki dışarı çıkışımızda gideceğimiz mekanı sadece ben seçiyorum.' },
  { title: 'Sorgusuz İzin', subtitle: 'Bir kereliğine, sana açıklama yapmadan "sadece öyle istediğim için" bir şeyi yapma hakkım var.' },
  { title: 'Şarkı Söyleme', subtitle: 'En sevdiğim şarkıyı bana sesli mesaj olarak şarkı söyleyerek atacaksın.' },
  { title: 'Komik Fotoğraf', subtitle: 'Galerinden en komik/utanç verici fotoğrafını bana atıyorsun.' },
  { title: 'Masal Anlatıcısı', subtitle: 'Bu gece uyumadan önce bana kendi uydurduğun tatlı bir masal anlatacaksın.' },
  { title: 'Kötü Espri', subtitle: 'Beni güldürene kadar art arda en kötü "soğuk esprilerini" yapacaksın.' },
  { title: 'Taklit Yeteneği', subtitle: 'Benim en sık kullandığım mimiği veya cümleyi kullanarak beni taklit et.' },
  { title: 'Kombin Seçimi', subtitle: 'Yarın buluşurken ne giyeceğini ben seçiyorum.' },
  { title: 'Emoji Yasağı', subtitle: 'Bugün bana atacağın mesajlarda emoji kullanmak yasak! Sadece kelimelerle.' },
  { title: 'Şive Görevi', subtitle: 'Önümüzdeki 10 dakika boyunca benim seçeceğim komik bir şiveyle konuşmak zorundasın.' },
  { title: 'Sürpriz Plan', subtitle: 'Bu hafta sonu için bana sürpriz bir program planlıyorsun.' },
  { title: 'Rövanş Hakkı', subtitle: 'Bu çeki kazanan kişi, kaybettiği herhangi bir iddia için sorgusuz "Rövanş" talep edebilir!' },
];

// === ROMANTIK DESTESİ (Premium) (30 kart) ===
const ROMANTIC_DECK = [
  { title: 'Sürpriz Kıyafet', subtitle: 'Bir sonraki buluşmamızda kıyafetimin altına ne giyeceğimi sen seçeceksin.' },
  { title: 'Gizli İtiraf', subtitle: 'Yarın gün içinde bana en tutkulu hayalini mesaj at; akşam onu gerçeğe dönüştürelim.' },
  { title: 'Tahammül Testi', subtitle: 'Bu çeki kullandığında, 10 dakika boyunca bana dokunmak yasak. Sadece izleyip heyecanı artıracağız.' },
  { title: 'Parça Parça', subtitle: 'Şu an üzerimdeki kıyafetlerden birini hemen şimdi çıkarıyorum. Hangisi olacağını sen seç.' },
  { title: 'Oyun Kurucusu', subtitle: 'Senin için özel bir dans yapacağım. Şarkıyı ve tempoyu sen belirle.' },
  { title: 'İtiraf Vakti', subtitle: 'Bana en çok denemek istediğin ama söylemeye çekindiğin o şeyi söyle; bu gece yapalım.' },
  { title: 'Sabırsızlık', subtitle: 'Akşam eve geldiğimiz an, kapıdan içeri girer girmez beni duvara yaslayıp öpeceksin.' },
  { title: 'Gözler Bağlı', subtitle: 'Gözlerim bağlı... Geceyi nasıl yönlendireceğin tamamen senin hayal gücüne kalmış.' },
  { title: 'Kusursuz İtaat', subtitle: 'Bu gece kontrol tamamen bende. Ne istersem itirazsız yapmak zorundasın.' },
  { title: 'Sözsüz Anlaşma', subtitle: 'Önümüzdeki 1 saat boyunca benim ellerimi kullanmam yasak.' },
  { title: 'Sadece Evet', subtitle: 'Gece boyunca bana vereceğin cevaplarda "Hayır" kelimesini kullanmak yasak.' },
  { title: 'Özel Kurallar', subtitle: 'Şimdi bir "Güvenli Kelime" belirliyoruz. O kelimeyi söyleyene kadar kuralları tamamen sen koyuyorsun.' },
  { title: 'Seçim Senin', subtitle: 'Üzerimden bir parçayı sadece kendi seçeceğin bir yöntemle çıkarma hakkı kazandın.' },
  { title: 'Kuklacı', subtitle: 'Sıradaki 3 uzun öpücüğün yerini ben belirliyorum, itiraz hakkın yok.' },
  { title: 'Sınırları Aşan Masaj', subtitle: 'Bu gece bana unutulmaz bir yağ masajı yapma borcun var. Nereye dokunacağın tamamen sana kalmış.' },
  { title: 'Dudakların Gücü', subtitle: 'İstediğin bir bölgeye 5 dakika boyunca sadece dudaklarınla dokunabilirsin.' },
  { title: 'Eller Serbest', subtitle: 'Bu gece ellerini hiç kullanmadan beni ne kadar heyecanlandırabileceğini göster.' },
  { title: 'Buzun Ateşi', subtitle: 'Bedenimde bir buz küpünü eritme görevi kazandın. Neresi olacağını tamamen sen seçiyorsun.' },
  { title: 'Uzun İzler', subtitle: 'Boynumdan başlayarak aşağı doğru inen yavaş ve tutkulu bir öpücük serisi hak ettim.' },
  { title: 'Tatlı Ceza', subtitle: 'Bana ellerinle bir tatlı yedir. Bulaşan kısımları dudaklarınla temizlemek senin görevin.' },
  { title: 'Duş Terapisi', subtitle: 'Duşa beraber giriyoruz ve bu sefer beni baştan aşağı yıkama görevi tamamen sende.' },
  { title: 'Mekan Değişikliği', subtitle: 'Bu gece yatak odasının dışında, evin bugüne kadar hiç denemediğimiz bir köşesini deniyoruz.' },
  { title: 'Sıcak Köpükler', subtitle: 'Birlikte mum ışığında, sadece ikimizin olduğu uzun bir küvet veya duş keyfi.' },
  { title: 'Tutkulu Şef', subtitle: 'Benim için özel bir atıştırmalık hazırla. Ancak mutfakta üzerinde sadece önlük olabilir.' },
  { title: 'Fısıltılar', subtitle: '15 dakika boyunca kulağıma beni neden arzuladığını fısılda, ben sadece gözlerim kapalı dinleyeceğim.' },
  { title: 'Dış Dünyaya Kapalı', subtitle: 'Bu gece televizyon, telefon ve saat yasak. Sadece birbirimize odaklanıyoruz.' },
  { title: 'İlham Perisi', subtitle: 'Senin seçeceğin romantik bir film sahnesini izleyeceğiz ve aynısını biz deneyeceğiz.' },
  { title: 'Sabah Şekeri', subtitle: 'Bu çeki sakla; yarın sabah beni en kışkırtıcı şekilde uyandırmak için kullanacaksın.' },
  { title: 'Rastgele Tutku', subtitle: 'Beni evin neresinde veya hangi işi yaparken görürsen gör, aniden yanıma gelip tutkuyla öpeceksin.' },
  { title: 'Şimdi, Hemen!', subtitle: 'Bu çeki okuduğun an her şeyi bırak! Karşılığında hemen şimdi tüm ilgini bana ver.' },
];

async function seedDeck(deckId, cards) {
  console.log(`\nSeeding ${deckId} deck (${cards.length} cards)...`);
  const collRef = db.collection('decks').doc(deckId).collection('cards');

  // Önce mevcut tüm kartları sil
  const snap = await collRef.get();
  const batch1 = db.batch();
  snap.docs.forEach((doc) => batch1.delete(doc.ref));
  if (snap.size > 0) {
    await batch1.commit();
    console.log(`  Deleted ${snap.size} old cards`);
  }

  // Yenilerini batch'le yaz
  const batch2 = db.batch();
  cards.forEach((card, i) => {
    const cardRef = collRef.doc(`card_${String(i + 1).padStart(3, '0')}`);
    batch2.set(cardRef, {
      title: card.title,
      subtitle: card.subtitle,
      color: c(i),
      order: i,
      active: true,
    });
  });
  await batch2.commit();
  console.log(`  ✓ ${cards.length} cards written to decks/${deckId}/cards`);

  // Üst dokümana metadata
  await db.collection('decks').doc(deckId).set({
    name: deckId,
    cardCount: cards.length,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function main() {
  try {
    await seedDeck('friend', FRIEND_DECK);
    await seedDeck('partner', PARTNER_DECK);
    await seedDeck('romantic', ROMANTIC_DECK);
    console.log('\n✅ All decks seeded successfully!');
    process.exit(0);
  } catch (e) {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  }
}

main();
