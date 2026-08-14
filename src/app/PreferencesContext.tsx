import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppLanguage = "tr" | "en";
export type AppTheme = "light" | "dark";

const translations: Record<string, string> = {
  "Genel bakış": "Overview",
  "İşler": "Jobs",
  "Cihazlar ve İstasyonlar": "Devices and Stations",
  "Kullanıcı yönetimi": "User management",
  "Taşeron firmalar": "Technical service companies",
  "CPO firmalar": "CPO companies",
  "Fiyat yönetimi": "Pricing",
  "Ödemeler": "Payments",
  "Denetim kayıtları": "Audit logs",
  "OPERASYON MERKEZİ": "OPERATIONS CENTER",
  "Platformda ara": "Search the platform",
  "Ana menü": "Main menu",
  "Ara": "Search",
  "İş, firma, istasyon veya cihaz ara…": "Search jobs, companies, stations or device codes…",
  "Bildirimler": "Notifications",
  "okunmamış": "unread",
  "Yeni bildiriminiz yok.": "You have no new notifications.",
  "Hesap yönetimine git": "Open account settings",
  "Sidebar profilini aç": "Open sidebar profile",
  "Oturumu kapat": "Sign out",
  "Menüyü aç": "Open menu",
  "Menüyü kapat": "Close menu",
  "Menüyü daralt": "Collapse menu",
  "Menüyü genişlet": "Expand menu",
  "Koyu temaya geç": "Switch to dark theme",
  "Açık temaya geç": "Switch to light theme",
  "Dili İngilizce yap": "Switch language to English",
  "Dili Türkçe yap": "Switch language to Turkish",
  "Profil": "Profile",
  "Sayfa": "Page",
  "Toplam": "Total",
  "Önceki": "Previous",
  "Sonraki": "Next",
  "kayıt": "records",
  "Beklemede": "Waiting",
  "Atandı": "Assigned",
  "İşlemde": "In progress",
  "Ek tedarik sürecinde": "Additional supply in progress",
  "Bakım tamamlandı": "Maintenance completed",
  "Bakım onaylandı": "Maintenance approved",
  "CPO onayı": "CPO approval",
  "Ödeme yapıldı": "Paid",
  "Süreç sonlandı": "Closed",
  "Kritik": "Critical",
  "Aktif": "Active",
  "Onay bekliyor": "Awaiting approval",
  "CANLI OPERASYON": "LIVE OPERATIONS",
  "İş yönetimi": "Job management",
  "CPO talebinden saha kanıtlarına, onaydan hakedişe kadar ortak iş akışı.": "A shared workflow from the CPO request and field evidence through approval and settlement.",
  "Cihazlar ve istasyonlar": "Devices and stations",
  "İstasyonları, yalnız o istasyona bağlı cihazları ve iki bakım türünün geçmişini görüntüleyin.": "View stations, their device codes, and maintenance history.",
  "Firma cüzdanlarını, bakiyeleri ve iş bazlı hak edişleri yönetin.": "Manage company wallets, balances, and job-based settlements.",
  "Şirketinizin güncel bakiyesini ve cüzdan hareketlerini anlık olarak görüntüleyin.": "View your current balance and wallet transactions in real time.",
  "HİZMET AĞI": "SERVICE NETWORK",
  "MÜŞTERİ AĞI": "CUSTOMER NETWORK",
  "Bakım firmalarını, sözleşmelerini, müsaitliklerini ve özel maliyetlerini yönetin.": "Manage maintenance companies, contracts, availability and private costs.",
  "Bakım talebi oluşturan firmaları, sözleşme tiplerini ve ticari koşulları yönetin.": "Manage maintenance-request companies, contract types and commercial terms.",
  "Cihazlar": "Devices",
  "Şarj cihazlarını ve cihaz bazlı bakım geçmişini tek ekranda görüntüleyin.": "View charging devices and device maintenance history in one place.",
  "HESAP YÖNETİMİ": "ACCOUNT MANAGEMENT",
  "Oturum, kullanıcı ve firma bilgilerinizi görüntüleyin.": "View your session, user and company information.",
  "GÜVENLİK": "SECURITY",
  "Kim, ne zaman, hangi veride işlem yaptı: değiştirilemez operasyon günlüğü.": "An immutable operations log of who changed which data and when.",
  "TİCARİ YÖNETİM": "COMMERCIAL MANAGEMENT",
  "Taşeron maliyetlerini ve CPO satış fiyatlarını birbirinden bağımsız yönetin.": "Manage technical-service costs and CPO sale prices independently.",
  "Bakımnerde, CPO, taşeron yönetimi ve mobil saha hesaplarını ayrı alanlarda yönetin.": "Manage Bakımnerde, CPO, technical-service and mobile field accounts separately.",
  "Yenile": "Refresh",
  "Kapat": "Close",
  "Vazgeç": "Cancel",
  "Kaydet": "Save",
  "Sil": "Delete",
  "Düzenle": "Edit",
  "Ata": "Assign",
};

interface PreferencesValue {
  language: AppLanguage;
  theme: AppTheme;
  locale: "tr-TR" | "en-US";
  setLanguage(language: AppLanguage): void;
  setTheme(theme: AppTheme): void;
  t(value: string): string;
}

const PreferencesContext = createContext<PreferencesValue>({
  language: "tr",
  theme: "light",
  locale: "tr-TR",
  setLanguage: () => undefined,
  setTheme: () => undefined,
  t: (value) => value,
});

function storedLanguage(): AppLanguage {
  return localStorage.getItem("bakimnerde_language") === "en" ? "en" : "tr";
}

function storedTheme(): AppTheme {
  const stored = localStorage.getItem("bakimnerde_theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(storedLanguage);
  const [theme, setThemeState] = useState<AppTheme>(storedTheme);

  useEffect(() => {
    localStorage.setItem("bakimnerde_language", language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem("bakimnerde_theme", theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const value = useMemo<PreferencesValue>(() => ({
    language,
    theme,
    locale: language === "tr" ? "tr-TR" : "en-US",
    setLanguage: setLanguageState,
    setTheme: setThemeState,
    t: (text) => language === "en" ? translations[text] ?? text : text,
  }), [language, theme]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  return useContext(PreferencesContext);
}
