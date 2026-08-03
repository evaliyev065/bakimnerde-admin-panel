import { ArrowRight, ShieldCheck, Wrench } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../shared/components/Brand";

export function PlatformLoginPage() {
  const { platformLogin, principal } = useAuth();
  const [email, setEmail] = useState("admin@bakimnerde.com");
  const [password, setPassword] = useState("Bakimnerde!2026");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (principal) return <Navigate to="/dashboard" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await platformLogin(email, password); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Giriş yapılamadı."); }
    finally { setBusy(false); }
  }
  return <main className="login-page">
    <section className="login-showcase">
      <div className="login-brand"><Brand /></div>
      <div className="login-copy">
        <p>MERKEZ OPERASYON PORTALI</p>
        <h1>Ekosistemi tek<br />merkezden yönetin.</h1>
        <span>Bakımnerde ekibi CPO taleplerini, taşeron operasyonlarını, saha kanıtlarını ve finansal akışı güvenli merkez alanından yönetir.</span>
      </div>
      <div className="login-points">
        <div><ShieldCheck /><span><b>Bakımnerde’ye özel alan</b><small>Yalnız yetkili merkez hesapları erişebilir.</small></span></div>
        <div><Wrench /><span><b>Canlı operasyon kontrolü</b><small>İş, kanıt, cüzdan ve onay akışları tek yerde.</small></span></div>
      </div>
    </section>
    <section className="login-form-wrap">
      <form className="login-form" onSubmit={submit}>
        <p className="eyebrow">BAKIMNERDE GİRİŞİ</p>
        <h2>Yetkili personel girişi</h2>
        <p>Bakımnerde merkez hesabınızı kullanın.</p>

        <label><span>E-posta adresi</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
        <label><span>Parola</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
        {error && <div className="login-error">{error}</div>}
        <button className="login-submit" disabled={busy}>{busy ? "Doğrulanıyor…" : "Güvenli giriş"}<ArrowRight /></button>
      </form>
    </section>
  </main>;
}
