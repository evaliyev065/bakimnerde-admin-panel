import { ArrowRight, Building2, CheckCircle2, HardHat, Wrench } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../shared/components/Brand";

const demos = [
  { label: "CPO firma", email: "operasyon@wattarya.test", icon: Building2 },
  { label: "Taşeron yönetimi", email: "yonetici@wattaryateknik.test", icon: HardHat },
] as const;

export function LoginPage() {
  const { companyLogin, principal } = useAuth();
  const [email, setEmail] = useState<string>(demos[0].email);
  const [password, setPassword] = useState("Bakimnerde!2026");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (principal) return <Navigate to="/dashboard" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await companyLogin(email, password); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Giriş yapılamadı."); }
    finally { setBusy(false); }
  }
  return <main className="login-page">
    <section className="login-showcase">
      <div className="login-brand"><Brand /></div>
        <div className="login-copy">
          <p>ŞİRKET OPERASYON PORTALI</p>
          <h1>Bakım işlerinizi<br />tek yerden yönetin.</h1>
          <span>CPO ve taşeron yönetim ekipleri, Bakımnerde aracılığındaki süreçlerini güvenli şirket alanlarında takip eder.</span>
          </div>
          <div className="login-points"><div>
            <CheckCircle2 /><span><b>Şirketinize özel alan</b><small>Yalnız kendi operasyonlarınızı görün.</small></span>
            </div>
            <div><Wrench /><span><b>Karşılıklı canlı akış</b><small>Atama, randevu, kanıt ve onay tek yerde.</small></span></div></div></section><section className="login-form-wrap"><form className="login-form" onSubmit={submit}><p className="eyebrow">ŞİRKET GİRİŞİ</p><h2>Şirket hesabınıza giriş yapın</h2><p>CPO veya taşeron yönetim hesabınızı kullanın.</p><div className="demo-switcher">{demos.map(({ label, email: demoEmail, icon: Icon }) => <button type="button" className={email === demoEmail ? "is-active" : ""} onClick={() => { setEmail(demoEmail); setPassword("Bakimnerde!2026"); }} key={demoEmail}><Icon /><span>{label}</span></button>)}</div><label><span>E-posta adresi</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label><label><span>Parola</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} required /></label>{error && <div className="login-error">{error}</div>}<button className="login-submit" disabled={busy}>{busy ? "Giriş yapılıyor…" : "Giriş yap"}<ArrowRight /></button></form></section></main>;
}
