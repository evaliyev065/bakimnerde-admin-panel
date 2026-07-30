import {
  CalendarClock, CheckCircle2, ChevronRight, ClipboardCheck, Download, Edit3, Image, MessageSquare, Plus, RefreshCw,
  Play, Send, ShieldCheck, Trash2, UserRound, Wrench, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiDownload, apiRequest } from "../lib/api";
import { LocationFields } from "../shared/components/FormControls";
import { PageHeader } from "../shared/components/PageHeader";
import { StatusBadge, type Status } from "../shared/components/StatusBadge";

interface JobApi {
  documentId: string; id: string; station: string; city: string; district: string; charger?: string | null; chargerModel?: string | null;
  maintenanceTarget: "DEVICE" | "STATION"; stationMaintenanceArea?: "GENERAL_COMPONENTS" | "GRID_CONNECTION" | null;
  status: string; deadlineAt: string; appointmentAt?: string; assignmentAcceptanceDeadlineAt?: string;
  contractorAcceptedAt?: string; outageNotificationSentAt?: string; maintenanceStartedAt?: string; workflowCycle: number;
  cpo: string; contractor: string; amount: number | null; contractorCost: number | null;
  cpoTenantId: string; contractorTenantId?: string; fieldWorkerUserId?: string; fieldWorkerName?: string; fieldWorkerPhone?: string;
}
interface Tenant { id: string; name: string; type: string }
interface FieldWorker { id: string; tenantId: string; tenantName: string; name: string; email: string; phone?: string }
interface ChargePoint { id: string; externalId: string; model: string; cpoTenantId: string; station: { name: string; city: string; district: string } }
interface Evidence { id: string; phase: "BEFORE" | "AFTER" | "BRANDED"; url?: string; fileName?: string; mimeType?: string; downloadAvailable?: boolean; description: string; createdAt: string }
interface FieldReport {
  id: string; serviceType: string; equipmentCondition: string; faultCategory: string;
  actionTaken: string; safetyResult: string; notes: string; completed: boolean; updatedAt: string;
  measurements?: { inputVoltage?: number | null; outputVoltage?: number | null };
}
interface AdditionalRequest {
  id: string; type: string; description: string; cpoPrice?: number | null; status: string; partSupplyStatus: string;
  supplyDeadlineAt?: string; pricingNote?: string; deadlineNote?: string;
}
interface JobMessage { id: string; text: string; senderName: string; senderTenantName: string; createdAt: string; mine: boolean }
interface JobForm {
  id: string; cpoTenantId: string; contractorTenantId: string; stationName: string; city: string; district: string;
  maintenanceTarget: "DEVICE" | "STATION"; stationMaintenanceArea: "GENERAL_COMPONENTS" | "GRID_CONNECTION";
  chargerExternalId: string; chargerModel: string; deadlineAt: string; appointmentAt: string;
  cpoPrice: string; contractorCost: string;
}

const statuses = [
  ["WAITING", "Beklemede"], ["ASSIGNED", "Atandı"], ["IN_PROGRESS", "İşlemde"],
  ["ADDITIONAL_SUPPLY", "Ek tedarik sürecinde"],
  ["MAINTENANCE_DONE", "Bakım tamamlandı"], ["MAINTENANCE_APPROVED", "Bakım onaylandı"],
  ["CPO_APPROVAL", "CPO onayı"], ["PAID", "Ödeme yapıldı"], ["CLOSED", "Süreç sonlandı"],
] as const;
const statusMap: Record<string, Status> = {
  WAITING: "waiting", ASSIGNED: "assigned", IN_PROGRESS: "progress",
  ADDITIONAL_SUPPLY: "additionalSupply",
  MAINTENANCE_DONE: "maintenanceDone", MAINTENANCE_APPROVED: "maintenanceApproved",
  CPO_APPROVAL: "cpoApproval", PAID: "paid", CLOSED: "closed",
};
const supplyTypes = [
  ["FAN_REPLACEMENT", "Fan değişimi"], ["CABLE_REPLACEMENT", "Kablo değişimi"],
  ["CONNECTOR_REPLACEMENT", "Konnektör değişimi"], ["OTHER_SUPPLY", "Diğer ek tedarik"],
] as const;
const supplyStatusLabels: Record<string, string> = {
  PENDING_PRICING: "Bakımnerde fiyatlandırması bekleniyor",
  AWAITING_CPO_DEADLINE: "CPO kesin tedarik tarihi bekleniyor",
  SUPPLY_IN_PROGRESS: "Ek tedarik sürecinde",
  DELAYED: "Tedarik gecikti",
  SUPPLIED: "Temin edildi",
};
const emptyForm: JobForm = {
  id: "", cpoTenantId: "", contractorTenantId: "", stationName: "", city: "", district: "",
  maintenanceTarget: "DEVICE", stationMaintenanceArea: "GENERAL_COMPONENTS",
  chargerExternalId: "", chargerModel: "", deadlineAt: "", appointmentAt: "",
  cpoPrice: "", contractorCost: "",
};

export function JobsPage() {
  const { principal } = useAuth();
  const [searchParams] = useSearchParams();
  const isPlatform = principal?.tenantType === "PLATFORM";
  const isCpo = principal?.tenantType === "CPO";
  const isContractor = principal?.tenantType === "CONTRACTOR";
  const [jobs, setJobs] = useState<JobApi[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [fieldWorkers, setFieldWorkers] = useState<FieldWorker[]>([]);
  const [chargePoints, setChargePoints] = useState<ChargePoint[]>([]);
  const [selected, setSelected] = useState<JobApi | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [fieldReport, setFieldReport] = useState<FieldReport | null>(null);
  const [requests, setRequests] = useState<AdditionalRequest[]>([]);
  const [requestType, setRequestType] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestPrices, setRequestPrices] = useState<Record<string, string>>({});
  const [requestDeadlines, setRequestDeadlines] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [message, setMessage] = useState("");
  const [appointment, setAppointment] = useState("");
  const [fieldWorkerSelection, setFieldWorkerSelection] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [manualStation, setManualStation] = useState(false);
  const [manualCharger, setManualCharger] = useState(false);
  const [form, setForm] = useState<JobForm>(emptyForm);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState(() => searchParams.get("search") ?? "");

  const load = useCallback(async () => setJobs(await apiRequest<JobApi[]>("/jobs-list")), []);
  const loadCollaboration = useCallback(async (jobId: string) => {
    const body = JSON.stringify({ jobId });
    const [media, report, additions, chat] = await Promise.all([
      apiRequest<Evidence[]>("/job-evidence-list", { method: "POST", body }),
      apiRequest<FieldReport | null>("/job-field-report-get", { method: "POST", body }),
      apiRequest<AdditionalRequest[]>("/additional-requests-list", { method: "POST", body }),
      isCpo ? Promise.resolve([] as JobMessage[]) : apiRequest<JobMessage[]>("/job-messages-list", { method: "POST", body }),
    ]);
    setEvidence(media); setFieldReport(report); setRequests(additions); setMessages(chat);
  }, [isCpo]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 3_000);
    if (isPlatform) void apiRequest<Tenant[]>("/tenants-list").then(setTenants);
    if (isPlatform || isCpo) void apiRequest<ChargePoint[]>("/charge-points-list").then(setChargePoints);
    if (isPlatform || isContractor) void apiRequest<FieldWorker[]>("/field-workers-list").then(setFieldWorkers);
    return () => window.clearInterval(timer);
  }, [isContractor, isCpo, isPlatform, load]);
  useEffect(() => {
    if (selected) void loadCollaboration(selected.documentId);
  }, [loadCollaboration, selected]);
  useEffect(() => { setQuery(searchParams.get("search") ?? ""); }, [searchParams]);

  const visibleJobs = useMemo(() => jobs.filter((job) => {
    const matchesFilter = filter === "ALL" || job.status === filter;
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return matchesFilter && (!needle || `${job.id} ${job.station} ${job.charger ?? ""} ${job.chargerModel ?? ""} ${job.cpo} ${job.contractor} ${job.city} ${job.district}`.toLocaleLowerCase("tr-TR").includes(needle));
  }), [filter, jobs, query]);

  function openCreate() {
    const deadline = new Date(Date.now() + 14 * 86400000);
    setForm({ ...emptyForm, cpoTenantId: isCpo ? principal?.tenantId ?? "" : "", deadlineAt: toInputDate(deadline.toISOString()) });
    setManualStation(jobs.length === 0);
    setManualCharger(jobs.length === 0);
    setError(""); setModalOpen(true);
  }
  function openEdit(job: JobApi) {
    setForm({
      id: job.documentId, cpoTenantId: job.cpoTenantId, contractorTenantId: job.contractorTenantId ?? "",
      stationName: job.station, city: job.city, district: job.district,
      maintenanceTarget: job.maintenanceTarget ?? "DEVICE", stationMaintenanceArea: job.stationMaintenanceArea ?? "GENERAL_COMPONENTS",
      chargerExternalId: job.charger ?? "", chargerModel: job.chargerModel ?? "",
      deadlineAt: toInputDate(job.deadlineAt), appointmentAt: job.appointmentAt ? toInputDate(job.appointmentAt) : "",
      cpoPrice: job.amount === null ? "" : String(job.amount), contractorCost: job.contractorCost === null ? "" : String(job.contractorCost),
    });
    setManualStation(false);
    setManualCharger(false);
    setSelected(null); setError(""); setModalOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      const payload = {
        ...form,
        cpoTenantId: isCpo ? principal?.tenantId : form.cpoTenantId,
        contractorTenantId: form.contractorTenantId || undefined,
        cpoPrice: form.cpoPrice === "" ? null : Number(form.cpoPrice),
        contractorCost: form.contractorCost === "" ? null : Number(form.contractorCost),
        deadlineAt: new Date(form.deadlineAt).toISOString(),
        appointmentAt: form.appointmentAt ? new Date(form.appointmentAt).toISOString() : undefined,
      };
      await apiRequest(form.id ? "/jobs-update" : "/jobs-create", { method: "POST", body: JSON.stringify(payload) });
      await load(); setModalOpen(false);
    } catch (reason) { setError(errorMessage(reason, "İş kaydedilemedi.")); }
  }
  async function remove(job: JobApi) {
    if (!window.confirm(`${job.id} işini silmek istiyor musunuz?`)) return;
    try {
      await apiRequest("/jobs-delete", { method: "POST", body: JSON.stringify({ id: job.documentId }) });
      setSelected(null); await load();
    } catch (reason) { window.alert(errorMessage(reason, "İş silinemedi.")); }
  }
  async function acceptAssignment() {
    if (!selected || !appointment) return;
    try {
      await apiRequest("/jobs-assignment-accept", {
        method: "POST", body: JSON.stringify({ id: selected.documentId, appointmentAt: new Date(appointment).toISOString() }),
      });
      await refreshSelected(selected.documentId);
    } catch (reason) { window.alert(errorMessage(reason, "Atama onaylanamadı.")); }
  }
  async function assignFieldWorker() {
    if (!selected || !fieldWorkerSelection) return;
    try {
      await apiRequest("/jobs-field-worker-assign", {
        method: "POST",
        body: JSON.stringify({ id: selected.documentId, fieldWorkerUserId: fieldWorkerSelection }),
      });
      await refreshSelected(selected.documentId);
    } catch (reason) { window.alert(errorMessage(reason, "Saha personeli atanamadı.")); }
  }
  async function advance(status: string) {
    if (!selected) return;
    try {
      await apiRequest("/jobs-status-change", { method: "POST", body: JSON.stringify({ id: selected.documentId, status }) });
      await refreshSelected(selected.documentId);
    } catch (reason) { window.alert(errorMessage(reason, "Durum güncellenemedi.")); }
  }
  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selected || !message.trim()) return;
    try {
      await apiRequest("/job-messages-send", { method: "POST", body: JSON.stringify({ jobId: selected.documentId, text: message }) });
      setMessage(""); await loadCollaboration(selected.documentId);
    } catch (reason) { window.alert(errorMessage(reason, "Mesaj gönderilemedi.")); }
  }

  async function downloadEvidence(item: Evidence) {
    try {
      await apiDownload("/job-evidence-download", { id: item.id }, item.fileName || `bakim-fotografi-${item.id}.jpg`);
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : "Fotoğraf indirilemedi.");
    }
  }
  async function createAdditionalRequest(event: FormEvent) {
    event.preventDefault();
    if (!selected || !requestType || !requestDescription.trim()) return;
    try {
      await apiRequest("/additional-requests-create", {
        method: "POST", body: JSON.stringify({ jobId: selected.documentId, type: requestType, description: requestDescription }),
      });
      setRequestType(""); setRequestDescription("");
      await loadCollaboration(selected.documentId);
    } catch (reason) { window.alert(errorMessage(reason, "Ek tedarik talebi oluşturulamadı.")); }
  }
  async function priceAdditionalRequest(request: AdditionalRequest) {
    if (!selected) return;
    const cpoPrice = Number(requestPrices[request.id]);
    if (!Number.isFinite(cpoPrice) || cpoPrice <= 0) return;
    try {
      await apiRequest("/additional-requests-price", {
        method: "POST", body: JSON.stringify({ id: request.id, cpoPrice }),
      });
      await loadCollaboration(selected.documentId);
    } catch (reason) { window.alert(errorMessage(reason, "Ek tedarik fiyatlandırılamadı.")); }
  }
  async function setAdditionalRequestDeadline(request: AdditionalRequest) {
    if (!selected || !requestDeadlines[request.id]) return;
    try {
      await apiRequest("/additional-requests-deadline", {
        method: "POST", body: JSON.stringify({ id: request.id, supplyDeadlineAt: new Date(requestDeadlines[request.id]).toISOString() }),
      });
      await refreshSelected(selected.documentId);
    } catch (reason) { window.alert(errorMessage(reason, "Kesin tedarik tarihi kaydedilemedi.")); }
  }
  async function updateAdditionalRequestStatus(request: AdditionalRequest, partSupplyStatus: "DELAYED" | "SUPPLIED") {
    if (!selected || request.partSupplyStatus === partSupplyStatus) return;
    try {
      await apiRequest("/additional-requests-update", {
        method: "POST", body: JSON.stringify({ id: request.id, partSupplyStatus }),
      });
      await refreshSelected(selected.documentId);
    } catch (reason) { window.alert(errorMessage(reason, "Ek tedarik durumu güncellenemedi.")); }
  }
  async function refreshSelected(id: string) {
    const fresh = await apiRequest<JobApi[]>("/jobs-list");
    setJobs(fresh); setSelected(fresh.find((job) => job.documentId === id) ?? null);
    await loadCollaboration(id);
  }

  const cpos = tenants.filter((item) => item.type === "CPO");
  const contractors = tenants.filter((item) => item.type === "CONTRACTOR");
  const availableFieldWorkers = fieldWorkers.filter((item) => item.tenantId === selected?.contractorTenantId);
  const stations = uniqueBy([
    ...jobs.map((job) => ({ station: job.station, city: job.city, district: job.district, cpoTenantId: job.cpoTenantId })),
    ...chargePoints.map((item) => ({ station: item.station.name, city: item.station.city, district: item.station.district, cpoTenantId: item.cpoTenantId })),
  ].filter((item) => !form.cpoTenantId || item.cpoTenantId === form.cpoTenantId), (job) => `${job.cpoTenantId}|${job.station}|${job.city}|${job.district}`);
  const chargers = chargePoints
    .filter((item) => (!form.cpoTenantId || item.cpoTenantId === form.cpoTenantId)
      && item.station.name === form.stationName && item.station.city === form.city && item.station.district === form.district)
    .map((item) => ({
      charger: item.externalId, chargerModel: item.model, cpoTenantId: item.cpoTenantId,
      station: item.station.name, city: item.station.city, district: item.station.district,
    }));
  const nextPlatformStatus: Record<string, [string, string]> = {
    MAINTENANCE_DONE: ["MAINTENANCE_APPROVED", "Bakımı onayla"],
    CPO_APPROVAL: ["PAID", "Ödeme yapıldı / hakediş ekle"],
    PAID: ["CLOSED", "Süreci sonlandır"],
  };

  return <>
    <PageHeader eyebrow="CANLI OPERASYON" title="İş yönetimi" description="CPO talebinden saha kanıtlarına, onaydan hakedişe kadar ortak iş akışı." />
    <div className="toolbar">
      <div className="tabs">
        {[["ALL", "Tüm işler"], ["WAITING", "Bekleyen"], ["ASSIGNED", "Atanan"], ["IN_PROGRESS", "İşlemde"], ["ADDITIONAL_SUPPLY", "Ek tedarik"]].map(([value, label]) =>
          <button className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)} key={value}>{label}</button>)}
      </div>
      <label className="table-search"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="İş, firma, cihaz veya istasyon ara" /></label>
      <button className="button button--outline" onClick={() => void load()}><RefreshCw size={15} /> Yenile</button>
      {(isPlatform || isCpo) && <button className="button button--primary" onClick={openCreate}><Plus size={16} /> Yeni iş</button>}
    </div>
    <section className="data-card">
      <div className="data-table job-table">
        <div className="data-row data-head"><span>İŞ / BAKIM HEDEFİ</span><span>CPO FİRMA</span><span>SAHA OPERASYONU</span><span>DURUM</span><span>SON TARİH</span><span>TUTAR</span><span /></div>
        {visibleJobs.map((job) => <button className={`data-row ${isPlatform && !job.contractorTenantId ? "assignment-pending-row" : ""}`} key={job.documentId} onClick={() => { setSelected(job); setAppointment(""); setFieldWorkerSelection(job.fieldWorkerUserId ?? ""); }}>
          <span className="primary-cell"><b>{job.id}</b><small>{jobAssetLabel(job)} · {job.station}</small></span>
          <span><b>{job.cpo}</b><small>{job.city}</small></span>
          <span><b>{job.contractor}</b><small>{job.fieldWorkerName ? `Saha: ${job.fieldWorkerName}` : job.contractorAcceptedAt ? "Saha ataması bekliyor" : job.contractorTenantId ? "Onay bekliyor" : "Henüz atanmadı"}</small></span>
          <span><StatusBadge status={statusMap[job.status] ?? "waiting"} /></span>
          <span>{new Date(job.deadlineAt).toLocaleDateString("tr-TR")}</span>
          <span><b>{job.amount === null ? "-" : money(job.amount)}</b></span><span><ChevronRight size={18} /></span>
        </button>)}
        {visibleJobs.length === 0 && <div className="empty-state"><b>Bu görünümde iş yok</b><span>CPO yeni bir bakım talebi yayınlayabilir.</span></div>}
      </div>
    </section>

    {selected && <div className="drawer-wrap">
      <button className="drawer-backdrop" onClick={() => setSelected(null)} aria-label="Kapat" />
      <aside className="detail-drawer job-detail-drawer">
        <div className="drawer-head"><div><span>İŞ DETAYI · CANLI</span><h2>{selected.id}</h2><p>{selected.station} · {jobAssetLabel(selected)}</p></div><button className="icon-button" onClick={() => setSelected(null)}><X /></button></div>
        <div className="drawer-status"><StatusBadge status={statusMap[selected.status] ?? "waiting"} /><span>Yayın süresi: <b>{new Date(selected.deadlineAt).toLocaleDateString("tr-TR")}</b></span></div>
        <div className="detail-summary">
          <div><small>CPO FİRMA</small><b>{selected.cpo}</b></div><div><small>TAŞERON AĞI</small><b>{selected.contractor}</b></div>
          <div><small>RANDEVU</small><b>{selected.appointmentAt ? new Date(selected.appointmentAt).toLocaleString("tr-TR") : "Seçilmedi"}</b></div>
          <div><small>BAKIM HEDEFİ</small><b>{jobAssetLabel(selected)}</b></div>
        </div>
        <section className="drawer-section">
          <h3>Süreç ilerlemesi · çevrim {selected.workflowCycle}</h3>
          <div className="horizontal-progress"><i style={{ width: `${((statuses.findIndex(([key]) => key === selected.status) + 1) / statuses.length) * 100}%` }} /></div>
          <div className="flow-labels">{statuses.map(([key, label], index) => <span className={index <= statuses.findIndex(([status]) => status === selected.status) ? "done" : ""} key={key}>{label}</span>)}</div>
          <div className={`maintenance-start-state ${selected.maintenanceStartedAt ? "done" : ""}`}>
            <Play />
            <span>{selected.maintenanceStartedAt ? `Saha ekibi bakıma başladı · ${new Date(selected.maintenanceStartedAt).toLocaleString("tr-TR")}` : "Saha ekibinin Bakıma Başla aksiyonu bekleniyor"}</span>
          </div>
        </section>

        {isContractor && selected.status === "ASSIGNED" && !selected.contractorAcceptedAt && <section className="drawer-section action-panel">
          <h3><CalendarClock /> Atamayı 1 gün içinde onayla</h3>
          <p>Cihazın şarj hizmeti veremeyeceği tarih ve saati seçin. CPO'ya kesinti bildirimi oluşturulacaktır.</p>
          <div><input type="datetime-local" value={appointment} onChange={(event) => setAppointment(event.target.value)} /><button className="button button--primary" disabled={!appointment} onClick={() => void acceptAssignment()}>Randevuyu onayla</button></div>
        </section>}

        {(isPlatform || isContractor) && selected.contractorTenantId && !["MAINTENANCE_DONE", "MAINTENANCE_APPROVED", "CPO_APPROVAL", "PAID", "CLOSED"].includes(selected.status) && <section className="drawer-section action-panel">
          <h3><UserRound /> Atanmış saha personeli</h3>
          <p>Yalnız seçilen taşeron firmaya ait aktif saha hesapları listelenir. İş, atamadan sonra personelin Mobile App ekranına düşer.</p>
          <div>
            <select value={fieldWorkerSelection} onChange={(event) => setFieldWorkerSelection(event.target.value)}>
              <option value="">Saha personeli seçin</option>
              {availableFieldWorkers.map((worker) => <option value={worker.id} key={worker.id}>{worker.name} · {worker.phone || worker.email}</option>)}
            </select>
            <button className="button button--primary" disabled={!fieldWorkerSelection || fieldWorkerSelection === selected.fieldWorkerUserId} onClick={() => void assignFieldWorker()}>
              {selected.fieldWorkerUserId ? "Atamayı değiştir" : "Saha personeline ata"}
            </button>
          </div>
        </section>}

        {(isPlatform || isContractor) && ["MAINTENANCE_DONE", "MAINTENANCE_APPROVED", "CPO_APPROVAL", "PAID", "CLOSED"].includes(selected.status) && <section className="drawer-section locked-assignment">
          <h3><UserRound /> Saha personeli ataması kilitlendi</h3>
          <p>Bakım tamamlandığı için {selected.fieldWorkerName ?? "atanmış saha personeli"} artık değiştirilemez.</p>
        </section>}

        <section className="drawer-section">
          <div className="section-title"><h3><ClipboardCheck /> Saha işlem formu</h3>{fieldReport?.completed && <span><CheckCircle2 size={12} /> Tamamlandı</span>}</div>
          {fieldReport ? <div className="field-report-summary">
            <div><small>HİZMET</small><b>{fieldReportLabel(fieldReport.serviceType)}</b></div>
            <div><small>CİHAZ DURUMU</small><b>{fieldReportLabel(fieldReport.equipmentCondition)}</b></div>
            <div><small>ARIZA</small><b>{fieldReportLabel(fieldReport.faultCategory)}</b></div>
            <div><small>İŞLEM</small><b>{fieldReportLabel(fieldReport.actionTaken)}</b></div>
            <div><small>GÜVENLİK</small><b>{fieldReportLabel(fieldReport.safetyResult)}</b></div>
            <div><small>ÖLÇÜM</small><b>{fieldReport.measurements?.inputVoltage ?? "-"} V / {fieldReport.measurements?.outputVoltage ?? "-"} V</b></div>
            <p>{fieldReport.notes}</p>
          </div> : <p className="muted-copy">Saha personeli işlem formunu henüz kaydetmedi.</p>}
        </section>

        <section className="drawer-section">
          <div className="section-title"><h3><Image /> Mobil saha kanıtları</h3><span>{evidence.length}/13</span></div>
          <div className="evidence-summary">
            <EvidenceCount label="Bakım öncesi" count={evidence.filter((item) => item.phase === "BEFORE").length} target={6} />
            <EvidenceCount label="Bakım sonrası" count={evidence.filter((item) => item.phase === "AFTER").length} target={6} />
            <EvidenceCount label="Markalı tişört" count={evidence.filter((item) => item.phase === "BRANDED").length} target={1} />
          </div>
          {evidence.length > 0 && <div className="evidence-feed">{evidence.map((item) => <article key={item.id}><Image /><div><b>{item.phase === "BEFORE" ? "Önce" : item.phase === "AFTER" ? "Sonra" : "Markalı"}</b><span>{item.description || "Açıklama yok"}</span></div>{item.downloadAvailable ? <button type="button" onClick={() => void downloadEvidence(item)}><Download /> İndir</button> : item.url ? <a href={item.url} target="_blank" rel="noreferrer">Dosya</a> : <span>Yok</span>}</article>)}</div>}
        </section>

        <section className="drawer-section">
          <div className="section-title"><h3><Wrench /> Ek tedarik talepleri</h3><span>{requests.length}</span></div>
          {requests.length === 0 && <p className="muted-copy">Bu iş için ek tedarik talebi bulunmuyor.</p>}
          <div className="supply-request-list">{requests.map((item) => <article className="request-card supply-request-card" key={item.id}>
            <div className="supply-request-copy"><b>{supplyTypes.find(([value]) => value === item.type)?.[1] ?? item.type.replaceAll("_", " ")}</b><span>{item.description}</span></div>
            <div className="supply-request-meta">
              <em className={`supply-status supply-status--${item.partSupplyStatus.toLocaleLowerCase("en-US")}`}>{supplyStatusLabels[item.partSupplyStatus] ?? item.partSupplyStatus}</em>
              {(isPlatform || isCpo) && item.cpoPrice !== null && item.cpoPrice !== undefined && <strong>{money(item.cpoPrice)}</strong>}
              {item.supplyDeadlineAt && <small>Kesin tarih: {new Date(item.supplyDeadlineAt).toLocaleString("tr-TR")}</small>}
            </div>
            {isPlatform && item.partSupplyStatus === "PENDING_PRICING" && <div className="supply-request-action"><label><span>CPO ücreti</span><input min="1" type="number" value={requestPrices[item.id] ?? ""} onChange={(event) => setRequestPrices((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="₺" /></label><button className="button button--primary" disabled={Number(requestPrices[item.id]) <= 0} onClick={() => void priceAdditionalRequest(item)}>Fiyatlandır ve CPO'ya aktar</button></div>}
            {isCpo && item.partSupplyStatus === "AWAITING_CPO_DEADLINE" && <div className="supply-request-action"><label><span>Kesin tedarik tarihi</span><input type="datetime-local" min={toInputDate(new Date().toISOString())} value={requestDeadlines[item.id] ?? ""} onChange={(event) => setRequestDeadlines((current) => ({ ...current, [item.id]: event.target.value }))} /></label><button className="button button--primary" disabled={!requestDeadlines[item.id]} onClick={() => void setAdditionalRequestDeadline(item)}>Tarihi bildir</button></div>}
            {(isPlatform || isCpo) && ["SUPPLY_IN_PROGRESS", "DELAYED"].includes(item.partSupplyStatus) && <div className="supply-manual-actions">{item.partSupplyStatus !== "DELAYED" && <button className="button button--outline" onClick={() => void updateAdditionalRequestStatus(item, "DELAYED")}>Gecikme bildir</button>}<button className="button button--primary" onClick={() => void updateAdditionalRequestStatus(item, "SUPPLIED")}>Temin edildi</button></div>}
          </article>)}</div>
          {isContractor && ["ASSIGNED", "IN_PROGRESS", "ADDITIONAL_SUPPLY"].includes(selected.status) && <form className="inline-request supply-create-form" onSubmit={createAdditionalRequest}><select required value={requestType} onChange={(event) => setRequestType(event.target.value)}><option value="">Tedarik türünü seçin</option>{supplyTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><textarea required minLength={5} maxLength={1000} rows={3} value={requestDescription} onChange={(event) => setRequestDescription(event.target.value)} placeholder="Gereken parça veya işlemi açıklayın" /><button className="button button--primary" disabled={!requestType || requestDescription.trim().length < 5}>Bakımnerde'ye aktar</button><small>Talep önce yalnız Bakımnerde ekibine ulaşır; fiyatlandırmadan sonra CPO'ya aktarılır. Fiyat bilgisi saha ve taşeron ekranlarında gösterilmez.</small></form>}
        </section>

        {!isCpo && <section className="drawer-section job-chat">
          <div className="section-title"><h3><MessageSquare /> İş görüşmesi</h3><span>{messages.length} mesaj</span></div>
          <div className="chat-feed">{messages.length === 0 && <p className="muted-copy">Bu işte henüz mesaj yok.</p>}{messages.map((item) => <article className={item.mine ? "mine" : ""} key={item.id}><b>{item.senderName} · {item.senderTenantName}</b><p>{item.text}</p><small>{new Date(item.createdAt).toLocaleString("tr-TR")}</small></article>)}</div>
          <form className="chat-form" onSubmit={sendMessage}><input maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Bakımnerde veya taşeron ekibine mesaj yazın" /><button disabled={!message.trim()}><Send /></button></form>
        </section>}

        <div className="drawer-actions job-actions">
          {isPlatform && <><button className="button button--outline danger-button" onClick={() => void remove(selected)}><Trash2 size={15} /> Sil</button><button className="button button--outline" onClick={() => openEdit(selected)}><Edit3 size={15} /> Ata / düzenle</button></>}
          {isPlatform && nextPlatformStatus[selected.status] && <button className="button button--primary" onClick={() => void advance(nextPlatformStatus[selected.status][0])}>{nextPlatformStatus[selected.status][1]}</button>}
          {isCpo && selected.status === "MAINTENANCE_APPROVED" && <button className="button button--primary" onClick={() => void advance("CPO_APPROVAL")}><ShieldCheck size={15} /> Bakımı CPO olarak onayla</button>}
        </div>
      </aside>
    </div>}

    {modalOpen && <div className="modal-wrap">
      <button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label="Kapat" />
      <form className="tenant-modal job-modal" onSubmit={save}>
        <div className="modal-head"><div><p className="eyebrow">{form.id ? "İŞİ ATA / DÜZENLE" : "YENİ BAKIM TALEBİ"}</p><h2>Bakım işi bilgileri</h2><span>{isCpo ? "Talep 14 gün süreyle Bakımnerde operasyonuna yayınlanır." : "Firma eşleştirmesi ve taraflara gösterilecek fiyatlar Bakımnerde tarafından atanır."}</span></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)}><X /></button></div>
        <div className="modal-fields">
          {isPlatform && <><Select label="CPO firma" value={form.cpoTenantId} set={(value) => {
            setManualStation(false); setManualCharger(false);
            setForm({ ...form, cpoTenantId: value, stationName: "", city: "", district: "", chargerExternalId: "", chargerModel: "" });
          }} options={cpos} required /><Select label="Taşeron firma" value={form.contractorTenantId} set={(value) => setForm({ ...form, contractorTenantId: value })} options={contractors} /></>}
          <label><span>Bakım hedefi</span><select value={form.maintenanceTarget} onChange={(event) => {
            const maintenanceTarget = event.target.value as JobForm["maintenanceTarget"];
            setManualCharger(false);
            setForm({ ...form, maintenanceTarget, chargerExternalId: "", chargerModel: "" });
          }}><option value="DEVICE">Araca takılan cihaz</option><option value="STATION">İstasyon / şebeke altyapısı</option></select></label>
          {form.maintenanceTarget === "STATION" && <label><span>İstasyon bakım alanı</span><select value={form.stationMaintenanceArea} onChange={(event) => setForm({ ...form, stationMaintenanceArea: event.target.value as JobForm["stationMaintenanceArea"] })}><option value="GENERAL_COMPONENTS">İstasyonun genel parçaları</option><option value="GRID_CONNECTION">Bölgesel şebeke bağlantısı</option></select></label>}
          <label><span>İstasyon</span><select required value={manualStation ? "__new__" : `${form.stationName}|${form.city}|${form.district}`} onChange={(event) => {
            if (event.target.value === "__new__") {
              setManualStation(true);
              setManualCharger(false);
              setForm({ ...form, stationName: "", city: "", district: "", chargerExternalId: "", chargerModel: "" });
              return;
            }
            setManualStation(false);
            const station = stations.find((item) => `${item.station}|${item.city}|${item.district}` === event.target.value);
            setManualCharger(false);
            if (station) setForm({ ...form, stationName: station.station, city: station.city, district: station.district, chargerExternalId: "", chargerModel: "" });
          }}><option value="||">İstasyon seçin</option>{stations.map(item => <option value={`${item.station}|${item.city}|${item.district}`} key={`${item.station}|${item.city}|${item.district}`}>{item.station} · {item.city}/{item.district}</option>)}<option value="__new__">Yeni istasyon tanımla</option></select></label>
          {manualStation && <JobField label="Yeni istasyon adı" value={form.stationName} set={(stationName) => setForm({ ...form, stationName })} />}
          <LocationFields city={form.city} district={form.district} onCityChange={(city) => setForm(current => ({ ...current, city, district: "", stationName: manualStation ? current.stationName : "", chargerExternalId: "", chargerModel: "" }))} onDistrictChange={(district) => setForm(current => ({ ...current, district, chargerExternalId: "", chargerModel: "" }))} />
          {form.maintenanceTarget === "DEVICE" && <><label><span>Cihaz kodu</span><select required value={manualCharger ? "__new__" : form.chargerExternalId} onChange={(event) => {
            if (event.target.value === "__new__") {
              setManualCharger(true);
              setForm({ ...form, chargerExternalId: "", chargerModel: "" });
              return;
            }
            setManualCharger(false);
            const charger = chargers.find((item) => item.charger === event.target.value);
            setForm({
              ...form,
              chargerExternalId: event.target.value,
              chargerModel: charger?.chargerModel ?? "",
            });
          }}><option value="">Cihaz seçin</option>{chargers.map(item => <option value={item.charger} key={item.charger}>{item.charger} · {item.chargerModel}</option>)}<option value="__new__">Yeni cihaz tanımla</option></select></label>
          {manualCharger ? <><JobField label="Yeni cihaz kodu" value={form.chargerExternalId} set={(chargerExternalId) => setForm({ ...form, chargerExternalId })} /><JobField label="Yeni cihaz modeli" value={form.chargerModel} set={(chargerModel) => setForm({ ...form, chargerModel })} /></> : <label><span>Cihaz modeli</span><input readOnly required value={form.chargerModel} /></label>}</>}
          {isPlatform && <><JobField label="Yayın son tarihi" value={form.deadlineAt} set={(value) => setForm({ ...form, deadlineAt: value })} type="datetime-local" /><JobField label="Randevu" value={form.appointmentAt} set={(value) => setForm({ ...form, appointmentAt: value })} type="datetime-local" required={false} /><JobField label="CPO satış fiyatı" value={form.cpoPrice} set={(value) => setForm({ ...form, cpoPrice: value })} type="number" /><JobField label="Taşeron maliyeti" value={form.contractorCost} set={(value) => setForm({ ...form, contractorCost: value })} type="number" /></>}
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>Vazgeç</button><button className="button button--primary">{form.id ? "Kaydet ve ata" : "Talebi yayınla"}</button></div>
      </form>
    </div>}
  </>;
}

function EvidenceCount({ label, count, target }: { label: string; count: number; target: number }) {
  return <article className={count === target ? "complete" : ""}><Image /><div><b>{label}</b><span>{count}/{target} görsel</span></div></article>;
}
function JobField({ label, value, set, type = "text", required = true }: { label: string; value: string; set(value: string): void; type?: string; required?: boolean }) {
  return <label><span>{label}</span><input required={required} type={type} value={value} onChange={(event) => set(event.target.value)} /></label>;
}
function Select({ label, value, set, options, required }: { label: string; value: string; set(value: string): void; options: Tenant[]; required?: boolean }) {
  return <label><span>{label}</span><select required={required} value={value} onChange={(event) => set(event.target.value)}><option value="">Seçin</option>{options.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>;
}
function toInputDate(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function money(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
}
function jobAssetLabel(job: Pick<JobApi, "maintenanceTarget" | "stationMaintenanceArea" | "charger" | "chargerModel">) {
  if (job.maintenanceTarget !== "STATION") return [job.charger, job.chargerModel].filter(Boolean).join(" · ") || "Cihaz";
  return job.stationMaintenanceArea === "GRID_CONNECTION" ? "Şebeke bağlantısı" : "İstasyon genel parçaları";
}
function errorMessage(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback; }

function fieldReportLabel(value: string) {
  const labels: Record<string, string> = {
    PREVENTIVE_MAINTENANCE: "Periyodik bakım", FAULT_REPAIR: "Arıza müdahalesi", INSTALLATION_CHECK: "Kurulum kontrolü",
    OPERATIONAL: "Çalışır durumda", LIMITED: "Kısıtlı çalışıyor", OUT_OF_SERVICE: "Hizmet dışı",
    ELECTRICAL: "Elektrik", MECHANICAL: "Mekanik", COMMUNICATION: "İletişim", SOFTWARE: "Yazılım", OTHER: "Diğer",
    REPAIRED: "Yerinde onarıldı", PART_REQUIRED: "Parça gerekiyor", MONITORING: "Takibe alındı", NO_FAULT: "Arıza görülmedi",
    SAFE: "Alan güvenli", ISOLATED: "Enerji izole edildi", ESCALATED: "Güvenlik eskalasyonu",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}
