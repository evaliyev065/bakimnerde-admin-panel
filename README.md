# Bakımnerde Admin Panel

Sistem yöneticisi, üretici firma ve bakım firması operasyonları için bağımsız React + TypeScript web uygulamasıdır.

```powershell
npm.cmd install
npm.cmd run dev
```

Mimari sınırlar: `src/app` composition/routing, `src/layouts` sayfa kabukları, `src/pages` route sayfaları, `src/shared` gerçek ortak UI bileşenleri. İşlev büyüdükçe `src/features/<feature>` altında API/model/UI ayrımı yapılır.

Kalite kapısı: `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`.

## Reform rotaları

- Bakımnerde yönetici girişi: `/auth/admin/login`
- CPO / taşeron firma girişi: `/giris`
- Taşeron self-servis kayıt: `https://contractor-registrations.bakimnerde.com`
- Lokal self-servis kayıt testi: `/contractor-registration`

Oturum anahtarı sekme bazlı `sessionStorage` içinde tutulur; böylece aynı tarayıcının farklı sekmelerinde farklı firma/rol oturumları test edilebilir. İl listesi uygulamada sabittir, seçilen ilin ilçeleri TurkiyeAPI v2 üzerinden dropdown’a yüklenir.

İş detayında Bakımnerde ve taşeron yönetimi, atanmış taşeron firmaya ait aktif saha personelini ayrı dropdown’dan seçer. Atamadan sonra iş `../bakimnerde-field-app/` Mobile App görev listesine düşer.
