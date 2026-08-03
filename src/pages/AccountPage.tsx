import { Building2, KeyRound, LogOut, Mail, MapPinned, Save, ShieldCheck, UserRound, Wrench } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { TURKEY_PROVINCES } from "../data/turkeyLocations";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";

interface TenantProfile { id: string; name: string; type: string; serviceRegions: string[]; activityAreas: string[] }
const activityOptions = [
  ["PERIODIC_MAINTENANCE", "Periyodik bakım"], ["ELECTRICAL", "Elektrik"], ["ELECTRONICS", "Elektronik"],
  ["MECHANICAL", "Mekanik"], ["SOFTWARE", "Yazılım"], ["CHARGER_INSTALLATION", "Şarj cihazı kurulumu"],
] as const;

export function AccountPage() {
  const { principal, logout } = useAuth();
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (principal?.tenantType === "CONTRACTOR") void apiRequest<TenantProfile>("/tenant-profile").then(setProfile);
  }, [principal?.tenantType]);
  if (!principal) return null;

  async function saveCoverage(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setMessage("");
    try {
      await apiRequest("/tenant-coverage-update", { method: "POST", body: JSON.stringify({ serviceRegions: profile.serviceRegions, activityAreas: profile.activityAreas }) });
      setMessage("Kapsama ve faaliyet alanları kaydedildi.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Kapsama alanı kaydedilemedi."); }
  }

  const canEditCoverage = principal.role === "CONTRACTOR_ADMIN";
  return <>
    <PageHeader eyebrow="HESAP YÖNETİMİ" title={principal.name} description="Oturum, kullanıcı ve firma bilgilerinizi görüntüleyin." />
    <section className="account-grid">
      <article className="panel account-card"><span className="account-avatar">{principal.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><h2>{principal.name}</h2><p>{principal.email}</p><strong><ShieldCheck /> {roleLabel(principal.role)}</strong></div></article>
      <article className="panel account-details"><h2>Hesap bilgileri</h2><div><UserRound /><span><small>AD SOYAD</small><b>{principal.name}</b></span></div><div><Mail /><span><small>E-POSTA</small><b>{principal.email}</b></span></div><div><Building2 /><span><small>FİRMA</small><b>{principal.tenantName}</b></span></div><div><KeyRound /><span><small>ERİŞİM KANALI</small><b>Web yönetim paneli</b></span></div></article>
    </section>
    {profile && <form className="panel coverage-card" onSubmit={saveCoverage}>
      <div className="coverage-card__head"><span><MapPinned /></span><div><h2>Teknik servis kapsamı</h2><p>Firmanızın hizmet verdiği bölgeleri ve faaliyet alanlarını yönetin.</p></div></div>
      <div className="coverage-fields">
        <label><span>Hizmet bölgeleri</span><select multiple disabled={!canEditCoverage} value={profile.serviceRegions} onChange={(event) => setProfile({ ...profile, serviceRegions: Array.from(event.currentTarget.selectedOptions, option => option.value) })}>{TURKEY_PROVINCES.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select></label>
        <label><span>Faaliyet alanları</span><select multiple disabled={!canEditCoverage} value={profile.activityAreas} onChange={(event) => setProfile({ ...profile, activityAreas: Array.from(event.currentTarget.selectedOptions, option => option.value) })}>{activityOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      </div>
      <div className="coverage-summary"><MapPinned /><span><b>{profile.serviceRegions.length} hizmet bölgesi</b><small>{profile.serviceRegions.join(", ") || "Henüz tanımlanmadı"}</small></span><Wrench /><span><b>{profile.activityAreas.length} faaliyet alanı</b><small>{profile.activityAreas.map((value) => activityOptions.find(([key]) => key === value)?.[1] ?? value).join(", ") || "Henüz tanımlanmadı"}</small></span></div>
      {message && <p className="coverage-message">{message}</p>}
      {canEditCoverage && <button className="button button--primary"><Save size={15} /> Kapsamı kaydet</button>}
    </form>}
    <button className="button button--outline account-logout" onClick={logout}><LogOut size={16} /> Oturumu kapat</button>
  </>;
}

function roleLabel(role: string) { return ({ PLATFORM_ADMIN: "Bakımnerde yöneticisi", PLATFORM_STAFF: "Bakımnerde personeli", CPO_ADMIN: "CPO yöneticisi", CPO_STAFF: "CPO personeli", CONTRACTOR_ADMIN: "Teknik servis yöneticisi", CONTRACTOR_STAFF: "Teknik servis personeli" } as Record<string, string>)[role] ?? role; }
