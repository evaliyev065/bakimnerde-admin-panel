import { CheckCircle2, Clock3, Edit3, Filter, Plus, Search, Trash2, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { TURKEY_PROVINCES } from "../data/turkeyLocations";
import { apiRequest } from "../lib/api";
import { LocationFields, PhoneInput } from "../shared/components/FormControls";
import { PageHeader } from "../shared/components/PageHeader";
import { StatusBadge } from "../shared/components/StatusBadge";

type CompanyKind = "contractor" | "cpo";
interface Company {
  id: string; tenantKey: string; name: string; type: string; status: "ACTIVE" | "SUSPENDED";
  contact: { email: string; phone: string };
  profile?: {
    maintenanceBaseCost?: number; serviceRegions?: string[]; availabilityDays?: number[];
    agreementType?: string; stationCount?: number;
    address?: { city?: string; district?: string; line?: string };
    contractApproval?: { status?: string; fileName?: string; documentData?: string };
  };
}
interface ContractorApplication {
  id: string; applicationNumber: string; companyName: string; taxNumber: string; tradeRegistryNumber: string;
  companyEmail: string; companyPhone: string; website?: string; authorizedName: string; authorizedTitle: string;
  authorizedEmail: string; authorizedPhone: string; city: string; district: string; address: string;
  serviceRegions: string[]; specialties: string[]; availabilityDays: number[]; agreementAcceptedAt: string;
  status: "PENDING" | "APPROVING" | "APPROVED" | "REJECTED"; rejectionReason?: string; createdAt: string;
}
interface CompanyForm {
  id: string; name: string; tenantKey: string; contactEmail: string; contactPhone: string; status: "ACTIVE" | "SUSPENDED";
  adminName: string; adminEmail: string; adminPassword: string; maintenanceBaseCost: string;
  serviceRegions: string; availabilityDays: string; agreementType: string; stationCount: string;
  contractStatus: string; contractFileName: string; contractDocumentData: string;
  city: string; district: string;
}
const emptyForm: CompanyForm = {
  id: "", name: "", tenantKey: "", contactEmail: "", contactPhone: "", status: "ACTIVE",
  adminName: "", adminEmail: "", adminPassword: "", maintenanceBaseCost: "", serviceRegions: "",
  availabilityDays: "1,2,3,4,5", agreementType: "JOB_BASED", stationCount: "0",
  contractStatus: "PENDING", contractFileName: "", contractDocumentData: "",
  city: "", district: "",
};

export function CompaniesPage({ kind }: { kind: CompanyKind }) {
  const isContractor = kind === "contractor";
  const [companies, setCompanies] = useState<Company[]>([]);
  const [applications, setApplications] = useState<ContractorApplication[]>([]);
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const [items, applicationItems] = await Promise.all([
      apiRequest<Company[]>("/tenants-list"),
      isContractor ? apiRequest<ContractorApplication[]>("/contractor-applications-list") : Promise.resolve([]),
    ]);
    setCompanies(items.filter(item => item.type === (isContractor ? "CONTRACTOR" : "CPO")));
    setApplications(applicationItems);
  }, [isContractor]);
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
      contractStatus: company.profile?.contractApproval?.status ?? "PENDING",
      contractFileName: company.profile?.contractApproval?.fileName ?? "",
      contractDocumentData: company.profile?.contractApproval?.documentData ?? "",
      city: company.profile?.address?.city ?? "", district: company.profile?.address?.district ?? "",
    });
    setError(""); setModalOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    const profile = isContractor ? {
      maintenanceBaseCost: Number(form.maintenanceBaseCost || 0),
      serviceRegions: form.serviceRegions.split(",").map(item => item.trim()).filter(Boolean),
      availabilityDays: form.availabilityDays.split(",").map(Number).filter(Boolean),
      contractApproval: {
        status: form.contractStatus, fileName: form.contractFileName, documentData: form.contractDocumentData,
        approvedAt: form.contractStatus === "APPROVED" ? new Date().toISOString() : undefined,
      },
      address: { city: form.city, district: form.district },
    } : {
      agreementType: form.agreementType, stationCount: Number(form.stationCount || 0),
      address: { city: form.city, district: form.district },
    };
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
  async function approveApplication(application: ContractorApplication) {
    if (!window.confirm(`${application.companyName} başvurusunu onaylayıp taşeron hesabını açmak istiyor musunuz?`)) return;
    try {
      await apiRequest("/contractor-applications-approve", { method: "POST", body: JSON.stringify({ id: application.id }) });
      await load();
    } catch (reason) { window.alert(reason instanceof Error ? reason.message : "Başvuru onaylanamadı."); }
  }
  async function rejectApplication(application: ContractorApplication) {
    const reason = window.prompt(`${application.companyName} başvurusu için ret nedenini yazın:`);
    if (!reason?.trim()) return;
    try {
      await apiRequest("/contractor-applications-reject", { method: "POST", body: JSON.stringify({ id: application.id, reason }) });
      await load();
    } catch (failure) { window.alert(failure instanceof Error ? failure.message : "Başvuru reddedilemedi."); }
  }

  return <>
    <PageHeader eyebrow={isContractor ? "HİZMET AĞI" : "MÜŞTERİ AĞI"} title={isContractor ? "Taşeron firmalar" : "CPO firmalar"} description={isContractor ? "Bakım firmalarını, sözleşmelerini, müsaitliklerini ve özel maliyetlerini yönetin." : "Bakım talebi oluşturan firmaları, sözleşme tiplerini ve ticari koşulları yönetin."} />
    {isContractor && <section className="application-panel">
      <div className="application-panel__head"><div><p className="eyebrow">SELF-SERVİS KAYIT</p><h2>Taşeron onay istekleri</h2><span>contractor-registrations.bakimnerde.com üzerinden tamamlanan başvurular</span></div><strong><Clock3 /> {applications.filter((item) => item.status === "PENDING").length} bekleyen</strong></div>
      <div className="application-list">
        {applications.map((application) => <article className={`application-item application-item--${application.status.toLocaleLowerCase("en-US")}`} key={application.id}>
          <div className="application-item__main"><span>{application.companyName.slice(0, 2).toLocaleUpperCase("tr-TR")}</span><div><b>{application.companyName}</b><small>{application.applicationNumber} · {application.city}/{application.district}</small></div></div>
          <div><small>YETKİLİ</small><b>{application.authorizedName}</b><span>{application.authorizedEmail} · {application.authorizedPhone}</span></div>
          <div><small>HİZMET ALANI</small><b>{application.serviceRegions.join(" · ")}</b><span>{application.specialties.map(specialtyLabel).join(", ")}</span></div>
          <div><small>SÖZLEŞME</small><b><CheckCircle2 /> Onaylandı</b><span>{new Date(application.agreementAcceptedAt).toLocaleString("tr-TR")}</span></div>
          <div className="application-actions">
            {application.status === "PENDING" ? <><button className="button button--outline danger-button" onClick={() => void rejectApplication(application)}><XCircle /> Reddet</button><button className="button button--primary" onClick={() => void approveApplication(application)}><CheckCircle2 /> Kaydı tamamla</button></> : <strong>{application.status === "APPROVED" ? "Kayıt tamamlandı" : application.status === "REJECTED" ? `Reddedildi · ${application.rejectionReason ?? ""}` : "İşleniyor"}</strong>}
          </div>
        </article>)}
        {applications.length === 0 && <div className="empty-state"><b>Henüz başvuru yok</b><span>Yeni self-servis kayıtlar burada onay isteği olarak görünecek.</span></div>}
      </div>
    </section>}
    <div className="toolbar"><label className="table-search"><Search size={16} /><input placeholder="Firma adı veya kodu ara" /></label><button className="button button--outline"><Filter size={16} /> Filtrele</button><button className="button button--primary" onClick={openCreate}><Plus size={16} /> {isContractor ? "Taşeron ekle" : "CPO ekle"}</button></div>
    <section className="data-card"><div className={`data-table ${isContractor ? "contractor-table live-company-table" : "cpo-table live-company-table"}`}>
      <div className="data-row data-head"><span>FİRMA</span><span>İLETİŞİM</span><span>{isContractor ? "HİZMET BÖLGESİ" : "ANLAŞMA"}</span><span>{isContractor ? "MÜSAİTLİK" : "İSTASYON"}</span><span>{isContractor ? "BAKIM MALİYETİ" : "TENANT"}</span><span>DURUM</span><span>İŞLEMLER</span></div>
      {companies.map(company => <div className="data-row" key={company.id}>
        <span className="company-cell"><i>{company.name.slice(0, 2).toUpperCase()}</i><span><b>{company.name}</b><small>{company.tenantKey}</small></span></span>
        <span><b>{company.contact.email}</b><small>{company.contact.phone || "Telefon yok"}</small></span>
        <span>{isContractor ? company.profile?.serviceRegions?.join(" · ") || "Tanımlanmadı" : company.profile?.agreementType || "Tanımlanmadı"}</span>
        <span>{isContractor ? <><b>{company.profile?.availabilityDays?.join(", ") || "—"}</b><small>Sözleşme: {company.profile?.contractApproval?.status === "APPROVED" ? "Onaylı" : "Bekliyor"}</small></> : company.profile?.stationCount ?? 0}</span>
        <span className="private-value"><b>{isContractor ? `₺${Number(company.profile?.maintenanceBaseCost ?? 0).toLocaleString("tr-TR")}` : company.tenantKey}</b><small>Yalnız Bakımnerde</small></span>
        <span><StatusBadge status={company.status === "ACTIVE" ? "active" : "pending"} /></span>
        <span className="row-actions"><button onClick={() => openEdit(company)} title="Düzenle"><Edit3 /></button><button className="danger" onClick={() => void remove(company)} title="Sil"><Trash2 /></button></span>
      </div>)}
      {companies.length === 0 && <div className="empty-state"><b>Henüz firma yok</b><span>İlk firmayı ekleyerek başlayın.</span></div>}
    </div></section>
    {modalOpen && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label="Kapat" /><form className="tenant-modal" onSubmit={save}><div className="modal-head"><div><p className="eyebrow">{form.id ? "FİRMA DÜZENLE" : "YENİ FİRMA"}</p><h2>{isContractor ? "Taşeron firma" : "CPO firma"}</h2><span>Bilgiler kaydedildiğinde anında panelde görünür.</span></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)}><X /></button></div>
      <div className="modal-fields"><Field label="Firma adı" value={form.name} set={value => setForm({ ...form, name: value })} required /><Field label="Tenant anahtarı" value={form.tenantKey} set={value => setForm({ ...form, tenantKey: value })} disabled={Boolean(form.id)} required /><Field label="Firma e-postası" value={form.contactEmail} set={value => setForm({ ...form, contactEmail: value })} type="email" required /><PhoneInput label="Telefon" value={form.contactPhone} onChange={value => setForm({ ...form, contactPhone: value })} required />
        {form.id && <label><span>Durum</span><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as CompanyForm["status"] })}><option value="ACTIVE">Aktif</option><option value="SUSPENDED">Askıda</option></select></label>}
        {!form.id && <><Field label="İlk yönetici adı" value={form.adminName} set={value => setForm({ ...form, adminName: value })} required /><Field label="Yönetici e-postası" value={form.adminEmail} set={value => setForm({ ...form, adminEmail: value })} type="email" required /><Field label="İlk parola" value={form.adminPassword} set={value => setForm({ ...form, adminPassword: value })} type="password" required /></>}
        <LocationFields city={form.city} district={form.district} onCityChange={city => setForm(current => ({ ...current, city, district: "" }))} onDistrictChange={district => setForm(current => ({ ...current, district }))} required={false} />
        {isContractor ? <>
          <Field label="Bakım başı maliyet" value={form.maintenanceBaseCost} set={value => setForm({ ...form, maintenanceBaseCost: value })} type="number" />
          <label><span>Hizmet bölgeleri</span><select multiple value={splitValues(form.serviceRegions)} onChange={event => setForm({ ...form, serviceRegions: selectedValues(event.currentTarget).join(",") })}>{TURKEY_PROVINCES.map(item => <option value={item.name} key={item.id}>{item.name}</option>)}</select></label>
          <label><span>Müsait günler</span><select multiple value={splitValues(form.availabilityDays)} onChange={event => setForm({ ...form, availabilityDays: selectedValues(event.currentTarget).join(",") })}>{[["1","Pazartesi"],["2","Salı"],["3","Çarşamba"],["4","Perşembe"],["5","Cuma"],["6","Cumartesi"],["7","Pazar"]].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label><span>Online sözleşme durumu</span><select value={form.contractStatus} onChange={event => setForm({ ...form, contractStatus: event.target.value })}><option value="PENDING">Onay bekliyor</option><option value="APPROVED">Onaylandı</option><option value="REJECTED">Reddedildi</option></select></label>
          <label className="contract-upload"><span>Online sözleşme dosyası (en fazla 600 KB)</span><input type="file" accept=".pdf,.doc,.docx,image/*" onChange={event => void readContract(event.target.files?.[0], setForm, form)} /><small>{form.contractFileName || "Dosya seçilmedi"}</small></label>
        </> : <><label><span>Anlaşma türü</span><select value={form.agreementType} onChange={event => setForm({ ...form, agreementType: event.target.value })}><option value="JOB_BASED">İş bazlı</option><option value="SUBSCRIPTION">Abonelik</option><option value="FRAMEWORK">Çerçeve sözleşme</option></select></label><Field label="İstasyon sayısı" value={form.stationCount} set={value => setForm({ ...form, stationCount: value })} type="number" /></>}
      </div>{error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>Vazgeç</button><button className="button button--primary" disabled={saving}>{saving ? "Kaydediliyor…" : "Kaydet"}</button></div></form></div>}
  </>;
}

function Field({ label, value, set, type = "text", required, disabled }: { label: string; value: string; set(value: string): void; type?: string; required?: boolean; disabled?: boolean }) {
  return <label><span>{label}</span><input type={type} value={value} onChange={event => set(event.target.value)} required={required} disabled={disabled} minLength={type === "password" ? 8 : undefined} /></label>;
}

function selectedValues(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions, option => option.value);
}

function splitValues(value: string): string[] {
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

function specialtyLabel(value: string): string {
  return ({
    PERIODIC_MAINTENANCE: "Periyodik bakım",
    ELECTRICAL: "Elektrik",
    ELECTRONICS: "Elektronik",
    MECHANICAL: "Mekanik",
    SOFTWARE: "Yazılım",
    CHARGER_INSTALLATION: "Şarj cihazı kurulumu",
  } as Record<string, string>)[value] ?? value;
}

async function readContract(file: File | undefined, setForm: (form: CompanyForm) => void, form: CompanyForm) {
  if (!file) return;
  if (file.size > 600 * 1024) { window.alert("Sözleşme dosyası 600 KB sınırını aşıyor."); return; }
  const documentData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  setForm({ ...form, contractFileName: file.name, contractDocumentData: documentData });
}
