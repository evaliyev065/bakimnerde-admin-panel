import { Building2, KeyRound, LogOut, Mail, MapPinned, Save, ShieldCheck, UserRound, Wrench } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { usePreferences } from "../app/PreferencesContext";
import { useAuth } from "../auth/AuthContext";
import { TURKEY_PROVINCES } from "../data/turkeyLocations";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";

interface TenantProfile { id: string; name: string; type: string; serviceRegions: string[]; activityAreas: string[] }
const activityOptions = [
  ["PERIODIC_MAINTENANCE", "Periyodik bakım", "Periodic maintenance"], ["ELECTRICAL", "Elektrik", "Electrical"], ["ELECTRONICS", "Elektronik", "Electronics"],
  ["MECHANICAL", "Mekanik", "Mechanical"], ["SOFTWARE", "Yazılım", "Software"], ["CHARGER_INSTALLATION", "Şarj cihazı kurulumu", "Charging device installation"],
] as const;

export function AccountPage() {
  const { principal, logout } = useAuth();
  const { language } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
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
      setMessage(copy("Kapsama ve faaliyet alanları kaydedildi.", "Service coverage and activity areas were saved."));
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : copy("Kapsama alanı kaydedilemedi.", "Service coverage could not be saved.")); }
  }

  const canEditCoverage = principal.role === "CONTRACTOR_ADMIN";
  return <>
    <PageHeader eyebrow={copy("HESAP YÖNETİMİ", "ACCOUNT MANAGEMENT")} title={principal.name} description={copy("Oturum, kullanıcı ve firma bilgilerinizi görüntüleyin.", "View your session, user and company information.")} />
    <section className="account-grid">
      <article className="panel account-card"><span className="account-avatar">{principal.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><h2>{principal.name}</h2><p>{principal.email}</p><strong><ShieldCheck /> {roleLabel(principal.role, language)}</strong></div></article>
      <article className="panel account-details"><h2>{copy("Hesap bilgileri", "Account information")}</h2><div><UserRound /><span><small>{copy("AD SOYAD", "FULL NAME")}</small><b>{principal.name}</b></span></div><div><Mail /><span><small>{copy("E-POSTA", "EMAIL")}</small><b>{principal.email}</b></span></div><div><Building2 /><span><small>{copy("FİRMA", "COMPANY")}</small><b>{principal.tenantName}</b></span></div><div><KeyRound /><span><small>{copy("ERİŞİM KANALI", "ACCESS CHANNEL")}</small><b>{copy("Web yönetim paneli", "Web management panel")}</b></span></div></article>
    </section>
    {profile && <form className="panel coverage-card" onSubmit={saveCoverage}>
      <div className="coverage-card__head"><span><MapPinned /></span><div><h2>{copy("Teknik servis kapsamı", "Technical service coverage")}</h2><p>{copy("Firmanızın hizmet verdiği bölgeleri ve faaliyet alanlarını yönetin.", "Manage the regions and activity areas served by your company.")}</p></div></div>
      <div className="coverage-fields">
        <label><span>{copy("Hizmet bölgeleri", "Service regions")}</span><select multiple disabled={!canEditCoverage} value={profile.serviceRegions} onChange={(event) => setProfile({ ...profile, serviceRegions: Array.from(event.currentTarget.selectedOptions, option => option.value) })}>{TURKEY_PROVINCES.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select></label>
        <label><span>{copy("Faaliyet alanları", "Activity areas")}</span><select multiple disabled={!canEditCoverage} value={profile.activityAreas} onChange={(event) => setProfile({ ...profile, activityAreas: Array.from(event.currentTarget.selectedOptions, option => option.value) })}>{activityOptions.map(([value, tr, en]) => <option value={value} key={value}>{copy(tr, en)}</option>)}</select></label>
      </div>
      <div className="coverage-summary"><MapPinned /><span><b>{profile.serviceRegions.length} {copy("hizmet bölgesi", "service regions")}</b><small>{profile.serviceRegions.join(", ") || copy("Henüz tanımlanmadı", "Not defined yet")}</small></span><Wrench /><span><b>{profile.activityAreas.length} {copy("faaliyet alanı", "activity areas")}</b><small>{profile.activityAreas.map((value) => { const option = activityOptions.find(([key]) => key === value); return option ? copy(option[1], option[2]) : value; }).join(", ") || copy("Henüz tanımlanmadı", "Not defined yet")}</small></span></div>
      {message && <p className="coverage-message">{message}</p>}
      {canEditCoverage && <button className="button button--primary"><Save size={15} /> {copy("Kapsamı kaydet", "Save coverage")}</button>}
    </form>}
    <button className="button button--outline account-logout" onClick={logout}><LogOut size={16} /> {copy("Oturumu kapat", "Sign out")}</button>
  </>;
}

function roleLabel(role: string, language: "tr" | "en") {
  const labels: Record<string, [string, string]> = {
    PLATFORM_ADMIN: ["Bakımnerde yöneticisi", "Bakımnerde administrator"], PLATFORM_OWNER: ["Ana Bakımnerde hesabı", "Primary Bakımnerde account"], PLATFORM_STAFF: ["Bakımnerde personeli", "Bakımnerde staff"],
    CPO_ADMIN: ["CPO yöneticisi", "CPO administrator"], CPO_STAFF: ["CPO personeli", "CPO staff"], CONTRACTOR_ADMIN: ["Teknik servis yöneticisi", "Technical service administrator"], CONTRACTOR_STAFF: ["Teknik servis personeli", "Technical service staff"],
  };
  return labels[role]?.[language === "tr" ? 0 : 1] ?? role;
}
