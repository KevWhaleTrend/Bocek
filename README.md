# Agent Arena

React ve TypeScript ile hazırlanmış, tarayıcıda çalışan turlu savaş prototipi.

Karakter seçiminde kişilik, özel yetenek, güçlü ve zayıf yönler görünür. Hız saldırılardan kaçma şansını etkiler. Üç bot zorluğu (Çaylak, Dengeli, Usta) yapay hasar çarpanları olmadan farklı karar seviyeleri sunar. Maç sonuçları, galibiyet serisi ve son karşılaşmalar tarayıcının yerel deposunda tutulur.

## Geliştirme

Node.js 24 veya daha yenisi gerekir. Proje React 19, TypeScript 6 ve Vite 8 kullanır.

```sh
npm.cmd install
npm.cmd run dev
```

Üretim derlemesi:

```sh
npm.cmd run build
```

Oyun kuralları istemci tarafında deterministik olarak yürütülür. Dış servis veya yapay zekâ API anahtarı gerektirmez.

Denge simülasyonu (karakter eşleşmelerini iki taraflı bot oynatır):

```sh
npm.cmd run balance:simulate -- 1200 --matrix
```

Bu ölçüm standart bot kararları içindir; oyuncu becerisi ve strateji farklarını tek başına temsil etmez.

## Oyuncu ilerlemesi

Arena ilerlemesi `localStorage` içinde bağlı X profiline özel tutulur. X profili bağlı değilken görev ve başarımlar kilitlidir; bağlantı açıkken başlatılmayan maçlar ilerleme kazandırmaz. Galibiyet, hızlı zafer ve seri XP kazandırır. Seviye, günlük görevler, karakter ustalıkları, başarımlar ve 30 günlük yerel sezon ilerlemesi oyunda gösterilir. Tüm karakterler açık kalır ve progression savaş statlarını değiştirmez. Zafer ekranından maç özeti X paylaşım taslağı olarak açılabilir; online PvP, token veya cüzdan entegrasyonu yoktur.

## X profili bağlama

Üst sağdaki **X’i bağla** düğmesi OAuth 2.0 PKCE yapılandırılmışsa X’te izin ekranını açar, profili doğrular ve yalnızca `users.read` izni ister. X parolası uygulamaya girilmez. Profil bilgisi ve erişim anahtarı `sessionStorage` içinde tutulur; token X tarafından varsayılan iki saat sonra sona erer ve oturum kapandığında yeniden bağlanmak gerekir. Düğmeye bağlı profilden tıklamak mevcut tarayıcı oturumunun bağlantısını kaldırır. Client ID yapılandırılmamışsa uygulama eksik ayarı bildirir; normal X giriş sayfası profil bağlantısı kurmaz. İlerleme yerel olarak bağlı X kullanıcı kimliğine göre ayrılır; sunucu taraflı hesap eşlemesi yoktur.

Bağlantıyı etkinleştirmek için:

1. X Developer Portal’da uygulama oluşturup OAuth 2.0’ı açın ve **Single page App** tipini seçin.
2. Callback URL olarak yerelde `http://localhost:5173/` adresini ekleyin. Canlı ortamda gerçek uygulama adresini de callback listesine ekleyin.
3. `.env.example` dosyasını `.env` adıyla kopyalayıp `VITE_X_CLIENT_ID` değerine Developer Portal’daki Client ID’yi yazın. İhtiyaç olursa `VITE_X_REDIRECT_URI` ile kayıtlı callback adresini açıkça belirleyin.
4. Vite sunucusunu yeniden başlatın. OAuth callback adresi, X Developer Portal’daki kayıtla birebir aynı olmalıdır.

`VITE_X_CLIENT_ID` bir public client kimliğidir; Single page App içine client secret koymayın. Gerçek kullanıcı hesaplarını kalıcı olarak oyun profiline bağlamak için ileride sunucu taraflı hesap eşleme ve güvenli token saklama gerekir.
