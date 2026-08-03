import { Edit3, HardHat, Plus, ShieldCheck, Smartphone, Trash2, UserRound, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth, type TenantType } from "../auth/AuthContext";
import { apiRequest } from "../lib/api";
import { PhoneInput } from "../shared/components/FormControls";
import { PageHeader } from "../shared/components/PageHeader";

type Category = "PLATFORM" | "CPO" | "CONTRACTOR";
interface UserItem { id: string; tenantId: string; tenantName: string; name: string; email: string; phone?: string; role: string; status: "ACTIVE" | "SUSPENDED"; lastLoginAt?: string }
interface Tenant { id: string; name: string; type: TenantType }
interface FormState { id: string; tenantId: string; name: string; email: string; phone: string; role: string; status: "ACTIVE" | "SUSPENDED"; password: string }
const endpoints: Record<Category, string> = { PLATFORM: "/users-platform-list", CPO: "/users-cpo-list", CONTRACTOR: "/users-contractor-list" };
const labels: Record<Category, string> = { PLATFORM: "Bakımnerde ekibi", CPO: "CPO firma hesapları", CONTRACTOR: "Taşeron firma hesapları" };
const roles: Record<Category, Array<[string,string]>> = {
  PLATFORM: [["PLATFORM_STAFF","Bakımnerde personeli"],["PLATFORM_OWNER","Ana Bakımnerde hesabı"]],
  CPO: [["CPO_ADMIN","CPO yöneticisi"],["CPO_STAFF","CPO personeli"]],
  CONTRACTOR: [["CONTRACTOR_ADMIN","Taşeron yöneticisi"],["CONTRACTOR_STAFF","Taşeron operasyon"],["FIELD_WORKER","Saha ekibi · yalnız mobil"]],
};

export function UserManagementPage() {
  const { principal } = useAuth();
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
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Kullanıcı kaydedilemedi."); }
  }
  async function remove(user: UserItem) {
    if (!window.confirm(`${user.name} hesabını silmek istiyor musunuz?`)) return;
    try { await apiRequest("/users-delete", { method: "POST", body: JSON.stringify({ id: user.id }) }); await load(); }
    catch (reason) { window.alert(reason instanceof Error ? reason.message : "Kullanıcı silinemedi."); }
  }
  const selectableTenants = tenants.filter(item => item.type === category);
  return <>
    <PageHeader eyebrow="" title="Kullanıcı yönetimi" description="Bakımnerde, CPO, taşeron yönetimi ve mobil saha hesaplarını ayrı alanlarda yönetin." />
    <div className="account-category-tabs">{categories.map(item => <button className={item === category ? "is-active" : ""} onClick={() => setCategory(item)} key={item}>{item === "PLATFORM" ? <ShieldCheck /> : item === "CPO" ? <Users /> : <HardHat />}<span>{labels[item]}</span></button>)}</div>
    <section className="data-card"><div className="account-table-head"><div><h2>{labels[category]}</h2><p>{category === "CONTRACTOR" ? "Yönetim paneli ve mobil saha hesapları birlikte görünür." : "Bu gruba ait tüm aktif ve askıdaki hesaplar."}</p></div><button className="button button--primary" onClick={openCreate}><Plus size={16} /> Hesap ekle</button></div><div className="data-table account-table"><div className="data-row data-head"><span>KULLANICI</span><span>ŞİRKET</span><span>ROL / KANAL</span><span>DURUM</span><span>SON GİRİŞ</span><span>İŞLEMLER</span></div>{users.map(user => <div className="data-row" key={user.id}><span className="company-cell"><i>{user.name.split(" ").map(item => item[0]).join("").slice(0,2)}</i><span><b>{user.name}{user.id === principal?.userId && <em className="current-user">Siz</em>}</b><small>{user.email} · {user.phone || "Telefon yok"}</small></span></span><span><b>{user.tenantName}</b></span><span className="role-cell">{user.role === "FIELD_WORKER" ? <Smartphone /> : <UserRound />}<span><b>{roles[category].find(item => item[0] === user.role)?.[1] ?? user.role}</b><small>{user.role === "FIELD_WORKER" ? "Panel erişimi yok" : "Web panel"}</small></span></span><span><i className={`account-status ${user.status === "ACTIVE" ? "active" : ""}`} />{user.status === "ACTIVE" ? "Aktif" : "Askıda"}</span><span>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("tr-TR") : "Henüz giriş yok"}</span><span className="row-actions"><button onClick={() => openEdit(user)}><Edit3 /></button><button className="danger" disabled={user.id === principal?.userId || user.role === "PLATFORM_OWNER"} onClick={() => void remove(user)}><Trash2 /></button></span></div>)}</div></section>
    {modalOpen && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label="Kapat" /><form className="tenant-modal compact-modal" onSubmit={save}><div className="modal-head"><div><p className="eyebrow">{form.id ? "HESAP DÜZENLE" : "YENİ HESAP"}</p><h2>{labels[category]}</h2><span>Rol ve erişim kanalı tenant türüne göre sınırlandırılır.</span></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)}><X /></button></div><div className="modal-fields">{principal?.tenantType === "PLATFORM" && category !== "PLATFORM" && <label><span>{category === "CONTRACTOR" ? "Taşeron firma" : "CPO firma"}</span><select required value={form.tenantId} onChange={event => setForm({ ...form, tenantId: event.target.value })}><option value="">Firma seçin</option>{selectableTenants.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}<label><span>Ad soyad</span><input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label><span>E-posta</span><input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label><PhoneInput label="Telefon" value={form.phone} onChange={phone => setForm({ ...form, phone })} /><label><span>Rol</span><select value={form.role} disabled={form.role === "PLATFORM_OWNER"} onChange={event => setForm({ ...form, role: event.target.value })}>{roles[category].filter(item => item[0] !== "PLATFORM_OWNER" || form.role === "PLATFORM_OWNER").map(item => <option value={item[0]} key={item[0]}>{item[1]}</option>)}</select></label>{form.id && <label><span>Durum</span><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as FormState["status"] })}><option value="ACTIVE">Aktif</option><option value="SUSPENDED">Askıda</option></select></label>}<label><span>{form.id ? "Yeni parola (isteğe bağlı)" : "İlk parola"}</span><input required={!form.id} minLength={form.password ? 8 : undefined} type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></label></div>{error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>Vazgeç</button><button className="button button--primary">Kaydet</button></div></form></div>}
  </>;
}
