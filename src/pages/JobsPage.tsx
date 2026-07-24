import { CalendarClock, ChevronRight, Edit3, Filter, Image, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { flowSteps } from "../data/mockData";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";
import { StatusBadge, type Status } from "../shared/components/StatusBadge";

interface JobApi { documentId: string; id: string; station: string; city: string; charger: string; chargerModel: string; status: string; deadlineAt: string; appointmentAt?: string; cpo: string; manufacturer: string; contractor: string; amount: number | null; contractorCost: number | null; cpoTenantId: string; manufacturerTenantId: string; contractorTenantId?: string }
interface Tenant { id: string; name: string; type: string }
interface JobForm { id: string; cpoTenantId: string; manufacturerTenantId: string; contractorTenantId: string; stationName: string; city: string; chargerExternalId: string; chargerModel: string; deadlineAt: string; appointmentAt: string; cpoPrice: string; contractorCost: string }
const emptyForm: JobForm = { id: "", cpoTenantId: "", manufacturerTenantId: "", contractorTenantId: "", stationName: "", city: "", chargerExternalId: "", chargerModel: "", deadlineAt: "", appointmentAt: "", cpoPrice: "0", contractorCost: "0" };
const statusMap: Record<string, Status> = { WAITING: "waiting", ASSIGNED: "assigned", IN_PROGRESS: "progress", MAINTENANCE_DONE: "maintenanceDone", MAINTENANCE_APPROVED: "maintenanceApproved", CPO_APPROVAL: "cpoApproval", PAID: "paid", CLOSED: "closed" };
const statusOptions = [["WAITING","Beklemede"],["ASSIGNED","Atandı"],["IN_PROGRESS","İşlemde"],["MAINTENANCE_DONE","Bakım tamamlandı"],["MAINTENANCE_APPROVED","Bakım onaylandı"],["CPO_APPROVAL","CPO onayı"],["PAID","Ödeme yapıldı"],["CLOSED","Süreç sonlandı"]];

export function JobsPage() {
  const { principal } = useAuth();
  const isPlatform = principal?.tenantType === "PLATFORM";
  const [jobs, setJobs] = useState<JobApi[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selected, setSelected] = useState<JobApi | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<JobForm>(emptyForm);
  const [status, setStatus] = useState("WAITING");
  const [error, setError] = useState("");
  const load = useCallback(() => apiRequest<JobApi[]>("/jobs-list").then(setJobs), []);
  useEffect(() => { void load(); if (isPlatform) void apiRequest<Tenant[]>("/tenants-list").then(setTenants); }, [isPlatform, load]);
  function openCreate() { setForm(emptyForm); setError(""); setModalOpen(true); }
  function openEdit(job: JobApi) {
    setForm({ id: job.documentId, cpoTenantId: job.cpoTenantId, manufacturerTenantId: job.manufacturerTenantId, contractorTenantId: job.contractorTenantId ?? "", stationName: job.station, city: job.city, chargerExternalId: job.charger, chargerModel: job.chargerModel, deadlineAt: toInputDate(job.deadlineAt), appointmentAt: job.appointmentAt ? toInputDate(job.appointmentAt) : "", cpoPrice: String(job.amount ?? 0), contractorCost: String(job.contractorCost ?? 0) });
    setModalOpen(true); setSelected(null); setError("");
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      await apiRequest(form.id ? "/jobs-update" : "/jobs-create", { method: "POST", body: JSON.stringify({ ...form, contractorTenantId: form.contractorTenantId || undefined, cpoPrice: Number(form.cpoPrice), contractorCost: Number(form.contractorCost), deadlineAt: new Date(form.deadlineAt).toISOString(), appointmentAt: form.appointmentAt ? new Date(form.appointmentAt).toISOString() : undefined }) });
      await load(); setModalOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "İş kaydedilemedi."); }
  }
  async function remove(job: JobApi) {
    if (!window.confirm(`${job.id} işini silmek istiyor musunuz?`)) return;
    try { await apiRequest("/jobs-delete", { method: "POST", body: JSON.stringify({ id: job.documentId }) }); setSelected(null); await load(); }
    catch (reason) { window.alert(reason instanceof Error ? reason.message : "İş silinemedi."); }
  }
  async function updateStatus() {
    if (!selected) return;
    try { await apiRequest("/jobs-status-change", { method: "POST", body: JSON.stringify({ id: selected.documentId, status }) }); setSelected(null); await load(); }
    catch (reason) { window.alert(reason instanceof Error ? reason.message : "Durum güncellenemedi."); }
  }
  const cpos = tenants.filter(item => item.type === "CPO");
  const manufacturers = tenants.filter(item => item.type === "MANUFACTURER");
  const contractors = tenants.filter(item => item.type === "CONTRACTOR");
  return <>
    <PageHeader eyebrow="OPERASYON" title="İş yönetimi" description="CPO talebinden ödemeye kadar tüm bakım süreçlerini takip edin." />
    <div className="toolbar"><div className="tabs"><button className="is-active">Tüm işler {jobs.length}</button><button>Aksiyon bekleyen</button><button>İşlemde</button><button>Onayda</button></div><label className="table-search"><Search size={16} /><input placeholder="İşlerde ara" /></label><button className="button button--outline"><Filter size={16} /> Filtrele</button>{isPlatform && <button className="button button--primary" onClick={openCreate}><Plus size={16} /> Yeni iş</button>}</div>
    <section className="data-card"><div className="data-table job-table"><div className="data-row data-head"><span>İŞ / CİHAZ</span><span>CPO FİRMA</span><span>SAHA OPERASYONU</span><span>DURUM</span><span>SON TARİH</span><span>TUTAR</span><span /></div>{jobs.map(job => <button className="data-row" key={job.documentId} onClick={() => { setSelected(job); setStatus(job.status); }}><span className="primary-cell"><b>{job.id}</b><small>{job.charger} · {job.station}</small></span><span><b>{job.cpo}</b><small>{job.city}</small></span><span><b>{job.contractor}</b><small>Bakımnerde yönetiminde</small></span><span><StatusBadge status={statusMap[job.status] ?? "waiting"} /></span><span>{new Date(job.deadlineAt).toLocaleDateString("tr-TR")}</span><span><b>{job.amount === null ? "Sözleşme kapsamında" : money(job.amount)}</b></span><span><ChevronRight size={18} /></span></button>)}
      {jobs.length === 0 && <div className="empty-state"><b>Henüz iş yok</b><span>Yeni iş oluşturarak başlayın.</span></div>}</div></section>
    {selected && <div className="drawer-wrap"><button className="drawer-backdrop" onClick={() => setSelected(null)} aria-label="Kapat" /><aside className="detail-drawer"><div className="drawer-head"><div><span>İŞ DETAYI</span><h2>{selected.id}</h2><p>{selected.station} · {selected.charger}</p></div><button className="icon-button" onClick={() => setSelected(null)}><X /></button></div><div className="drawer-status"><StatusBadge status={statusMap[selected.status] ?? "waiting"} /><span>Son tarih: <b>{new Date(selected.deadlineAt).toLocaleDateString("tr-TR")}</b></span></div><div className="detail-summary"><div><small>CPO FİRMA</small><b>{selected.cpo}</b></div><div><small>ÜRETİCİ</small><b>{selected.manufacturer}</b></div><div><small>SAHA OPERASYONU</small><b>{selected.contractor}</b></div><div><small>İŞ BEDELİ</small><b>{selected.amount === null ? "Gizli" : money(selected.amount)}</b></div></div>
      <section className="drawer-section"><h3>Süreç ilerlemesi</h3><div className="horizontal-progress"><i style={{ width: `${Math.max(12, (statusOptions.findIndex(item => item[0] === selected.status) + 1) * 12.5)}%` }} /></div><div className="flow-labels">{flowSteps.map((step, index) => <span className={index <= statusOptions.findIndex(item => item[0] === selected.status) ? "done" : ""} key={step}>{step}</span>)}</div></section>
      <section className="drawer-section"><h3>Kontrol listesi</h3><div className="check-list"><p><Image size={17} /><span><b>Bakım kanıtları</b><small>6 önce + 6 sonra + 1 markalı fotoğraf</small></span><em className="waiting">Takipte</em></p><p><CalendarClock size={17} /><span><b>Randevu</b><small>{selected.appointmentAt ? new Date(selected.appointmentAt).toLocaleString("tr-TR") : "Henüz seçilmedi"}</small></span></p><p><ShieldCheck size={17} /><span><b>Tenant görünürlüğü</b><small>Taraf bilgileri güvenli kapsamda</small></span><em>Tamam</em></p></div></section>
      {isPlatform && <div className="drawer-actions job-actions"><button className="button button--outline danger-button" onClick={() => void remove(selected)}><Trash2 size={15} /> Sil</button><button className="button button--outline" onClick={() => openEdit(selected)}><Edit3 size={15} /> Düzenle</button><select value={status} onChange={event => setStatus(event.target.value)}>{statusOptions.map(item => <option value={item[0]} key={item[0]}>{item[1]}</option>)}</select><button className="button button--primary" onClick={() => void updateStatus()}>Durumu güncelle</button></div>}</aside></div>}
    {modalOpen && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label="Kapat" /><form className="tenant-modal job-modal" onSubmit={save}><div className="modal-head"><div><p className="eyebrow">{form.id ? "İŞ DÜZENLE" : "YENİ İŞ"}</p><h2>Bakım işi bilgileri</h2><span>Firma eşleştirmesi yalnız Bakımnerde tarafından görünür.</span></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)}><X /></button></div><div className="modal-fields"><Select label="CPO firma" value={form.cpoTenantId} set={value => setForm({ ...form, cpoTenantId: value })} options={cpos} required /><Select label="Üretici firma" value={form.manufacturerTenantId} set={value => setForm({ ...form, manufacturerTenantId: value })} options={manufacturers} required /><Select label="Taşeron firma" value={form.contractorTenantId} set={value => setForm({ ...form, contractorTenantId: value })} options={contractors} /><JobField label="İstasyon adı" value={form.stationName} set={value => setForm({ ...form, stationName: value })} /><JobField label="Şehir" value={form.city} set={value => setForm({ ...form, city: value })} /><JobField label="Cihaz kodu" value={form.chargerExternalId} set={value => setForm({ ...form, chargerExternalId: value })} /><JobField label="Cihaz modeli" value={form.chargerModel} set={value => setForm({ ...form, chargerModel: value })} /><JobField label="Yayın son tarihi" value={form.deadlineAt} set={value => setForm({ ...form, deadlineAt: value })} type="datetime-local" /><JobField label="Randevu" value={form.appointmentAt} set={value => setForm({ ...form, appointmentAt: value })} type="datetime-local" required={false} /><JobField label="CPO satış fiyatı" value={form.cpoPrice} set={value => setForm({ ...form, cpoPrice: value })} type="number" /><JobField label="Taşeron maliyeti" value={form.contractorCost} set={value => setForm({ ...form, contractorCost: value })} type="number" /></div>{error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>Vazgeç</button><button className="button button--primary">Kaydet</button></div></form></div>}
  </>;
}

function JobField({ label, value, set, type = "text", required = true }: { label: string; value: string; set(value: string): void; type?: string; required?: boolean }) { return <label><span>{label}</span><input required={required} type={type} value={value} onChange={event => set(event.target.value)} /></label>; }
function Select({ label, value, set, options, required }: { label: string; value: string; set(value: string): void; options: Tenant[]; required?: boolean }) { return <label><span>{label}</span><select required={required} value={value} onChange={event => set(event.target.value)}><option value="">Seçin</option>{options.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>; }
function toInputDate(value: string) { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function money(value: number) { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value); }
