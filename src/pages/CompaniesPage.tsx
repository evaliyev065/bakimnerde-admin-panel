import { Edit3, Filter, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";
import { StatusBadge } from "../shared/components/StatusBadge";

type CompanyKind = "contractor" | "cpo";
interface Company {
  id: string; tenantKey: string; name: string; type: string; status: "ACTIVE" | "SUSPENDED";
  contact: { email: string; phone: string };
  profile?: { maintenanceBaseCost?: number; serviceRegions?: string[]; availabilityDays?: number[]; agreementType?: string; stationCount?: number };
}
interface CompanyForm {
  id: string; name: string; tenantKey: string; contactEmail: string; contactPhone: string; status: "ACTIVE" | "SUSPENDED";
  adminName: string; adminEmail: string; adminPassword: string; maintenanceBaseCost: string;
  serviceRegions: string; availabilityDays: string; agreementType: string; stationCount: string;
}
const emptyForm: CompanyForm = { id: "", name: "", tenantKey: "", contactEmail: "", contactPhone: "", status: "ACTIVE", adminName: "", adminEmail: "", adminPassword: "", maintenanceBaseCost: "", serviceRegions: "", availabilityDays: "1,2,3,4,5", agreementType: "JOB_BASED", stationCount: "0" };

export function CompaniesPage({ kind }: { kind: CompanyKind }) {
  const isContractor = kind === "contractor";
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => apiRequest<Company[]>("/tenants-list").then(items => setCompanies(items.filter(item => item.type === (isContractor ? "CONTRACTOR" : "CPO")))), [isContractor]);
  useEffect(() => { void load(); }, [load]);

  function openCreate() { setForm(emptyForm); setError(""); setModalOpen(true); }
  function openEdit(company: Company) {
    setForm({
      ...emptyForm, id: company.id, name: company.name, tenantKey: company.tenantKey,
      contactEmail: company.contact.email, contactPhone: company.contact.phone, status: company.status,
      maintenanceBaseCost: String(company.profile?.maintenanceBaseCost ?? ""),
      serviceRegions: company.profile?.serviceRegions?.join(", ") ?? "",
      availabilityDays: company.profile?.availabilityDays?.join(",") ?? "1,2,3,4,5",
      agreementType: company.profile?.agreementType ?? "JOB_BASED", stationCount: String(company.profile?.stationCount ?? 0),
    });
    setError(""); setModalOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const profile = isContractor ? {
      maintenanceBaseCost: Number(form.maintenanceBaseCost || 0),
      serviceRegions: form.serviceRegions.split(",").map(item => item.trim()).filter(Boolean),
      availabilityDays: form.availabilityDays.split(",").map(Number).filter(Boolean),
      contractApproval: { status: "PENDING" },
    } : { agreementType: form.agreementType, stationCount: Number(form.stationCount || 0) };
    try {
      if (form.id) {
        await apiRequest("/tenants-update", { method: "POST", body: JSON.stringify({
          id: form.id, name: form.name, contactEmail: form.contactEmail, contactPhone: form.contactPhone, status: form.status, profile,
        }) });
      } else {
        await apiRequest("/tenants-create", { method: "POST", body: JSON.stringify({
          name: form.name, tenantKey: form.tenantKey, type: isContractor ? "CONTRACTOR" : "CPO",
          contactEmail: form.contactEmail, contactPhone: form.contactPhone, adminName: form.adminName,
          adminEmail: form.adminEmail, adminPassword: form.adminPassword, profile,
        }) });
      }
      await load(); setModalOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "İşlem tamamlanamadı."); }
    finally { setSaving(false); }
  }
  async function remove(company: Company) {
    if (!window.confirm(`${company.name} firmasını kalıcı olarak silmek istiyor musunuz?`)) return;
    try { await apiRequest("/tenants-delete", { method: "POST", body: JSON.stringify({ id: company.id }) }); await load(); }
    catch (reason) { window.alert(reason instanceof Error ? reason.message : "Firma silinemedi."); }
  }

  return <>
    <PageHeader eyebrow={isContractor ? "HİZMET AĞI" : "MÜŞTERİ AĞI"} title={isContractor ? "Taşeron firmalar" : "CPO firmalar"} description={isContractor ? "Bakım firmalarını, sözleşmelerini, müsaitliklerini ve özel maliyetlerini yönetin." : "Bakım talebi oluşturan firmaları, sözleşme tiplerini ve ticari koşulları yönetin."} />
    <div className="toolbar"><label className="table-search"><Search size={16} /><input placeholder="Firma adı veya kodu ara" /></label><button className="button button--outline"><Filter size={16} /> Filtrele</button><button className="button button--primary" onClick={openCreate}><Plus size={16} /> {isContractor ? "Taşeron ekle" : "CPO ekle"}</button></div>
    <section className="data-card"><div className={`data-table ${isContractor ? "contractor-table live-company-table" : "cpo-table live-company-table"}`}>
      <div className="data-row data-head"><span>FİRMA</span><span>İLETİŞİM</span><span>{isContractor ? "HİZMET BÖLGESİ" : "ANLAŞMA"}</span><span>{isContractor ? "MÜSAİTLİK" : "İSTASYON"}</span><span>{isContractor ? "BAKIM MALİYETİ" : "TENANT"}</span><span>DURUM</span><span>İŞLEMLER</span></div>
      {companies.map(company => <div className="data-row" key={company.id}>
        <span className="company-cell"><i>{company.name.slice(0, 2).toUpperCase()}</i><span><b>{company.name}</b><small>{company.tenantKey}</small></span></span>
        <span><b>{company.contact.email}</b><small>{company.contact.phone || "Telefon yok"}</small></span>
        <span>{isContractor ? company.profile?.serviceRegions?.join(" · ") || "Tanımlanmadı" : company.profile?.agreementType || "Tanımlanmadı"}</span>
        <span>{isContractor ? company.profile?.availabilityDays?.join(", ") || "—" : company.profile?.stationCount ?? 0}</span>
        <span className="private-value"><b>{isContractor ? `₺${Number(company.profile?.maintenanceBaseCost ?? 0).toLocaleString("tr-TR")}` : company.tenantKey}</b><small>Yalnız Bakımnerde</small></span>
        <span><StatusBadge status={company.status === "ACTIVE" ? "active" : "pending"} /></span>
        <span className="row-actions"><button onClick={() => openEdit(company)} title="Düzenle"><Edit3 /></button><button className="danger" onClick={() => void remove(company)} title="Sil"><Trash2 /></button></span>
      </div>)}
      {companies.length === 0 && <div className="empty-state"><b>Henüz firma yok</b><span>İlk firmayı ekleyerek başlayın.</span></div>}
    </div></section>
    {modalOpen && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label="Kapat" /><form className="tenant-modal" onSubmit={save}><div className="modal-head"><div><p className="eyebrow">{form.id ? "FİRMA DÜZENLE" : "YENİ FİRMA"}</p><h2>{isContractor ? "Taşeron firma" : "CPO firma"}</h2><span>Bilgiler kaydedildiğinde anında panelde görünür.</span></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)}><X /></button></div>
      <div className="modal-fields"><Field label="Firma adı" value={form.name} set={value => setForm({ ...form, name: value })} required /><Field label="Tenant anahtarı" value={form.tenantKey} set={value => setForm({ ...form, tenantKey: value })} disabled={Boolean(form.id)} required /><Field label="Firma e-postası" value={form.contactEmail} set={value => setForm({ ...form, contactEmail: value })} type="email" required /><Field label="Telefon" value={form.contactPhone} set={value => setForm({ ...form, contactPhone: value })} />
        {form.id && <label><span>Durum</span><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as CompanyForm["status"] })}><option value="ACTIVE">Aktif</option><option value="SUSPENDED">Askıda</option></select></label>}
        {!form.id && <><Field label="İlk yönetici adı" value={form.adminName} set={value => setForm({ ...form, adminName: value })} required /><Field label="Yönetici e-postası" value={form.adminEmail} set={value => setForm({ ...form, adminEmail: value })} type="email" required /><Field label="İlk parola" value={form.adminPassword} set={value => setForm({ ...form, adminPassword: value })} type="password" required /></>}
        {isContractor ? <><Field label="Bakım başı maliyet" value={form.maintenanceBaseCost} set={value => setForm({ ...form, maintenanceBaseCost: value })} type="number" /><Field label="Hizmet bölgeleri (virgülle)" value={form.serviceRegions} set={value => setForm({ ...form, serviceRegions: value })} /><Field label="Müsait günler (1-7)" value={form.availabilityDays} set={value => setForm({ ...form, availabilityDays: value })} /></> : <><Field label="Anlaşma türü" value={form.agreementType} set={value => setForm({ ...form, agreementType: value })} /><Field label="İstasyon sayısı" value={form.stationCount} set={value => setForm({ ...form, stationCount: value })} type="number" /></>}
      </div>{error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>Vazgeç</button><button className="button button--primary" disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</button></div></form></div>}
  </>;
}

function Field({ label, value, set, type = "text", required, disabled }: { label: string; value: string; set(value: string): void; type?: string; required?: boolean; disabled?: boolean }) {
  return <label><span>{label}</span><input type={type} value={value} onChange={event => set(event.target.value)} required={required} disabled={disabled} minLength={type === "password" ? 8 : undefined} /></label>;
}
