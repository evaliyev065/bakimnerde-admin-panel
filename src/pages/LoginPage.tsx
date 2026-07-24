import { ArrowRight, Building2, CheckCircle2, ShieldCheck, Wrench, Zap } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const demos = [
  { label: "Bakımnerde personeli", email: "admin@bakimnerde.com", icon: ShieldCheck },
  { label: "Üretici firma", email: "yonetici@voltera.test", icon: Building2 },
] as const;

export function LoginPage() {
  const { login, principal } = useAuth();
  const [email, setEmail] = useState<string>(demos[0].email);
  const [password, setPassword] = useState("Bakimnerde!2026");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (principal) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try { await login(email, password); } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Giriş yapılamadı.");
    } finally { setBusy(false); }
  }

  return <main className="login-page">
    <section className="login-showcase">
      <div className="login-brand"><span><Zap fill="currentColor" /></span><b>bakımnerde</b></div>
      <div className="login-copy"><p>TEK MERKEZDEN OPERASYON</p><h1>Bakım ağınızın<br />kontrol merkezi.</h1><span>CPO, üretici ve bakım firmalarını birbirinden izole, güvenli ve ölçülebilir süreçlerle yönetin.</span></div>
      <div className="login-points"><div><CheckCircle2 /><span><b>Tenant bazlı güvenlik</b><small>Her firma yalnız kendi verisini görür.</small></span></div><div><Wrench /><span><b>Uçtan uca iş akışı</b><small>Talep, bakım, onay ve ödeme tek yerde.</small></span></div></div>
    </section>
    <section className="login-form-wrap"><form className="login-form" onSubmit={submit}>
      <p className="eyebrow">YÖNETİM PANELİ</p><h2>Hesabınıza giriş yapın</h2><p>Şirket hesabınızla güvenli oturum açın.</p>
      <div className="demo-switcher">{demos.map(({ label, email: demoEmail, icon: Icon }) => <button type="button" className={email === demoEmail ? "is-active" : ""} onClick={() => { setEmail(demoEmail); setPassword("Bakimnerde!2026"); }} key={demoEmail}><Icon /><span>{label}</span></button>)}</div>
      <label><span>E-posta adresi</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
      <label><span>Parola</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
      {error && <div className="login-error">{error}</div>}
      <button className="login-submit" disabled={busy}>{busy ? "Giriş yapılıyor…" : "Giriş yap"}<ArrowRight /></button>
      <small className="login-help">Test parolası: <b>Bakimnerde!2026</b></small>
    </form></section>
  </main>;
}
