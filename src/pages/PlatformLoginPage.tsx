import { ArrowRight, LockKeyhole, Zap } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function PlatformLoginPage() {
  const { platformLogin, principal } = useAuth();
  const [email, setEmail] = useState("admin@bakimnerde.com");
  const [password, setPassword] = useState("Bakimnerde!2026");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (principal) return <Navigate to="/" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await platformLogin(email, password); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Giriş yapılamadı."); }
    finally { setBusy(false); }
  }
  return <main className="platform-login"><form className="platform-login__card" onSubmit={submit}><div className="platform-login__brand"><span><Zap fill="currentColor" /></span><b>bakımnerde</b></div><div className="platform-login__lock"><LockKeyhole /></div><p className="eyebrow">MERKEZ YÖNETİM</p><h1>Yetkili personel girişi</h1><p>Bu alan yalnız Bakımnerde ekibi içindir.</p><label><span>E-posta</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label><label><span>Parola</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} required /></label>{error && <div className="login-error">{error}</div>}<button className="login-submit" disabled={busy}>{busy ? "Doğrulanıyor…" : "Güvenli giriş"}<ArrowRight /></button></form></main>;
}
