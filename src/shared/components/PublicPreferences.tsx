import { Languages, Moon, Sun } from "lucide-react";
import { usePreferences } from "../../app/PreferencesContext";

export function PublicPreferences() {
  const { language, setLanguage, setTheme, theme } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;

  return <div className="public-preferences" role="group" aria-label={copy("Görünüm ve dil tercihleri", "Appearance and language preferences")}>
    <button
      type="button"
      aria-label={copy(
        theme === "light" ? "Koyu temayı etkinleştir" : "Açık temayı etkinleştir",
        theme === "light" ? "Enable dark theme" : "Enable light theme",
      )}
      aria-pressed={theme === "dark"}
      title={copy(theme === "light" ? "Koyu tema" : "Açık tema", theme === "light" ? "Dark theme" : "Light theme")}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      {theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
    </button>
    <button
      type="button"
      aria-label={copy("Dili İngilizce yap", "Switch language to Turkish")}
      aria-pressed={language === "en"}
      title={copy("English", "Türkçe")}
      onClick={() => setLanguage(language === "tr" ? "en" : "tr")}
    >
      <Languages aria-hidden="true" /><span>{language === "tr" ? "EN" : "TR"}</span>
    </button>
  </div>;
}
