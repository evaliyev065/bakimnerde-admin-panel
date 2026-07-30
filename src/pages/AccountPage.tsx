import { Building2, KeyRound, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../shared/components/PageHeader";

export function AccountPage() {
  const { principal, logout } = useAuth();
  if (!principal) return null;
  return <><PageHeader eyebrow="HESAP YÖNETİMİ" title={principal.name} description="Oturum, kullanıcı ve firma bilgilerinizi görüntüleyin." /><section className="account-grid">
    <article className="panel account-card"><span className="account-avatar">{principal.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><h2>{principal.name}</h2><p>{principal.email}</p><strong><ShieldCheck /> {roleLabel(principal.role)}</strong></div></article>
    <article className="panel account-details"><h2>Hesap bilgileri</h2><div><UserRound /><span><small>AD SOYAD</small><b>{principal.name}</b></span></div><div><Mail /><span><small>E-POSTA</small><b>{principal.email}</b></span></div><div><Building2 /><span><small>FİRMA</small><b>{principal.tenantName}</b></span></div><div><KeyRound /><span><small>ERİŞİM KANALI</small><b>Web yönetim paneli</b></span></div></article>
  </section><button className="button button--outline account-logout" onClick={logout}><LogOut size={16} /> Oturumu kapat</button></>;
}
function roleLabel(role: string) { return ({ PLATFORM_ADMIN: "Bakımnerde yöneticisi", PLATFORM_STAFF: "Bakımnerde personeli", CPO_ADMIN: "CPO yöneticisi", CPO_STAFF: "CPO personeli", CONTRACTOR_ADMIN: "Taşeron yöneticisi", CONTRACTOR_STAFF: "Taşeron personeli" } as Record<string, string>)[role] ?? role; }
