# Bakımnerde Admin Panel

Sistem yöneticisi, üretici firma ve bakım firması operasyonları için bağımsız React + TypeScript web uygulamasıdır.

```powershell
npm.cmd install
npm.cmd run dev
```

Mimari sınırlar: `src/app` composition/routing, `src/layouts` sayfa kabukları, `src/pages` route sayfaları, `src/shared` gerçek ortak UI bileşenleri. İşlev büyüdükçe `src/features/<feature>` altında API/model/UI ayrımı yapılır.

Kalite kapısı: `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`.
