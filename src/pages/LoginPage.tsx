import { ArrowRight, Building2, CheckCircle2, HardHat, Wrench } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { usePreferences } from "../app/PreferencesContext";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../shared/components/Brand";
import { PublicPreferences } from "../shared/components/PublicPreferences";

const demos = [
  { label: ["CPO firma", "CPO company"], email: "operasyon@wattarya.test", icon: Building2 },
  { label: ["Taşeron yönetimi", "Technical service management"], email: "yonetici@wattaryateknik.test", icon: HardHat },
] as const;

export function LoginPage() {
  const { companyLogin, principal } = useAuth();
  const { language } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
  const [email, setEmail] = useState<string>(demos[0].email);
  const [password, setPassword] = useState("Bakimnerde!2026");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (principal) return <Navigate to="/dashboard" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await companyLogin(email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : copy("Giriş yapılamadı.", "Sign-in failed."));
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-page">
    <PublicPreferences />
    <section className="login-showcase" aria-label={copy("Şirket operasyon portalı tanıtımı", "Company operations portal introduction")}>
      <div className="login-brand"><Brand /></div>
      <div className="login-copy">
        <p>{copy("ŞİRKET OPERASYON PORTALI", "COMPANY OPERATIONS PORTAL")}</p>
        <h1>{copy("Bakım işlerinizi", "Manage maintenance jobs")}<br />{copy("tek yerden yönetin.", "from one place.")}</h1>
        <span>{copy(
          "CPO ve taşeron yönetim ekipleri, Bakımnerde aracılığındaki süreçlerini güvenli şirket alanlarında takip eder.",
          "CPO and technical service management teams track their Bakımnerde workflows in secure company workspaces.",
        )}</span>
      </div>
      <div className="login-points">
        <div><CheckCircle2 aria-hidden="true" /><span><b>{copy("Şirketinize özel alan", "A workspace for your company")}</b><small>{copy("Yalnız kendi operasyonlarınızı görün.", "See only your own operations.")}</small></span></div>
        <div><Wrench aria-hidden="true" /><span><b>{copy("Karşılıklı canlı akış", "Shared live workflow")}</b><small>{copy("Atama, randevu, kanıt ve onay tek yerde.", "Assignments, appointments, evidence and approvals in one place.")}</small></span></div>
      </div>
    </section>
    <section className="login-form-wrap">
      <form className="login-form" onSubmit={submit} aria-label={copy("Şirket hesabı girişi", "Company account sign-in")}>
        <p className="eyebrow">{copy("ŞİRKET GİRİŞİ", "COMPANY SIGN-IN")}</p>
        <h2>{copy("Şirket hesabınıza giriş yapın", "Sign in to your company account")}</h2>
        <p>{copy("CPO veya taşeron yönetim hesabınızı kullanın.", "Use your CPO or technical service management account.")}</p>
        <div className="demo-switcher" aria-label={copy("Demo hesapları", "Demo accounts")}>
          {demos.map(({ label, email: demoEmail, icon: Icon }) => <button
            type="button"
            className={email === demoEmail ? "is-active" : ""}
            aria-pressed={email === demoEmail}
            onClick={() => { setEmail(demoEmail); setPassword("Bakimnerde!2026"); }}
            key={demoEmail}
          ><Icon aria-hidden="true" /><span>{label[language === "tr" ? 0 : 1]}</span></button>)}
        </div>
        <label><span>{copy("E-posta adresi", "Email address")}</span><input autoComplete="email" type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
        <label><span>{copy("Parola", "Password")}</span><input autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
        {error && <div className="login-error" role="alert">{error}</div>}
        <button className="login-submit" disabled={busy}>{busy ? copy("Giriş yapılıyor…", "Signing in…") : copy("Giriş yap", "Sign in")}<ArrowRight aria-hidden="true" /></button>
      </form>
    </section>
  </main>;
}
