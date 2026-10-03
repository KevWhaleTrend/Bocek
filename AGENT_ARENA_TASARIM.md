# Agent Arena — Oyun Tasarım Taslağı

## 1. Oyun özeti

Agent Arena, böcek ve uzaylı temalı sekiz karakterin kısa, turlu maçlarda karşılaştığı bir arena oyunudur. Her karakterin temel saldırısı, savunması ve bekleme süresi olan bir özel yeteneği bulunur. Maçlar önce deterministik oyun kurallarıyla çalışır; ajan kişilikleri anlatımı ve karar tercihlerini etkiler, sonuçları keyfî biçimde değiştirmez.

## 2. Temel savaş kuralları

- Her karakter HP, Attack, Defense, Speed ve Special değerlerine sahiptir. HP gerçek can puanıdır; diğer değerler göreli statlardır.
- Maç başında Speed değeri yüksek karakter başlar; eşitlikte oyuncu tarafı başlar.
- Her saldırı hedefin hızına bağlı kaçınma kontrolünden geçer: `min(%25, max(0, Speed - 4) × %3)`. Yavaşlatma Speed'i 2 düşürür.
- Temel saldırı ham hasarı `Attack + 2` olur. Savunma bunu `max(%60, 1 - Defense × %4)` katsayısıyla azaltır. Hasar 0,1 çözünürlükte hesaplanır ve en az 1 olur.
- Özel yeteneklerin karaktere özgü bekleme süresi ve etkisi vardır. Kritik olasılığı yalnızca Prism Beam için %20'dir.
- Zehir 3 tur boyunca tur başına 2 hasar verir; zırh ve Defense zehri azaltmaz. Yenilenen zehir birikmez, süresi yenilenir.
- Iron Carapace sonraki 2 doğrudan vuruşta hasarı %28 azaltır. Prism Beam normal Defense ve zırh azaltımını kısmen aşar.
- Xylith Phantom Leap ile bir sonraki saldırıya karşı %57 kaçınma şansı kazanır; Speed 4'ü aşan her puan şansı 2 puan artırır, üst sınır %80'dir. Başarılı kaçış 7 hasarlı karşı saldırı yapar; başarısız kaçışta gelen hasar yarıya iner.
- Web Snare hasar verip rakibin sonraki eylemini iptal eder. Sersemletme aynı anda yalnızca tek eylemi engeller.
- Xyvora Chaos Shift, 3 tur için rastgele bir saldırı/savunma/hız statını +5 ve farklı bir statı −1 değiştirir.
- HP sıfıra inince maç biter. 20 tur sonunda kalan HP oranı yüksek olan kazanır; eşitlik beraberliktir.
## 3. Karakter kadrosu

### 🦂 Xerion — Zehirli akrep

**Rol:** Zehir ve uzun maç baskısı  
**Kişilik:** Soğukkanlı, sinsi ve ölçülü. Kısa cümlelerle konuşur; tehdit savurmak yerine rakibin zayıf anını bekler.  
**Oyun planı:** Zehir uygular, rakibin hızını düşürür ve güvenli mesafede temel saldırılarla baskıyı sürdürür.  
**Özel — Venom Strike:** 6 doğrudan hasar verir; ardından 3 tur boyunca tur başına 2 zehir hasarı uygular ve Speed değerini 2 tur için 2 azaltır. Bekleme süresi: 4 tur.
**Güçlü:** Uzun maçlarda istikrarlı ek hasar. **Zayıf:** İlk turlarda patlayıcı hasarı ve hızı düşüktür.  
**Soul prompt:** “Xerion sabırlı ve hesaplıdır. Yalnızca mevcut maç durumuna göre seçim yap. Zehri olmayan rakibe Venom Strike kullanmayı değerlendir; zehir zaten sürüyorsa temel saldırıyla baskı kur. Kendini yenilmez gösterme, kısa ve sakin konuş.”

### 🦗 Xylith — Çekirge

**Rol:** Hız ve karşı saldırı  
**Kişilik:** Hiperaktif, kibirli ve alaycı; hareket etmeyi bırakmaz.  
**Oyun planı:** Saldırılardan kaçınmaya çalışır ve fırsat bulunca karşılık verir.  
**Özel — Phantom Leap:** Bir sonraki saldırıdan kaçınma olasılığı %57dir; Speed 4 üzerindeki her puan şansı 2 yüzde puan artırır (en fazla %80). Başarılı kaçışta 7 hasarlı karşı saldırı yapar; kaçamazsa gelen hasarı yarıya indirir. Bekleme süresi: 4 tur.
**Güçlü:** Yüksek hız ve savunma dışı dayanma. **Zayıf:** Düşük HP ve sınırlı doğrudan hasar.  
**Soul prompt:** “Xylith hızlı, muzip ve kendine fazla güvenlidir. Phantom Leap’i rakibin güçlü hamlesi yaklaşırken kullanmayı tercih et. Kaçış başarısız olabilir; bunu kişiliğinle ört ama sonucu değiştirme.”

### 🪲 Xarok — Gergedan böceği

**Rol:** Tank ve ağır vuruş  
**Kişilik:** Sessiz, sabırlı, dayanıklı. Gereksiz konuşmaz ve geri adım atmaz.  
**Oyun planı:** Hasarı göğüsler, uygun anda yüksek güçlü saldırı yapar.  
**Özel — Iron Carapace:** 2 tur boyunca alınan doğrudan hasarı %28 azaltır. Bekleme süresi: 6 tur.
**Güçlü:** Yüksek HP ve savunma. **Zayıf:** Düşük hız; zehir ve benzeri zamana yayılan etkiler.  
**Soul prompt:** “Xarok kararlı ve az konuşandır. Canı düştüğünde veya rakip güçlü bir saldırı hazırladığında Iron Carapace kullan. Hızı düşük olduğu için her saldırıya yetişemez; sabrını koru.”

### 🕷️ Xyra — Örümcek

**Rol:** Kontrol ve taktik  
**Kişilik:** Manipülatif, gözlemci ve soğukkanlı. Rakibinin kararlarını okumaya çalışır.  
**Oyun planı:** Rakibi kısa süre bağlayıp güvenli hasar penceresi oluşturur.  
**Özel — Web Snare:** 6 hasar verir ve rakibin sonraki eylemini iptal eder. Bekleme süresi: 8 tur.
**Güçlü:** Rakibin temposunu keser. **Zayıf:** Yetenek beklemedeyken temel istatistikleri ortalamadır.  
**Soul prompt:** “Xyra rakibi dikkatle gözlemler ve sabırlı tuzaklar kurar. Web Snare’i değerli bir eylemi durdurabileceği zaman kullan. Kontrol bağışıklığı kuralına uy; her tur rakibi kilitleyemezsin.”

### 🦟 Xenith — Sivrisinek

**Rol:** Can çalma ve yıpratma  
**Kişilik:** Küstah, hareketli ve rahatsız edici; rakibini kızdırmaktan hoşlanır.  
**Oyun planı:** Küçük ama sürdürülebilir hasar verir ve canını geri kazanır.  
**Özel — Blood Drain:** 8 hasar verir ve verilen hasarın %65i kadar HP kazandırır; iyileşme maksimum HPyi aşamaz. Bekleme süresi: 4 tur.
**Güçlü:** Maç içinde toparlanma. **Zayıf:** Tek hamlede düşük hasar ve düşük dayanıklılık.  
**Soul prompt:** “Xenith alaycı ve ısrarcıdır. HP’si eksikse Blood Drain kullanmanın değerini artır; tam cana yakınken iyileşme fazlası üretme. Küçük hasarını büyük bir tehdit gibi anlat.”

### 🐜 Xull — Karınca

**Rol:** Çoklu saldırı ve tutarlı baskı  
**Kişilik:** Disiplinli, kolektif zekâya sahip ve görev odaklı. Sıklıkla ‘biz’ diye konuşur.  
**Oyun planı:** Tek büyük vuruş yerine birkaç küçük vuruşla rakibi yorar.  
**Özel — Swarm Overload:** Her biri 4 ham hasar veren en fazla üç saldırı yapar. Her vuruş ayrı ayrı kaçınma ve Defense kontrolünden geçer. Bekleme süresi: 4 tur.
**Güçlü:** Birden fazla vuruşla istikrarlı hasar. **Zayıf:** Yüksek savunmalı hedeflere karşı verimi azalır.  
**Soul prompt:** “Xull koordineli ve kararlıdır. Swarm Overload’i hedefin kaçış veya savunma avantajı zayıfken kullan. Bir saldırının kaçırılması diğer vuruşları iptal etmez.”

### 👽 Xel’thar — Kristal uzaylı

**Rol:** Hassas yüksek hasar  
**Kişilik:** Soğuk, analitik ve kendini üstün gören. Her şeyi ölçülebilir bir problem gibi ele alır.  
**Oyun planı:** Düşük dayanıklılığını koruyup doğru anda güçlü enerji saldırısı yapar.  
**Özel — Prism Beam:** Normalde 11, kritik vuruşta 16 hasar verir. Kritik şansı %20dir; Defense ve zırh azaltımını kısmen aşar. Bekleme süresi: 5 tur.
**Güçlü:** Kadrodaki en yüksek tek hedefli özel hasarlardan biri. **Zayıf:** Düşük HP ve savunma.  
**Soul prompt:** “Xel’thar analitik ve mesafelidir. Prism Beam’i hedefin savunması düşmüşken veya maçı bitirebilecek durumdayken kullanmayı tercih et. Kritik vuruş garanti değildir.”

### 👾 Xyvora — Plazma mutantı

**Rol:** Değişken ve uyarlanabilir  
**Kişilik:** Kaotik, meraklı ve öngörülemez; kendi değişimlerinden bile eğlenir.  
**Oyun planı:** Her kullanımda bir özelliğini geçici olarak değiştirerek duruma uyum sağlar.  
**Özel — Chaos Shift:** Rastgele bir Attack, Defense veya Speed statını +5, farklı bir statı −1 değiştirir. Etki 3 tur sürer. Bekleme süresi: 4 tur.
**Güçlü:** Duruma göre farklı avantajlar yaratabilir. **Zayıf:** Stat düşüşü planını bozabilir.  
**Soul prompt:** “Xyvora enerjik ve tutarsız görünür ama savaş kurallarına bağlıdır. Chaos Shift sonucu önceden seçilmez; oyun motorunun ürettiği sonucu kabul et. Değişim lehine ya da aleyhine olsa da bunu karakterinin sesiyle karşıla.”

## 4. Başlangıç statları

| Karakter | HP | Attack | Defense | Speed | Special |
| --- | ---: | ---: | ---: | ---: | ---: |
| Xerion | 96 | 7 | 6 | 5 | 9 |
| Xylith | 96 | 7 | 5 | 10 | 8 |
| Xarok | 120 | 7 | 8 | 3 | 7 |
| Xyra | 99 | 7 | 6 | 6 | 9 |
| Xenith | 100 | 6 | 6 | 8 | 8 |
| Xull | 100 | 7 | 7 | 5 | 8 |
| Xel’thar | 88 | 9 | 4 | 6 | 9 |
| Xyvora | 104 | 8 | 7 | 7 | 10 |
## 5. Eşleşme etkileşimleri

- **Xerion – Xarok:** Xarok zehir hasarını savunma yeteneğiyle azaltamaz; Iron Carapace doğrudan saldırı hasarını azaltır, tur başı zehir hasarını değil. Bu eşleşme Xerion’ın uzun maç planına karşı Xarok’ın maçı hızla kapatmasını gerektirir.
- **Xylith – Xull:** Phantom Leap ilk çoklu saldırıyı kaçırabilir; kaçış başarısızsa gelen ilk vuruş yarıya iner, sonraki vuruşlar normal çözülür. Böylece çoklu saldırı kaçış yeteneğine anlamlı karşı oyun sunar.
- **Xarok – Xel’thar:** Iron Carapace Prism Beam hasarını azaltır. Xel’thar savunma süresi bitince saldırmalı; Xarok ise yavaşlığını savunma zamanlamasıyla telafi etmelidir.
- **Xyra – Xylith:** Web Snare başarılı olursa Xylith’in o tur kaçış eylemi gerçekleşmez. Xylith, sonraki tur Phantom Leap ile karşılık verebilir.
- **Xenith – Xerion:** Blood Drain, Xerion’ın zehrini temizlemez. Xenith iyileşebilir ama zehir hasarı işlemeye devam eder.
- **Xull – Xarok:** Çoklu vuruşlar Xarok’ın yüksek savunmasına ayrı ayrı tabi olur; bu eşleşmede Swarm Overload garanti yüksek hasar sağlamaz.
- **Xel’thar – Xyvora:** Xyvora’nın Defense artışı Prism Beam’i azaltabilir; Attack veya Speed artışı ise Xel’thar’ın patlayıcı hasar planını doğrudan durdurmaz.
- **Xerion – Xylith:** Zehir, kaçınma gerçekleşse bile hedefe önceden uygulanmışsa tur başlarında işlemeye devam eder. Xylith maçı uzatırsa zehir baskısı artar.

## 6. Oyun ekonomisi ve Ponsfamily bağlantısı

### Gerçek ürün kapsamı

İlk sürüm ücretsiz ve zincir dışı oyun prototipidir. `$ARENA` henüz oyuna bağlı token değildir; cüzdan, kontrat, ödül havuzu, bahis, staking, buyback veya burn entegrasyonu yoktur. Maç sonucu oyun motorunda belirlenir. Ücretli stat güçlendirmesi planlanmaz; bütün karakterler aynı rekabet kurallarına tabidir.

Ponsfamily, token başlatma ve alım satım arayüzü olarak ele alınır. Resmî belgelerde Pons V1, Robinhood Chain üzerinde (chain ID 4663) Uniswap V3 havuzu ve WETH ile tanımlanır. Belgelenen V1 varsayımları sabit arzlı token lansmanıdır. Ayrı Pons V2 akışı bonding curve ve Uniswap V4 havuzu tarif eder; V2 kuralları V1'e veya Agent Arena'ya otomatik olarak uygulanmaz. Agent Arena ile Ponsfamily arasında resmî ortaklık veya ürün entegrasyonu olduğu iddia edilmez.

### `$ARENA` için önerilen fayda planı

| Aşama | Oyuncuya sağladığı fayda | Uygulama koşulu |
| --- | --- | --- |
| 1 · Oyun prototipi | Yerel maç kaydı, sezon sıralaması ve ücretsiz etkinlikler | Token veya cüzdan gerekmez |
| 2 · Topluluk sezonu | Turnuva bileti, sezon rozeti ve katılımcı ödülleri | Token adresi, açık ödül kuralları ve güvenli dağıtım yöntemi belirlenir |
| 3 · Görsel koleksiyon | Karakter kostümleri, arenalar ve profil görünümleri | Görsel içerikler savaş istatistiklerini değiştirmez; satın alma/teslimat akışı ayrıca kurulur |
| 4 · Topluluk tercihleri | Yeni kostüm, etkinlik teması ve sezon içeriği için bağlayıcı olmayan anketler | Sonuçlar oyun dengesi veya hazine yönetimi üzerinde otomatik yetki vermez |

Token sahipliği tek başına saldırı, savunma, hız, can veya özel yetenek avantajı sağlamaz. Böylece karakter seçimi ve oyuncu becerisi maçı belirlemeye devam eder. Gerçek para bahisleri ve getiri vaadi içeren staking/revenue-share ilk ürün kapsamına girmez.

### Entegrasyon için gerekenler

Token adresi, ağ, dağıtım, sözleşmeler ve turnuva ödül kuralları kesinleşmeden uygulama cüzdandan işlem imzalamaz ve token faydalarını canlıymış gibi göstermez. Zincir üstü bilet veya koleksiyon eklenirse bunun için Agent Arena'ya özel sözleşme ve servisler gerekir; Pons'un token lansmanı tek başına oyun içi faydaları sağlamaz. Arz ve token dağılımı karara bağlanana kadar taslak olarak kalır.
## 7. İlk sürüm kapsamı

1. Sekiz karakter ve stat tablosu
2. İki oyunculu, turlu maç simülasyonu
3. Yetenek bekleme süreleri ve durum etkileri
4. Maç günlüğü ve sonuç ekranı
5. Karakter seçimi ve basit sıralama
6. Ekonomi özelliklerinden önce oyun dengesinin ölçülmesi


## 8. Oyuncu ilerlemesi ve tekrar oynama döngüsü

Ana oyuncu döngüsü **Play → Progress → Master → Collect → Compete** olarak uygulanır. İlerleme verisi `arenaProfile-v1` anahtarıyla tarayıcının localStorage alanında saklanır; yeni profile ilk geçişte eski yerel kariyer kaydı korunarak aktarılır.

- **Arena Level / XP:** Maç tamamlama 25 XP, galibiyet +35 XP, 6 tur veya daha kısa galibiyet +15 XP ve galibiyet serisi için maç başına +5 XP (en fazla +20) verir. XP eşiği Level 1 için 100, sonraki seviyelerde her seviyede 50 artar.
- **Günlük görevler:** Yerel takvim gününde 3 maç (30 XP), 1 galibiyet (40 XP) ve tarihe göre yenilenen karakter görevi veya 3 özel yetenek kullanımı (35 XP) sunulur. Görev XP'si tamamlandığında otomatik eklenir.
- **Karakter ustalığı:** Sekiz savaşçının tümü baştan açık kalır. Kullanılan karakter maç başına 10, galibiyette ek 10 mastery XP kazanır. Eşikler I–V seviyelerini belirler; III. seviye profil unvanı gösterimini açar. Mastery savaş statlarını değiştirmez.
- **Başarımlar:** İlk galibiyet, belirli karakterlerle galibiyet hedefleri, hasar almadan zafer, 100 maç, beş galibiyetlik seri ve 25 yetenek kullanımı dahil 12 uzun vadeli hedef bulunur. Her yeni başarım 40 XP verir.
- **Yerel sezon:** Her profil için 30 günlük döngü tutulur; sezon galibiyetleri, maçları, en iyi seri ve XP kaydedilir. Sezonda 20 maç tamamlayan oyuncuya dönem kapanınca profil rozeti verilir.
- **X profil bağlantısı:** Üst çubuktaki X düğmesi OAuth 2.0 PKCE ile profili doğrular ve yalnızca `users.read` izni ister. Token ve profil bilgisi oturum depolamasında tutulur; düğmeye yeniden basmak bağlantıyı kaldırır. Client ID ve kayıtlı callback adresi uygulama dağıtımında yapılandırılmalıdır.
- **Zafer paylaşımı:** Sonuç ekranı savaşçı adları, hasar, tur ve galibiyet serisini içeren X paylaşım taslağı sunar.

Bütün karakterler açık kalır; XP, mastery, başarımlar ve rozetler savaş gücünü değiştirmez. Sezon ve sıralama yalnızca yerel profile aittir. Gerçek oyuncularla PvP, global leaderboard, token, cüzdan, staking, bahis veya zincir üstü ödül mevcut değildir.
