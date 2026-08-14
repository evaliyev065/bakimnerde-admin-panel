import { ArrowRight, ShieldCheck, Wrench } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { usePreferences } from "../app/PreferencesContext";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../shared/components/Brand";
import { PublicPreferences } from "../shared/components/PublicPreferences";

export function PlatformLoginPage() {
  const { platformLogin, principal } = useAuth();
  const { language } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
  const [email, setEmail] = useState("admin@bakimnerde.com");
  const [password, setPassword] = useState("Bakimnerde!2026");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (principal) return <Navigate to="/dashboard" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await platformLogin(email, password); }
    catch (reason) { setError(reason instanceof Error ? reason.message : copy("Giriş yapılamadı.", "Sign-in failed.")); }
    finally { setBusy(false); }
  }
  return <main className="login-page">
    <PublicPreferences />
    <section className="login-showcase" aria-label={copy("Merkez operasyon portalı tanıtımı", "Central operations portal introduction")}>
      <div className="login-brand"><Brand /></div>
      <div className="login-copy">
        <p>{copy("MERKEZ OPERASYON PORTALI", "CENTRAL OPERATIONS PORTAL")}</p>
        <h1>{copy("Ekosistemi tek", "Manage the ecosystem")}<br />{copy("merkezden yönetin.", "from one place.")}</h1>
        <span>{copy(
          "Bakımnerde ekibi CPO taleplerini, taşeron operasyonlarını, saha kanıtlarını ve finansal akışı güvenli merkez alanından yönetir.",
          "The Bakımnerde team manages CPO requests, technical service operations, field evidence and financial flows from a secure central workspace.",
        )}</span>
      </div>
      <div className="login-points">
        <div><ShieldCheck aria-hidden="true" /><span><b>{copy("Bakımnerde’ye özel alan", "Bakımnerde-only workspace")}</b><small>{copy("Yalnız yetkili merkez hesapları erişebilir.", "Only authorized central accounts can access it.")}</small></span></div>
        <div><Wrench aria-hidden="true" /><span><b>{copy("Canlı operasyon kontrolü", "Live operations control")}</b><small>{copy("İş, kanıt, cüzdan ve onay akışları tek yerde.", "Jobs, evidence, wallets and approvals in one place.")}</small></span></div>
      </div>
    </section>
    <section className="login-form-wrap">
      <form className="login-form" onSubmit={submit} aria-label={copy("Bakımnerde yetkili personel girişi", "Bakımnerde authorized staff sign-in")}>
        <p className="eyebrow">{copy("BAKIMNERDE GİRİŞİ", "BAKIMNERDE SIGN-IN")}</p>
        <h2>{copy("Yetkili personel girişi", "Authorized staff sign-in")}</h2>
        <p>{copy("Bakımnerde merkez hesabınızı kullanın.", "Use your Bakımnerde central account.")}</p>

        <label><span>{copy("E-posta adresi", "Email address")}</span><input autoComplete="email" type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
        <label><span>{copy("Parola", "Password")}</span><input autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
        {error && <div className="login-error" role="alert">{error}</div>}
        <button className="login-submit" disabled={busy}>{busy ? copy("Doğrulanıyor…", "Verifying…") : copy("Güvenli giriş", "Secure sign-in")}<ArrowRight aria-hidden="true" /></button>
      </form>
    </section>
  </main>;
}
