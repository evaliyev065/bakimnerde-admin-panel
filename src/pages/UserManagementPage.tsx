import { Edit3, HardHat, Plus, ShieldCheck, Smartphone, Trash2, UserRound, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { usePreferences } from "../app/PreferencesContext";
import { useAuth, type TenantType } from "../auth/AuthContext";
import { apiRequest } from "../lib/api";
import { PhoneInput } from "../shared/components/FormControls";
import { PageHeader } from "../shared/components/PageHeader";

type Category = "PLATFORM" | "CPO" | "CONTRACTOR";
interface UserItem { id: string; tenantId: string; tenantName: string; name: string; email: string; phone?: string; role: string; status: "ACTIVE" | "SUSPENDED"; lastLoginAt?: string }
interface Tenant { id: string; name: string; type: TenantType }
interface FormState { id: string; tenantId: string; name: string; email: string; phone: string; role: string; status: "ACTIVE" | "SUSPENDED"; password: string }
const endpoints: Record<Category, string> = { PLATFORM: "/users-platform-list", CPO: "/users-cpo-list", CONTRACTOR: "/users-contractor-list" };
const labels: Record<Category, [string, string]> = { PLATFORM: ["Bakımnerde ekibi", "Bakımnerde team"], CPO: ["CPO firma hesapları", "CPO company accounts"], CONTRACTOR: ["Taşeron firma hesapları", "Technical service company accounts"] };
const roles: Record<Category, Array<[string, string, string]>> = {
  PLATFORM: [["PLATFORM_STAFF", "Bakımnerde personeli", "Bakımnerde staff"], ["PLATFORM_OWNER", "Ana Bakımnerde hesabı", "Primary Bakımnerde account"]],
  CPO: [["CPO_ADMIN", "CPO yöneticisi", "CPO administrator"], ["CPO_STAFF", "CPO personeli", "CPO staff"]],
  CONTRACTOR: [["CONTRACTOR_ADMIN", "Taşeron yöneticisi", "Technical service administrator"], ["CONTRACTOR_STAFF", "Taşeron operasyon", "Technical service operations"], ["FIELD_WORKER", "Saha ekibi · yalnız mobil", "Field team · mobile only"]],
};

export function UserManagementPage() {
  const { principal } = useAuth();
  const { language, locale } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
  const categoryLabel = (value: Category) => labels[value][language === "tr" ? 0 : 1];
  const roleLabel = (value: [string, string, string]) => value[language === "tr" ? 1 : 2];
  const categories = useMemo<Category[]>(() => principal?.tenantType === "PLATFORM" ? ["PLATFORM","CPO","CONTRACTOR"] : [principal?.tenantType as Category], [principal]);
  const [category, setCategory] = useState<Category>(categories[0] ?? "CPO");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({ id: "", tenantId: "", name: "", email: "", phone: "", role: "", status: "ACTIVE", password: "" });
  const load = useCallback(() => apiRequest<UserItem[]>(endpoints[category]).then(setUsers), [category]);
  useEffect(() => { void load(); if (principal?.tenantType === "PLATFORM") void apiRequest<Tenant[]>("/tenants-list").then(setTenants); }, [load, principal]);
  function openCreate() {
    const tenant = principal?.tenantType === "PLATFORM" ? tenants.find(item => item.type === category) : { id: principal?.tenantId ?? "" };
    setForm({ id: "", tenantId: tenant?.id ?? "", name: "", email: "", phone: "", role: roles[category][0]?.[0] ?? "", status: "ACTIVE", password: "" });
    setError(""); setModalOpen(true);
  }
  function openEdit(user: UserItem) { setForm({ id: user.id, tenantId: user.tenantId, name: user.name, email: user.email, phone: user.phone ?? "", role: user.role, status: user.status, password: "" }); setError(""); setModalOpen(true); }
  async function save(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      await apiRequest(form.id ? "/users-update" : "/users-create", { method: "POST", body: JSON.stringify(form) });
      await load(); setModalOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : copy("Kullanıcı kaydedilemedi.", "User could not be saved.")); }
  }
  async function remove(user: UserItem) {
    if (!window.confirm(copy(`${user.name} hesabını silmek istiyor musunuz?`, `Do you want to delete the account for ${user.name}?`))) return;
    try { await apiRequest("/users-delete", { method: "POST", body: JSON.stringify({ id: user.id }) }); await load(); }
    catch (reason) { window.alert(reason instanceof Error ? reason.message : copy("Kullanıcı silinemedi.", "User could not be deleted.")); }
  }
  const selectableTenants = tenants.filter(item => item.type === category);
  return <>
    <PageHeader eyebrow="" title={copy("Kullanıcı yönetimi", "User management")} description={copy("Bakımnerde, CPO, taşeron yönetimi ve mobil saha hesaplarını ayrı alanlarda yönetin.", "Manage Bakımnerde, CPO, technical service management and mobile field accounts in separate areas.")} />
    <div className="account-category-tabs">{categories.map(item => <button className={item === category ? "is-active" : ""} onClick={() => setCategory(item)} key={item}>{item === "PLATFORM" ? <ShieldCheck /> : item === "CPO" ? <Users /> : <HardHat />}<span>{categoryLabel(item)}</span></button>)}</div>
    <section className="data-card"><div className="account-table-head"><div><h2>{categoryLabel(category)}</h2><p>{category === "CONTRACTOR" ? copy("Yönetim paneli ve mobil saha hesapları birlikte görünür.", "Management panel and mobile field accounts are shown together.") : copy("Bu gruba ait tüm aktif ve askıdaki hesaplar.", "All active and suspended accounts in this group.")}</p></div><button className="button button--primary" onClick={openCreate}><Plus size={16} /> {copy("Hesap ekle", "Add account")}</button></div><div className="data-table account-table"><div className="data-row data-head"><span>{copy("KULLANICI", "USER")}</span><span>{copy("ŞİRKET", "COMPANY")}</span><span>{copy("ROL / KANAL", "ROLE / CHANNEL")}</span><span>{copy("DURUM", "STATUS")}</span><span>{copy("SON GİRİŞ", "LAST SIGN-IN")}</span><span>{copy("İŞLEMLER", "ACTIONS")}</span></div>{users.map(user => <div className="data-row" key={user.id}><span className="company-cell"><i>{user.name.split(" ").map(item => item[0]).join("").slice(0,2)}</i><span><b>{user.name}{user.id === principal?.userId && <em className="current-user">{copy("Siz", "You")}</em>}</b><small>{user.email} · {user.phone || copy("Telefon yok", "No phone")}</small></span></span><span><b>{user.tenantName}</b></span><span className="role-cell">{user.role === "FIELD_WORKER" ? <Smartphone /> : <UserRound />}<span><b>{userRoleLabel(category, user.role, language)}</b><small>{user.role === "FIELD_WORKER" ? copy("Panel erişimi yok", "No panel access") : copy("Web panel", "Web panel")}</small></span></span><span><i className={`account-status ${user.status === "ACTIVE" ? "active" : ""}`} />{user.status === "ACTIVE" ? copy("Aktif", "Active") : copy("Askıda", "Suspended")}</span><span>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString(locale) : copy("Henüz giriş yok", "No sign-in yet")}</span><span className="row-actions"><button onClick={() => openEdit(user)} aria-label={copy(`${user.name} hesabını düzenle`, `Edit account for ${user.name}`)} title={copy("Düzenle", "Edit")}><Edit3 /></button><button className="danger" disabled={user.id === principal?.userId || user.role === "PLATFORM_OWNER"} onClick={() => void remove(user)} aria-label={copy(`${user.name} hesabını sil`, `Delete account for ${user.name}`)} title={copy("Sil", "Delete")}><Trash2 /></button></span></div>)}{users.length === 0 && <div className="empty-state"><b>{copy("Hesap bulunamadı", "No accounts found")}</b><span>{copy("Bu grupta henüz kullanıcı hesabı yok.", "There are no user accounts in this group yet.")}</span></div>}</div></section>
    {modalOpen && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label={copy("Kapat", "Close")} /><form className="tenant-modal compact-modal" onSubmit={save} role="dialog" aria-modal="true" aria-label={form.id ? copy("Hesap düzenle", "Edit account") : copy("Yeni hesap", "New account")}><div className="modal-head"><div><p className="eyebrow">{form.id ? copy("HESAP DÜZENLE", "EDIT ACCOUNT") : copy("YENİ HESAP", "NEW ACCOUNT")}</p><h2>{categoryLabel(category)}</h2><span>{copy("Rol ve erişim kanalı tenant türüne göre sınırlandırılır.", "Role and access channel are restricted by tenant type.")}</span></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)} aria-label={copy("Kapat", "Close")}><X /></button></div><div className="modal-fields">{principal?.tenantType === "PLATFORM" && category !== "PLATFORM" && <label><span>{category === "CONTRACTOR" ? copy("Taşeron firma", "Technical service company") : copy("CPO firma", "CPO company")}</span><select required value={form.tenantId} onChange={event => setForm({ ...form, tenantId: event.target.value })}><option value="">{copy("Firma seçin", "Select a company")}</option>{selectableTenants.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}<label><span>{copy("Ad soyad", "Full name")}</span><input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label><span>{copy("E-posta", "Email")}</span><input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label><PhoneInput label={copy("Telefon", "Phone")} value={form.phone} onChange={phone => setForm({ ...form, phone })} /><label><span>{copy("Rol", "Role")}</span><select value={form.role} disabled={form.role === "PLATFORM_OWNER"} onChange={event => setForm({ ...form, role: event.target.value })}>{roles[category].filter(item => item[0] !== "PLATFORM_OWNER" || form.role === "PLATFORM_OWNER").map(item => <option value={item[0]} key={item[0]}>{roleLabel(item)}</option>)}</select></label>{form.id && <label><span>{copy("Durum", "Status")}</span><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as FormState["status"] })}><option value="ACTIVE">{copy("Aktif", "Active")}</option><option value="SUSPENDED">{copy("Askıda", "Suspended")}</option></select></label>}<label><span>{form.id ? copy("Yeni parola (isteğe bağlı)", "New password (optional)") : copy("İlk parola", "Initial password")}</span><input required={!form.id} minLength={form.password ? 8 : undefined} type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></label></div>{error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>{copy("Vazgeç", "Cancel")}</button><button className="button button--primary">{copy("Kaydet", "Save")}</button></div></form></div>}
  </>;
}

function userRoleLabel(category: Category, role: string, language: "tr" | "en"): string {
  const item = roles[category].find(([value]) => value === role);
  return item?.[language === "tr" ? 1 : 2] ?? role;
}
