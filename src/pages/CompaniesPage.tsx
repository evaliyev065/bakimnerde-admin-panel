import { CheckCircle2, Clock3, Edit3, Plus, Search, Trash2, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { usePreferences } from "../app/PreferencesContext";
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
    maintenanceBaseCost?: number; serviceRegions?: string[]; activityAreas?: string[]; specialties?: string[]; availabilityDays?: number[];
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
  serviceRegions: string; activityAreas: string; availabilityDays: string; agreementType: string; stationCount: string;
  contractStatus: string; contractFileName: string; contractDocumentData: string;
  city: string; district: string;
}
const emptyForm: CompanyForm = {
  id: "", name: "", tenantKey: "", contactEmail: "", contactPhone: "", status: "ACTIVE",
  adminName: "", adminEmail: "", adminPassword: "", maintenanceBaseCost: "", serviceRegions: "", activityAreas: "",
  availabilityDays: "1,2,3,4,5", agreementType: "JOB_BASED", stationCount: "0",
  contractStatus: "PENDING", contractFileName: "", contractDocumentData: "",
  city: "", district: "",
};
const weekdayOptions = [
  ["1", "Pazartesi", "Monday"], ["2", "Salı", "Tuesday"], ["3", "Çarşamba", "Wednesday"], ["4", "Perşembe", "Thursday"],
  ["5", "Cuma", "Friday"], ["6", "Cumartesi", "Saturday"], ["7", "Pazar", "Sunday"],
] as const;

export function CompaniesPage({ kind }: { kind: CompanyKind }) {
  const { language, locale } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
  const isContractor = kind === "contractor";
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState("");
  const [applications, setApplications] = useState<ContractorApplication[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
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
  const visibleCompanies = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return needle ? companies.filter((company) => `${company.name} ${company.tenantKey} ${company.contact.email} ${company.contact.phone} ${company.profile?.address?.city ?? ""} ${company.profile?.address?.district ?? ""}`.toLocaleLowerCase(locale).includes(needle)) : companies;
  }, [companies, locale, query]);

  function openCreate() { setForm(emptyForm); setError(""); setModalOpen(true); }
  function openEdit(company: Company) {
    setForm({
      ...emptyForm, id: company.id, name: company.name, tenantKey: company.tenantKey,
      contactEmail: company.contact.email, contactPhone: company.contact.phone, status: company.status,
      maintenanceBaseCost: String(company.profile?.maintenanceBaseCost ?? ""),
      serviceRegions: company.profile?.serviceRegions?.join(", ") ?? "",
      activityAreas: (company.profile?.activityAreas ?? company.profile?.specialties)?.join(",") ?? "",
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
      activityAreas: splitValues(form.activityAreas),
      specialties: splitValues(form.activityAreas),
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
    } catch (reason) { setError(reason instanceof Error ? reason.message : copy("İşlem tamamlanamadı.", "The operation could not be completed.")); }
    finally { setSaving(false); }
  }
  async function remove(company: Company) {
    if (!window.confirm(copy(`${company.name} firmasını kalıcı olarak silmek istiyor musunuz?`, `Do you want to permanently delete ${company.name}?`))) return;
    try { await apiRequest("/tenants-delete", { method: "POST", body: JSON.stringify({ id: company.id }) }); await load(); }
    catch (reason) { window.alert(reason instanceof Error ? reason.message : copy("Firma silinemedi.", "Company could not be deleted.")); }
  }
  async function approveApplication(application: ContractorApplication) {
    if (!window.confirm(copy(`${application.companyName} başvurusunu onaylayıp taşeron hesabını açmak istiyor musunuz?`, `Do you want to approve ${application.companyName}'s application and open its technical service account?`))) return;
    try {
      await apiRequest("/contractor-applications-approve", { method: "POST", body: JSON.stringify({ id: application.id }) });
      await load();
    } catch (reason) { window.alert(reason instanceof Error ? reason.message : copy("Başvuru onaylanamadı.", "Application could not be approved.")); }
  }
  async function rejectApplication(application: ContractorApplication) {
    const reason = window.prompt(copy(`${application.companyName} başvurusu için ret nedenini yazın:`, `Enter the rejection reason for ${application.companyName}'s application:`));
    if (!reason?.trim()) return;
    try {
      await apiRequest("/contractor-applications-reject", { method: "POST", body: JSON.stringify({ id: application.id, reason }) });
      await load();
    } catch (failure) { window.alert(failure instanceof Error ? failure.message : copy("Başvuru reddedilemedi.", "Application could not be rejected.")); }
  }

  return <>
    <PageHeader eyebrow={isContractor ? copy("HİZMET AĞI", "SERVICE NETWORK") : copy("MÜŞTERİ AĞI", "CUSTOMER NETWORK")} title={isContractor ? copy("Taşeron firmalar", "Technical service companies") : copy("CPO firmalar", "CPO companies")} description={isContractor ? copy("Bakım firmalarını, sözleşmelerini, müsaitliklerini ve özel maliyetlerini yönetin.", "Manage maintenance companies, contracts, availability and custom costs.") : copy("Bakım talebi oluşturan firmaları, sözleşme tiplerini ve ticari koşulları yönetin.", "Manage companies that create maintenance requests, agreement types and commercial terms.")} />
    {isContractor && <section className="application-panel">
      <div className="application-panel__head"><div><p className="eyebrow">{copy("SELF-SERVİS KAYIT", "SELF-SERVICE REGISTRATION")}</p><h2>{copy("Taşeron onay istekleri", "Technical service approval requests")}</h2><span>{copy("contractor-registrations.bakimnerde.com üzerinden tamamlanan başvurular", "Applications completed through contractor-registrations.bakimnerde.com")}</span></div><strong><Clock3 /> {applications.filter((item) => item.status === "PENDING").length} {copy("bekleyen", "pending")}</strong></div>
      <div className="application-list">
        {applications.map((application) => <article className={`application-item application-item--${application.status.toLocaleLowerCase("en-US")}`} key={application.id}>
          <div className="application-item__main"><span>{application.companyName.slice(0, 2).toLocaleUpperCase(locale)}</span><div><b>{application.companyName}</b><small>{application.applicationNumber} · {application.city}/{application.district}</small></div></div>
          <div><small>{copy("YETKİLİ", "AUTHORIZED PERSON")}</small><b>{application.authorizedName}</b><span>{application.authorizedEmail} · {application.authorizedPhone}</span></div>
          <div><small>{copy("HİZMET ALANI", "SERVICE AREA")}</small><b>{application.serviceRegions.join(" · ")}</b><span>{application.specialties.map((value) => specialtyLabel(value, language)).join(", ")}</span></div>
          <div><small>{copy("SÖZLEŞME", "AGREEMENT")}</small><b><CheckCircle2 /> {copy("Onaylandı", "Accepted")}</b><span>{new Date(application.agreementAcceptedAt).toLocaleString(locale)}</span></div>
          <div className="application-actions">
            {application.status === "PENDING" ? <><button className="button button--outline danger-button" onClick={() => void rejectApplication(application)}><XCircle /> {copy("Reddet", "Reject")}</button><button className="button button--primary" onClick={() => void approveApplication(application)}><CheckCircle2 /> {copy("Kaydı tamamla", "Complete registration")}</button></> : <strong>{application.status === "APPROVED" ? copy("Kayıt tamamlandı", "Registration completed") : application.status === "REJECTED" ? `${copy("Reddedildi", "Rejected")} · ${application.rejectionReason ?? ""}` : copy("İşleniyor", "Processing")}</strong>}
          </div>
        </article>)}
        {applications.length === 0 && <div className="empty-state"><b>{copy("Henüz başvuru yok", "No applications yet")}</b><span>{copy("Yeni self-servis kayıtlar burada onay isteği olarak görünecek.", "New self-service registrations will appear here as approval requests.")}</span></div>}
      </div>
    </section>}
    <div className="toolbar"><label className="table-search"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy("Firma adı veya kodu ara", "Search company name or code")} /></label><button className="button button--primary" onClick={openCreate}><Plus size={16} /> {isContractor ? copy("Taşeron ekle", "Add technical service") : copy("CPO ekle", "Add CPO")}</button></div>
    <section className="data-card"><div className={`data-table ${isContractor ? "contractor-table live-company-table" : "cpo-table live-company-table"}`}>
      <div className="data-row data-head"><span>{copy("FİRMA", "COMPANY")}</span><span>{copy("İLETİŞİM", "CONTACT")}</span><span>{copy("KONUM", "LOCATION")}</span><span>{copy("FİRMA TÜRÜ", "COMPANY TYPE")}</span><span>{copy("FİRMA KODU", "COMPANY CODE")}</span><span>{copy("DURUM", "STATUS")}</span><span>{copy("İŞLEMLER", "ACTIONS")}</span></div>
      {visibleCompanies.map(company => <div className="data-row company-summary-row" key={company.id} onClick={() => setSelectedCompany(company)}>
        <span className="company-cell"><i>{company.name.slice(0, 2).toUpperCase()}</i><span><b>{company.name}</b><small>{company.tenantKey}</small></span></span>
        <span><b>{company.contact.email}</b><small>{company.contact.phone || copy("Telefon yok", "No phone")}</small></span>
        <span>{[company.profile?.address?.district, company.profile?.address?.city].filter(Boolean).join(" / ") || copy("Tanımlanmadı", "Not defined")}</span>
        <span><b>{isContractor ? copy("Taşeron firma", "Technical service company") : copy("CPO firma", "CPO company")}</b><small>{copy("Detay için firmaya tıklayın", "Click the company for details")}</small></span>
        <span><b>{company.tenantKey}</b></span>
        <span><StatusBadge status={company.status === "ACTIVE" ? "active" : "pending"} /></span>
        <span className="row-actions"><button onClick={(event) => { event.stopPropagation(); openEdit(company); }} title={copy("Düzenle", "Edit")} aria-label={copy(`${company.name} firmasını düzenle`, `Edit ${company.name}`)}><Edit3 /></button><button className="danger" onClick={(event) => { event.stopPropagation(); void remove(company); }} title={copy("Sil", "Delete")} aria-label={copy(`${company.name} firmasını sil`, `Delete ${company.name}`)}><Trash2 /></button></span>
      </div>)}
      {visibleCompanies.length === 0 && <div className="empty-state"><b>{query ? copy("Aramayla eşleşen firma yok", "No companies match the search") : copy("Henüz firma yok", "No companies yet")}</b><span>{query ? copy("Arama ölçütünü değiştirin.", "Change the search criteria.") : copy("İlk firmayı ekleyerek başlayın.", "Start by adding the first company.")}</span></div>}
    </div></section>
    {selectedCompany && <div className="drawer-wrap"><button className="drawer-backdrop" onClick={() => setSelectedCompany(null)} aria-label={copy("Kapat", "Close")} /><aside className="detail-drawer company-detail-drawer" role="dialog" aria-modal="true" aria-label={copy("Firma detayı", "Company details")}>
      <div className="drawer-head"><div><span>{copy("FİRMA DETAYI", "COMPANY DETAILS")}</span><h2>{selectedCompany.name}</h2><p>{selectedCompany.type === "CONTRACTOR" ? copy("Taşeron firma", "Technical service company") : copy("CPO firma", "CPO company")} · {selectedCompany.tenantKey}</p></div><button autoFocus className="icon-button" onClick={() => setSelectedCompany(null)} aria-label={copy("Kapat", "Close")}><X /></button></div>
      <section className="drawer-section"><h3>{copy("Temel firma bilgileri", "Basic company information")}</h3><div className="detail-summary"><div><small>{copy("E-POSTA", "EMAIL")}</small><b>{selectedCompany.contact.email}</b></div><div><small>{copy("TELEFON", "PHONE")}</small><b>{selectedCompany.contact.phone || "—"}</b></div><div><small>{copy("DURUM", "STATUS")}</small><b>{selectedCompany.status === "ACTIVE" ? copy("Aktif", "Active") : copy("Askıda", "Suspended")}</b></div><div><small>{copy("KONUM", "LOCATION")}</small><b>{[selectedCompany.profile?.address?.district, selectedCompany.profile?.address?.city].filter(Boolean).join(" / ") || copy("Tanımlanmadı", "Not defined")}</b></div></div></section>
      {selectedCompany.type === "CONTRACTOR" ? <section className="drawer-section"><h3>{copy("Teknik servis kapsamı", "Technical service coverage")}</h3><div className="detail-summary"><div><small>{copy("HİZMET BÖLGELERİ", "SERVICE REGIONS")}</small><b>{selectedCompany.profile?.serviceRegions?.join(", ") || copy("Tanımlanmadı", "Not defined")}</b></div><div><small>{copy("FAALİYET ALANLARI", "ACTIVITY AREAS")}</small><b>{(selectedCompany.profile?.activityAreas ?? selectedCompany.profile?.specialties)?.map((value) => specialtyLabel(value, language)).join(", ") || copy("Tanımlanmadı", "Not defined")}</b></div><div><small>{copy("MÜSAİT GÜNLER", "AVAILABLE DAYS")}</small><b>{availabilityDaysLabel(selectedCompany.profile?.availabilityDays, language)}</b></div><div><small>{copy("SÖZLEŞME", "AGREEMENT")}</small><b>{contractStatusLabel(selectedCompany.profile?.contractApproval?.status, language)}</b></div><div><small>{copy("BAKIM MALİYETİ", "MAINTENANCE COST")}</small><b>{new Intl.NumberFormat(locale, { style: "currency", currency: "TRY" }).format(Number(selectedCompany.profile?.maintenanceBaseCost ?? 0))}</b></div></div></section> : <section className="drawer-section"><h3>{copy("CPO firma detayları", "CPO company details")}</h3><div className="detail-summary"><div><small>{copy("ANLAŞMA", "AGREEMENT")}</small><b>{agreementTypeLabel(selectedCompany.profile?.agreementType, language)}</b></div><div><small>{copy("İSTASYON SAYISI", "STATION COUNT")}</small><b>{Number(selectedCompany.profile?.stationCount ?? 0).toLocaleString(locale)}</b></div></div></section>}
    </aside></div>}
    {modalOpen && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label={copy("Kapat", "Close")} /><form className="tenant-modal" onSubmit={save} role="dialog" aria-modal="true" aria-label={form.id ? copy("Firma düzenle", "Edit company") : copy("Yeni firma", "New company")}><div className="modal-head"><div><p className="eyebrow">{form.id ? copy("FİRMA DÜZENLE", "EDIT COMPANY") : copy("YENİ FİRMA", "NEW COMPANY")}</p><h2>{isContractor ? copy("Taşeron firma", "Technical service company") : copy("CPO firma", "CPO company")}</h2><span>{copy("Bilgiler kaydedildiğinde anında panelde görünür.", "Saved information appears in the panel immediately.")}</span></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)} aria-label={copy("Kapat", "Close")}><X /></button></div>
      <div className="modal-fields"><Field label={copy("Firma adı", "Company name")} value={form.name} set={value => setForm({ ...form, name: value })} required /><Field label={copy("Firma kodu", "Company code")} value={form.tenantKey} set={value => setForm({ ...form, tenantKey: value })} disabled={Boolean(form.id)} required /><Field label={copy("Firma e-postası", "Company email")} value={form.contactEmail} set={value => setForm({ ...form, contactEmail: value })} type="email" required /><PhoneInput label={copy("Telefon", "Phone")} value={form.contactPhone} onChange={value => setForm({ ...form, contactPhone: value })} required />
        {form.id && <label><span>{copy("Durum", "Status")}</span><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as CompanyForm["status"] })}><option value="ACTIVE">{copy("Aktif", "Active")}</option><option value="SUSPENDED">{copy("Askıda", "Suspended")}</option></select></label>}
        {!form.id && <><Field label={copy("İlk yönetici adı", "Initial administrator name")} value={form.adminName} set={value => setForm({ ...form, adminName: value })} required /><Field label={copy("Yönetici e-postası", "Administrator email")} value={form.adminEmail} set={value => setForm({ ...form, adminEmail: value })} type="email" required /><Field label={copy("İlk parola", "Initial password")} value={form.adminPassword} set={value => setForm({ ...form, adminPassword: value })} type="password" required /></>}
        <LocationFields city={form.city} district={form.district} cityLabel={copy("İl", "City")} districtLabel={copy("İlçe", "District")} onCityChange={city => setForm(current => ({ ...current, city, district: "" }))} onDistrictChange={district => setForm(current => ({ ...current, district }))} required={false} />
        {isContractor ? <>
          <Field label={copy("Bakım başı maliyet", "Cost per maintenance")} value={form.maintenanceBaseCost} set={value => setForm({ ...form, maintenanceBaseCost: value })} type="number" />
          <label><span>{copy("Hizmet bölgeleri", "Service regions")}</span><select multiple value={splitValues(form.serviceRegions)} onChange={event => setForm({ ...form, serviceRegions: selectedValues(event.currentTarget).join(",") })}>{TURKEY_PROVINCES.map(item => <option value={item.name} key={item.id}>{item.name}</option>)}</select></label>
          <label><span>{copy("Faaliyet alanları", "Activity areas")}</span><select multiple value={splitValues(form.activityAreas)} onChange={event => setForm({ ...form, activityAreas: selectedValues(event.currentTarget).join(",") })}>{["PERIODIC_MAINTENANCE","ELECTRICAL","ELECTRONICS","MECHANICAL","SOFTWARE","CHARGER_INSTALLATION"].map(value => <option value={value} key={value}>{specialtyLabel(value, language)}</option>)}</select></label>
          <label><span>{copy("Müsait günler", "Available days")}</span><select multiple value={splitValues(form.availabilityDays)} onChange={event => setForm({ ...form, availabilityDays: selectedValues(event.currentTarget).join(",") })}>{weekdayOptions.map(([value, tr, en]) => <option value={value} key={value}>{copy(tr, en)}</option>)}</select></label>
          <label><span>{copy("Online sözleşme durumu", "Online agreement status")}</span><select value={form.contractStatus} onChange={event => setForm({ ...form, contractStatus: event.target.value })}><option value="PENDING">{copy("Onay bekliyor", "Awaiting approval")}</option><option value="APPROVED">{copy("Onaylandı", "Approved")}</option><option value="REJECTED">{copy("Reddedildi", "Rejected")}</option></select></label>
          <label className="contract-upload"><span>{copy("Online sözleşme dosyası (en fazla 600 KB)", "Online agreement file (maximum 600 KB)")}</span><input type="file" accept=".pdf,.doc,.docx,image/*" onChange={event => void readContract(event.target.files?.[0], setForm, form, copy("Sözleşme dosyası 600 KB sınırını aşıyor.", "The agreement file exceeds the 600 KB limit."))} /><small>{form.contractFileName || copy("Dosya seçilmedi", "No file selected")}</small></label>
        </> : <><label><span>{copy("Anlaşma türü", "Agreement type")}</span><select value={form.agreementType} onChange={event => setForm({ ...form, agreementType: event.target.value })}><option value="JOB_BASED">{copy("İş bazlı", "Job-based")}</option><option value="SUBSCRIPTION">{copy("Abonelik", "Subscription")}</option><option value="FRAMEWORK">{copy("Çerçeve sözleşme", "Framework agreement")}</option></select></label><Field label={copy("İstasyon sayısı", "Station count")} value={form.stationCount} set={value => setForm({ ...form, stationCount: value })} type="number" /></>}
      </div>{error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>{copy("Vazgeç", "Cancel")}</button><button className="button button--primary" disabled={saving}>{saving ? copy("Kaydediliyor…", "Saving…") : copy("Kaydet", "Save")}</button></div></form></div>}
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

function specialtyLabel(value: string, language: "tr" | "en"): string {
  const labels: Record<string, [string, string]> = {
    PERIODIC_MAINTENANCE: ["Periyodik bakım", "Periodic maintenance"],
    ELECTRICAL: ["Elektrik", "Electrical"],
    ELECTRONICS: ["Elektronik", "Electronics"],
    MECHANICAL: ["Mekanik", "Mechanical"],
    SOFTWARE: ["Yazılım", "Software"],
    CHARGER_INSTALLATION: ["Şarj cihazı kurulumu", "Charging device installation"],
  };
  return labels[value]?.[language === "tr" ? 0 : 1] ?? value;
}

function availabilityDaysLabel(days: number[] | undefined, language: "tr" | "en"): string {
  if (!days?.length) return "—";
  return days.map((day) => {
    const option = weekdayOptions.find(([value]) => Number(value) === day);
    return option?.[language === "tr" ? 1 : 2] ?? String(day);
  }).join(", ");
}

function contractStatusLabel(status: string | undefined, language: "tr" | "en"): string {
  const labels: Record<string, [string, string]> = {
    PENDING: ["Onay bekliyor", "Awaiting approval"], APPROVED: ["Onaylandı", "Approved"], REJECTED: ["Reddedildi", "Rejected"],
  };
  return labels[status ?? "PENDING"]?.[language === "tr" ? 0 : 1] ?? status ?? "—";
}

function agreementTypeLabel(type: string | undefined, language: "tr" | "en"): string {
  const labels: Record<string, [string, string]> = {
    JOB_BASED: ["İş bazlı", "Job-based"], SUBSCRIPTION: ["Abonelik", "Subscription"], FRAMEWORK: ["Çerçeve sözleşme", "Framework agreement"],
  };
  return type ? labels[type]?.[language === "tr" ? 0 : 1] ?? type : language === "tr" ? "Tanımlanmadı" : "Not defined";
}

async function readContract(file: File | undefined, setForm: (form: CompanyForm) => void, form: CompanyForm, tooLargeMessage: string) {
  if (!file) return;
  if (file.size > 600 * 1024) { window.alert(tooLargeMessage); return; }
  const documentData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  setForm({ ...form, contractFileName: file.name, contractDocumentData: documentData });
}
