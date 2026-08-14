import {
  CalendarClock, CheckCircle2, ChevronRight, ClipboardCheck, CreditCard, Download, Edit3, Image, MessageSquare, PackageCheck, Plus, RefreshCw,
  Send, ShieldCheck, Star, Trash2, UserRound, Wrench, X,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

import { usePreferences, type AppLanguage } from "../app/PreferencesContext";

import { apiDownload, apiRequest } from "../lib/api";

import { PageHeader } from "../shared/components/PageHeader";

import { Pagination } from "../shared/components/Pagination";

import { StatusBadge, type Status } from "../shared/components/StatusBadge";


interface JobApi {
  documentId: string;
   id: string;
   station: string;
   city: string;
   district: string;
   charger?: string | null;
  
  maintenanceTarget: "DEVICE" | "STATION";
   stationMaintenanceArea?: "GENERAL_COMPONENTS" | "GRID_CONNECTION" | null;
  
  status: string;
   givenDurationAt?: string;
   contractorGivenDurationAt?: string;
   appointmentAt?: string;
   assignmentAcceptanceDeadlineAt?: string;
  
  contractorAcceptedAt?: string;
   outageNotificationSentAt?: string;
   maintenanceStartedAt?: string;
   workflowCycle: number;
  
  assignmentAt?: string;
   fieldWorkerAssignedAt?: string;
   maintenanceCompletedAt?: string;
   platformApprovedAt?: string;
  
  cpoApprovedAt?: string;
   cpoToPlatformPaidAt?: string;
   contractorPaidAt?: string;
   closedAt?: string;
  
  cpo: string;
   contractor: string;
   amount: number | null;
   contractorCost: number | null;
  
  cpoTenantId: string;
   contractorTenantId?: string;
   fieldWorkerUserId?: string;
   fieldWorkerName?: string;
   fieldWorkerPhone?: string;
   comment?: string;
   cpoReview?: { rating: number; feedback?: string; ratedAt: string } | null;
  
}
interface Tenant { id: string;
   name: string;
   type: string;
   status?: "ACTIVE" | "SUSPENDED";
   profile?: { serviceRegions?: string[] } }
interface FieldWorker { id: string;
   tenantId: string;
   tenantName: string;
   name: string;
   email: string;
   phone?: string }
interface ChargePoint { id: string;
   externalId: string;
   cpoTenantId: string;
   station: { name: string;
   city: string;
   district: string } }
interface Station { id: string; cpoTenantId: string; name: string; city: string; district: string }
interface Evidence { id: string;
   phase: "BEFORE" | "AFTER" | "BRANDED";
   url?: string;
   fileName?: string;
   mimeType?: string;
   downloadAvailable?: boolean;
   description: string;
   createdAt: string }
interface FieldReport {
  id: string;
   serviceType: string;
   equipmentCondition: string;
   faultCategory: string;
  
  actionTaken: string;
   safetyResult: string;
   notes: string;
   completed: boolean;
   updatedAt: string;
  
  measurements?: { inputVoltage?: number | null;
     outputVoltage?: number | null };
  
}
interface AdditionalRequest {
  id: string;
   type: string;
   description: string;
   cpoPrice?: number | null;
   status: string;
   partSupplyStatus: string;
  
  supplyDeadlineAt?: string;
   pricingNote?: string;
   deadlineNote?: string;
   pricedAt?: string;
   suppliedAt?: string;
  
}
interface JobMessage { id: string;
   text: string;
   senderName: string;
   senderTenantName: string;
   createdAt: string;
   mine: boolean }
interface JobForm {
  id: string;
   cpoTenantId: string;
   contractorTenantId: string;
   stationName: string;
   city: string;
   district: string;
  
  maintenanceTarget: "DEVICE" | "STATION";
   stationMaintenanceArea: "GENERAL_COMPONENTS" | "GRID_CONNECTION";
  
  chargerExternalId: string;
   givenDurationAt: string;
   appointmentAt: string;
   comment: string;
  
  cpoPrice: string;
   contractorCost: string;
  
}

const statusMap: Record<string, Status> = {
  WAITING: "waiting", ASSIGNED: "assigned", IN_PROGRESS: "progress",
  ADDITIONAL_SUPPLY: "additionalSupply",
  MAINTENANCE_DONE: "maintenanceDone", MAINTENANCE_APPROVED: "maintenanceApproved",
  CPO_APPROVAL: "cpoApproval", PAID: "paid", CLOSED: "closed",
};

const supplyTypes = [
  ["FAN_REPLACEMENT", "Fan değişimi", "Fan replacement"], ["CABLE_REPLACEMENT", "Kablo değişimi", "Cable replacement"],
  ["CONNECTOR_REPLACEMENT", "Konnektör değişimi", "Connector replacement"], ["OTHER_SUPPLY", "Diğer ek tedarik", "Other additional supply"],
] as const;

const supplyStatusLabels: Record<string, readonly [string, string]> = {
  PENDING_PRICING: ["Bakımnerde fiyatlandırması bekleniyor", "Awaiting Bakımnerde pricing"],
  AWAITING_CPO_DEADLINE: ["CPO kesin tedarik tarihi bekleniyor", "Awaiting the CPO's final supply date"],
  SUPPLY_IN_PROGRESS: ["Ek tedarik sürecinde", "Additional supply in progress"],
  DELAYED: ["Tedarik gecikti", "Supply delayed"],
  AWAITING_FIELD_CONFIRMATION: ["Saha ekibinin fiziksel teslim onayı bekleniyor", "Awaiting physical delivery confirmation from the field team"],
  SUPPLIED: ["Temin edildi", "Supplied"],
};

const emptyForm: JobForm = {
  id: "", cpoTenantId: "", contractorTenantId: "", stationName: "", city: "", district: "",
  maintenanceTarget: "DEVICE", stationMaintenanceArea: "GENERAL_COMPONENTS",
  chargerExternalId: "", givenDurationAt: "", appointmentAt: "", comment: "",
  cpoPrice: "", contractorCost: "",
};

const JOBS_PAGE_SIZE = 8;
type JobModalMode = "create" | "edit" | "assign";


export function JobsPage() {
  const { principal } = useAuth();

  const { language, locale } = usePreferences();

  const copy = (tr: string, en: string) => language === "tr" ? tr : en;

  const navigate = useNavigate();

  const { jobId } = useParams<{ jobId?: string }>();
  
  const [searchParams] = useSearchParams();
  
  const isPlatform = principal?.tenantType === "PLATFORM";
  
  const isCpo = principal?.tenantType === "CPO";
  
  const isContractor = principal?.tenantType === "CONTRACTOR";
  
  const [jobs, setJobs] = useState<JobApi[]>([]);
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  
  const [fieldWorkers, setFieldWorkers] = useState<FieldWorker[]>([]);
  
  const [chargePoints, setChargePoints] = useState<ChargePoint[]>([]);

  const [assetStations, setAssetStations] = useState<Station[]>([]);
  
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

  const [givenDuration, setGivenDuration] = useState("");
  
  const [fieldWorkerSelection, setFieldWorkerSelection] = useState("");
  
  const [modalOpen, setModalOpen] = useState(false);

  const [modalMode, setModalMode] = useState<JobModalMode>("create");
  
  const [form, setForm] = useState<JobForm>(emptyForm);
  
  const [error, setError] = useState("");
  
  const [filter, setFilter] = useState("ALL");
  
  const [query, setQuery] = useState(() => searchParams.get("search") ?? "");

  const [page, setPage] = useState(1);

  const [rating, setRating] = useState(0);

  const [ratingFeedback, setRatingFeedback] = useState("");

  const [paymentBusy, setPaymentBusy] = useState<"cpo" | "contractor" | null>(null);
  

  const load = useCallback(async () => setJobs(await apiRequest<JobApi[]>("/jobs-list")), []);
  
  const loadCollaboration = useCallback(async (jobId: string) => {
    const body = JSON.stringify({ jobId });
    
    const [media, report, additions, chat] = await Promise.all([
      apiRequest<Evidence[]>("/job-evidence-list", { method: "POST", body }),
      apiRequest<FieldReport | null>("/job-field-report-get", { method: "POST", body }),
      apiRequest<AdditionalRequest[]>("/additional-requests-list", { method: "POST", body }),
      isCpo ? Promise.resolve([] as JobMessage[]) : apiRequest<JobMessage[]>("/job-messages-list", { method: "POST", body }),
    ]);
    
    setEvidence(media);
     setFieldReport(report);
     setRequests(additions);
     setMessages(chat);
    
  }, [isCpo]);
  

  useEffect(() => {
    void load();
    
    const timer = window.setInterval(() => void load(), 3_000);
    
    if (isPlatform) void apiRequest<Tenant[]>("/tenants-list").then(setTenants);
    
    if (isPlatform || isCpo) {
      void apiRequest<ChargePoint[]>("/charge-points-list").then(setChargePoints);
      void apiRequest<Station[]>("/stations-list").then(setAssetStations);
    }
    
    if (isPlatform || isContractor) void apiRequest<FieldWorker[]>("/field-workers-list").then(setFieldWorkers);
    
    return () => window.clearInterval(timer);
    
  }, [isContractor, isCpo, isPlatform, load]);

  useEffect(() => {
    if (!jobId) return;
    void apiRequest<JobApi>("/jobs-detail", { method: "POST", body: JSON.stringify({ id: jobId }) })
      .then((job) => {
        setSelected(job);
        setAppointment(job.appointmentAt ? toInputDate(job.appointmentAt) : "");
        setGivenDuration(job.givenDurationAt ? toInputDate(job.givenDurationAt) : "");
        setFieldWorkerSelection(job.fieldWorkerUserId ?? "");
      })
      .catch(() => navigate("/dashboard", { replace: true }));
  }, [jobId, navigate]);
  
  useEffect(() => {
    if (selected) void loadCollaboration(selected.documentId);
    
  }, [loadCollaboration, selected]);
  
  useEffect(() => { setQuery(searchParams.get("search") ?? "");
    
   }, [searchParams]);
  

  const visibleJobs = useMemo(() => jobs.filter((job) => {
    const matchesFilter = filter === "ALL" || job.status === filter;
    
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    
    return matchesFilter && (!needle || `${job.id} ${job.station} ${job.charger ?? ""} ${job.cpo} ${job.contractor} ${job.city} ${job.district}`.toLocaleLowerCase("tr-TR").includes(needle));
    
  }), [filter, jobs, query]);

  useEffect(() => { setPage(1); }, [filter, query]);

  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(visibleJobs.length / JOBS_PAGE_SIZE));
    if (page > lastPage) setPage(lastPage);
  }, [page, visibleJobs.length]);

  const pagedJobs = visibleJobs.slice((page - 1) * JOBS_PAGE_SIZE, page * JOBS_PAGE_SIZE);
  

  function openCreate() {
    const appointmentAt = new Date(Date.now() + 86400000);
    appointmentAt.setMinutes(0, 0, 0);
    const givenDurationAt = new Date(Date.now() + 7 * 86400000);
    givenDurationAt.setMinutes(0, 0, 0);
    setModalMode("create");
    setSelected(null);
    setForm({
      ...emptyForm,
      cpoTenantId: isCpo ? principal?.tenantId ?? "" : "",
      appointmentAt: toInputDate(appointmentAt.toISOString()),
      givenDurationAt: isCpo ? toInputDate(givenDurationAt.toISOString()) : "",
    });
    setError("");
     setModalOpen(true);
    
  }
  function openEdit(job: JobApi) {
    setModalMode("edit");
    setForm({
      id: job.documentId, cpoTenantId: job.cpoTenantId, contractorTenantId: job.contractorTenantId ?? "",
      stationName: job.station, city: job.city, district: job.district,
      maintenanceTarget: job.maintenanceTarget ?? "DEVICE", stationMaintenanceArea: job.stationMaintenanceArea ?? "GENERAL_COMPONENTS",
      chargerExternalId: job.charger ?? "", givenDurationAt: job.givenDurationAt ? toInputDate(job.givenDurationAt) : "",
      appointmentAt: job.appointmentAt ? toInputDate(job.appointmentAt) : "", comment: job.comment ?? "",
      cpoPrice: job.amount === null ? "" : String(job.amount), contractorCost: job.contractorCost === null ? "" : String(job.contractorCost),
    });
     setError("");
     setModalOpen(true);
    
  }
  function openAssign(job: JobApi) {
    setModalMode("assign");
    setForm({
      ...emptyForm,
      id: job.documentId,
      cpoTenantId: job.cpoTenantId,
      contractorTenantId: job.contractorTenantId ?? "",
      stationName: job.station,
      city: job.city,
      district: job.district,
      appointmentAt: job.appointmentAt ? toInputDate(job.appointmentAt) : "",
      givenDurationAt: job.givenDurationAt ? toInputDate(job.givenDurationAt) : "",
      cpoPrice: job.amount === null ? "" : String(job.amount),
      contractorCost: job.contractorCost === null ? "" : String(job.contractorCost),
    });
    setError("");
    setModalOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
     setError("");
    
    try {
      const commonPayload = {
        ...form,
        cpoTenantId: isCpo ? principal?.tenantId : form.cpoTenantId,
        contractorTenantId: form.contractorTenantId || undefined,
        cpoPrice: form.cpoPrice === "" ? null : Number(form.cpoPrice),
        contractorCost: form.contractorCost === "" ? null : Number(form.contractorCost),
        appointmentAt: form.appointmentAt ? new Date(form.appointmentAt).toISOString() : undefined,
        givenDurationAt: form.givenDurationAt ? new Date(form.givenDurationAt).toISOString() : undefined,
      };
      const path = modalMode === "assign" ? "/jobs-assign" : modalMode === "edit" ? "/jobs-update" : "/jobs-create";
      const payload = modalMode === "assign" ? {
        id: form.id,
        contractorTenantId: form.contractorTenantId || undefined,
        appointmentAt: commonPayload.appointmentAt,
        cpoPrice: commonPayload.cpoPrice,
        contractorCost: commonPayload.contractorCost,
      } : commonPayload;
      await apiRequest(path, { method: "POST", body: JSON.stringify(payload) });
      
      await load();
       setModalOpen(false);
      if (jobId) navigate("/dashboard", { replace: true });
      
    } catch (reason) { setError(errorMessage(reason, copy("İş kaydedilemedi.", "The job could not be saved.")));
      
     }
  }
  async function remove(job: JobApi) {
    if (!window.confirm(copy(`${job.id} işini silmek istiyor musunuz?`, `Do you want to delete job ${job.id}?`))) return;
    
    try {
      await apiRequest("/jobs-delete", { method: "POST", body: JSON.stringify({ id: job.documentId }) });
      
      setSelected(null);
       await load();
      if (jobId) navigate("/dashboard", { replace: true });
      
    } catch (reason) { window.alert(errorMessage(reason, copy("İş silinemedi.", "The job could not be deleted.")));
      
     }
  }
  async function acceptAssignment() {
    if (!selected || !appointment) return;
    
    try {
      await apiRequest("/jobs-assignment-accept", {
        method: "POST", body: JSON.stringify({ id: selected.documentId, appointmentAt: new Date(appointment).toISOString() }),
      });
      
      await refreshSelected(selected.documentId);
      
    } catch (reason) { window.alert(errorMessage(reason, copy("Atama onaylanamadı.", "The assignment could not be accepted.")));
      
     }
  }
  async function updateAppointment() {
    if (!selected || !appointment) return;
    try {
      await apiRequest("/jobs-appointment-update", {
        method: "POST",
        body: JSON.stringify({ id: selected.documentId, appointmentAt: new Date(appointment).toISOString() }),
      });
      await refreshSelected(selected.documentId);
    } catch (reason) { window.alert(errorMessage(reason, copy("Randevu tarihi güncellenemedi.", "The appointment date could not be updated."))); }
  }
  async function updateGivenDuration() {
    if (!selected || !givenDuration) return;
    try {
      await apiRequest("/jobs-given-duration-update", {
        method: "POST",
        body: JSON.stringify({ id: selected.documentId, givenDurationAt: new Date(givenDuration).toISOString() }),
      });
      await refreshSelected(selected.documentId);
    } catch (reason) { window.alert(errorMessage(reason, copy("Verilen Süre güncellenemedi.", "The given time could not be updated."))); }
  }
  async function assignFieldWorker() {
    if (!selected || !fieldWorkerSelection) return;
    
    try {
      await apiRequest("/jobs-field-worker-assign", {
        method: "POST",
        body: JSON.stringify({ id: selected.documentId, fieldWorkerUserId: fieldWorkerSelection }),
      });
      
      await refreshSelected(selected.documentId);
      
    } catch (reason) { window.alert(errorMessage(reason, copy("Saha personeli atanamadı.", "The field worker could not be assigned.")));
      
     }
  }
  async function advance(status: string) {
    if (!selected) return;
    
    try {
      await apiRequest("/jobs-status-change", { method: "POST", body: JSON.stringify({ id: selected.documentId, status }) });
      
      await refreshSelected(selected.documentId);
      
    } catch (reason) { window.alert(errorMessage(reason, copy("Durum güncellenemedi.", "The status could not be updated.")));
      
     }
  }
  async function submitCpoReview() {
    if (!selected || rating < 1 || rating > 5) return;
    try {
      await apiRequest("/jobs-cpo-review", {
        method: "POST",
        body: JSON.stringify({ id: selected.documentId, rating, feedback: ratingFeedback.trim() || undefined }),
      });
      setRating(0);
      setRatingFeedback("");
      await refreshSelected(selected.documentId);
    } catch (reason) { window.alert(errorMessage(reason, copy("Puanlama kaydedilemedi.", "The rating could not be saved."))); }
  }
  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    
    if (!selected || !message.trim()) return;
    
    try {
      await apiRequest("/job-messages-send", { method: "POST", body: JSON.stringify({ jobId: selected.documentId, text: message }) });
      
      setMessage("");
       await loadCollaboration(selected.documentId);
      
    } catch (reason) { window.alert(errorMessage(reason, copy("Mesaj gönderilemedi.", "The message could not be sent.")));
      
     }
  }

  async function downloadAllEvidence() {
    if (!selected) return;
    
    try { await apiDownload("/job-evidence-download-all", { jobId: selected.documentId }, `${selected.id}-${copy("saha-fotograflari", "field-photos")}.zip`);
   }
    catch (reason) { window.alert(reason instanceof Error ? reason.message : copy("Fotoğraflar indirilemedi.", "The photos could not be downloaded."));
      
     }
  }

  async function payCpoInvoice() {
    if (!selected || paymentBusy) return;
    setPaymentBusy("cpo");
    
    try { await apiRequest("/jobs-payment-cpo", { method: "POST", body: JSON.stringify({ id: selected.documentId }) });
     await refreshSelected(selected.documentId);
   }
    catch (reason) { window.alert(errorMessage(reason, copy("Ödeme yapılamadı.", "The payment could not be completed.")));
      
     } finally { setPaymentBusy(null); }
  }

  async function payContractor() {
    if (!selected || paymentBusy) return;
    setPaymentBusy("contractor");
    
    try { await apiRequest("/jobs-payment-contractor", { method: "POST", body: JSON.stringify({ id: selected.documentId }) });
     await refreshSelected(selected.documentId);
   }
    catch (reason) { window.alert(errorMessage(reason, copy("Teknik servis ödemesi yapılamadı.", "The technical service payment could not be completed.")));
      
     } finally { setPaymentBusy(null); }
  }
  async function createAdditionalRequest(event: FormEvent) {
    event.preventDefault();
    
    if (!selected || !requestType || !requestDescription.trim()) return;
    
    try {
      await apiRequest("/additional-requests-create", {
        method: "POST", body: JSON.stringify({ jobId: selected.documentId, type: requestType, description: requestDescription }),
      });
      
      setRequestType("");
       setRequestDescription("");
      
      await loadCollaboration(selected.documentId);
      
    } catch (reason) { window.alert(errorMessage(reason, copy("Ek tedarik talebi oluşturulamadı.", "The additional supply request could not be created.")));
      
     }
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
      
    } catch (reason) { window.alert(errorMessage(reason, copy("Ek tedarik fiyatlandırılamadı.", "The additional supply request could not be priced.")));
      
     }
  }
  async function setAdditionalRequestDeadline(request: AdditionalRequest) {
    if (!selected || !requestDeadlines[request.id]) return;
    
    try {
      await apiRequest("/additional-requests-deadline", {
        method: "POST", body: JSON.stringify({ id: request.id, supplyDeadlineAt: new Date(requestDeadlines[request.id]).toISOString() }),
      });
      
      await refreshSelected(selected.documentId);
      
    } catch (reason) { window.alert(errorMessage(reason, copy("Kesin tedarik tarihi kaydedilemedi.", "The final supply date could not be saved.")));
      
     }
  }
  async function updateAdditionalRequestStatus(request: AdditionalRequest, partSupplyStatus: "DELAYED" | "AWAITING_FIELD_CONFIRMATION") {
    if (!selected || request.partSupplyStatus === partSupplyStatus) return;
    
    try {
      await apiRequest("/additional-requests-update", {
        method: "POST", body: JSON.stringify({ id: request.id, partSupplyStatus }),
      });
      
      await refreshSelected(selected.documentId);
      
    } catch (reason) { window.alert(errorMessage(reason, copy("Ek tedarik durumu güncellenemedi.", "The additional supply status could not be updated.")));
      
     }
  }
  async function refreshSelected(id: string) {
    const [fresh, detail] = await Promise.all([
      apiRequest<JobApi[]>("/jobs-list"),
      apiRequest<JobApi>("/jobs-detail", { method: "POST", body: JSON.stringify({ id }) }),
    ]);
    setJobs(fresh);
    setSelected(detail);
    setGivenDuration(detail.givenDurationAt ? toInputDate(detail.givenDurationAt) : "");
    
    await loadCollaboration(id);
    
  }

  const cpos = tenants.filter((item) => item.type === "CPO");
  
  const contractors = tenants.filter((item) => item.type === "CONTRACTOR");

  const eligibleContractors = contractors.filter((item) => (item.status === undefined || item.status === "ACTIVE")
    && (!form.city || (item.profile?.serviceRegions ?? [])
      .some((region) => normalizeLocation(region) === normalizeLocation(form.city))));
  
  const availableFieldWorkers = fieldWorkers.filter((item) => item.tenantId === selected?.contractorTenantId);
  
  const stations = uniqueBy([
    ...chargePoints.map((item) => ({ station: item.station.name, city: item.station.city, district: item.station.district, cpoTenantId: item.cpoTenantId })),
    ...assetStations.map((item) => ({ station: item.name, city: item.city, district: item.district, cpoTenantId: item.cpoTenantId })),
  ].filter((item) => !form.cpoTenantId || item.cpoTenantId === form.cpoTenantId), (job) => `${job.cpoTenantId}|${job.station}|${job.city}|${job.district}`);
  
  const chargers = chargePoints
    .filter((item) => (!form.cpoTenantId || item.cpoTenantId === form.cpoTenantId)
      && item.station.name === form.stationName && item.station.city === form.city && item.station.district === form.district)
    .map((item) => ({
      charger: item.externalId, cpoTenantId: item.cpoTenantId,
      station: item.station.name, city: item.station.city, district: item.station.district,
    }));

  function closeDetail() {
    setSelected(null);
    if (jobId) navigate("/dashboard");
  }
    
  const nextPlatformStatus: Record<string, [string, string]> = {
    MAINTENANCE_DONE: ["MAINTENANCE_APPROVED", copy("Bakımı onayla", "Approve maintenance")],
    PAID: ["CLOSED", copy("Süreci sonlandır", "Close process")],
  };
  

  return <>
    <PageHeader eyebrow={copy("CANLI OPERASYON", "LIVE OPERATIONS")} title={copy("İş yönetimi", "Job management")} description={copy("CPO talebinden saha kanıtlarına, onaydan hakedişe kadar ortak iş akışı.", "A shared workflow from the CPO request and field evidence through approval and settlement.")} />
    <div className="toolbar">
      <div className="tabs">
        {[["ALL", copy("Tüm işler", "All jobs")], ["WAITING", copy("Bekleyen", "Waiting")], ["ASSIGNED", copy("Atanan", "Assigned")], ["IN_PROGRESS", copy("İşlemde", "In progress")], ["ADDITIONAL_SUPPLY", copy("Ek tedarik", "Additional supply")]].map(([value, label]) =>
          <button className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)} key={value}>{label}</button>)}
      </div>
      <label className="table-search"><input aria-label={copy("İşlerde ara", "Search jobs")} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy("İş, firma, cihaz veya istasyon ara", "Search jobs, companies, devices, or stations")} /></label>
      <button className="button button--outline" onClick={() => void load()}><RefreshCw size={15} /> {copy("Yenile", "Refresh")}</button>
      {isCpo && <button className="button button--primary" onClick={openCreate}><Plus size={16} /> {copy("Yeni iş", "New job")}</button>}
    </div>
    <section className="data-card">
      <div className="data-table job-table">
        <div className="data-row data-head"><span>{copy("İŞ / CİHAZ KODU", "JOB / DEVICE CODE")}</span><span>{copy("CPO FİRMA", "CPO COMPANY")}</span><span>{copy("SAHA OPERASYONU", "FIELD OPERATION")}</span><span>{copy("DURUM", "STATUS")}</span><span>{copy("VERİLEN SÜRE", "GIVEN TIME")}</span><span>{copy("TUTAR", "AMOUNT")}</span><span /></div>
         {pagedJobs.map((job) => <button className={`data-row ${isPlatform && !job.contractorTenantId ? "assignment-pending-row" : ""}`} key={job.documentId} onClick={() => { setSelected(job);
           setAppointment(job.appointmentAt ? toInputDate(job.appointmentAt) : "");
           setGivenDuration(job.givenDurationAt ? toInputDate(job.givenDurationAt) : "");
           setFieldWorkerSelection(job.fieldWorkerUserId ?? "");
          
         }}>
          <span className="primary-cell"><b>{job.id}</b><small>{jobAssetLabel(job, language)} · {job.station}</small></span>
          <span><b>{job.cpo}</b><small>{job.city}</small></span>
          <span><b>{job.contractor}</b><small>{job.fieldWorkerName ? `${copy("Saha", "Field")}: ${job.fieldWorkerName}` : job.contractorAcceptedAt ? copy("Saha ataması bekliyor", "Awaiting field assignment") : job.contractorTenantId ? copy("Onay bekliyor", "Awaiting approval") : copy("Henüz atanmadı", "Not assigned yet")}</small></span>
          <span><StatusBadge status={statusMap[job.status] ?? "waiting"} /></span>
          <span>{job.givenDurationAt ? new Date(job.givenDurationAt).toLocaleString(locale) : copy("CPO bekleniyor", "Awaiting CPO")}</span>
          <span><b>{job.amount === null ? "-" : money(job.amount, locale)}</b></span><span><ChevronRight size={18} /></span>
        </button>)}
        {visibleJobs.length === 0 && <div className="empty-state"><b>{copy("Bu görünümde iş yok", "No jobs in this view")}</b><span>{copy("CPO yeni bir bakım talebi yayınlayabilir.", "The CPO can publish a new maintenance request.")}</span></div>}
      </div>
      <Pagination page={page} pageSize={JOBS_PAGE_SIZE} total={visibleJobs.length} onPageChange={setPage} />
    </section>

    {selected && <div className="drawer-wrap">
      <button className="drawer-backdrop" onClick={closeDetail} aria-label={copy("Kapat", "Close")} />
      <aside className="detail-drawer job-detail-drawer" role="dialog" aria-modal="true" aria-label={copy("İş detayı", "Job details")}>
        <div className="drawer-head"><div><span>{copy("İŞ DETAYI · CANLI", "JOB DETAILS · LIVE")}</span><h2>{selected.id}</h2><p>{selected.station} · {jobAssetLabel(selected, language)}</p></div><button autoFocus className="icon-button" aria-label={copy("İş detayını kapat", "Close job details")} onClick={closeDetail}><X /></button></div>
        <div className="drawer-status"><StatusBadge status={statusMap[selected.status] ?? "waiting"} /><span>{copy("Verilen Süre", "Given Time")}: <b>{selected.givenDurationAt ? new Date(selected.givenDurationAt).toLocaleString(locale) : copy("CPO belirlemedi", "Not set by CPO")}</b></span></div>
        <div className="detail-summary">
          <div><small>{copy("CPO FİRMA", "CPO COMPANY")}</small><b>{selected.cpo}</b></div><div><small>{copy("TAŞERON AĞI", "TECHNICAL SERVICE")}</small><b>{selected.contractor}</b></div>
          <div><small>{copy("RANDEVU", "APPOINTMENT")}</small><b>{selected.appointmentAt ? new Date(selected.appointmentAt).toLocaleString(locale) : copy("Seçilmedi", "Not selected")}</b></div>
          <div><small>{copy("CİHAZ KODU", "DEVICE CODE")}</small><b>{selected.maintenanceTarget === "DEVICE" ? selected.charger || "-" : copy("İstasyon bakımı", "Station maintenance")}</b></div>
        </div>
        {selected.comment && <section className="drawer-section job-comment"><h3><MessageSquare /> {copy("İş yorumu", "Job comment")}</h3><p>{selected.comment}</p></section>}
        <JobProgressBars job={selected} requests={requests} tenantType={principal?.tenantType ?? "PLATFORM"} language={language} />

        {isCpo && selected.status === "WAITING" && !selected.contractorTenantId && <section className="drawer-section action-panel">
          <h3><CalendarClock /> {copy("Verilen Süreyi güncelle", "Update Given Time")}</h3>
          <p>{copy("Bu süreyi yalnız CPO belirleyebilir. Teknik servis atandıktan sonra süre kilitlenir.", "Only the CPO can set this time. It is locked after a technical service is assigned.")}</p>
          <div><input aria-label={copy("Verilen Süreyi güncelle", "Update Given Time")} type="datetime-local" min={latestInputDate(selected.appointmentAt, new Date().toISOString())} value={givenDuration} onChange={(event) => setGivenDuration(event.target.value)} /><button className="button button--primary" disabled={!givenDuration || givenDuration === (selected.givenDurationAt ? toInputDate(selected.givenDurationAt) : "") || Boolean(selected.appointmentAt && givenDuration < toInputDate(selected.appointmentAt))} onClick={() => void updateGivenDuration()}>{copy("Süreyi güncelle", "Update time")}</button></div>
        </section>}

        {isContractor && selected.status === "ASSIGNED" && !selected.contractorAcceptedAt && <section className="drawer-section action-panel">
          <h3><CalendarClock /> {copy("Atamayı 1 gün içinde onayla", "Accept the assignment within 1 day")}</h3>
          <p>{copy("Cihazın şarj hizmeti veremeyeceği tarih ve saati seçin. CPO'ya kesinti bildirimi oluşturulacaktır.", "Select the date and time when the device will be unavailable for charging. An outage notice will be created for the CPO.")}</p>
          <div><input aria-label={copy("Atama randevusu", "Assignment appointment")} type="datetime-local" min={toInputDate(new Date().toISOString())} max={selected.givenDurationAt ? toInputDate(selected.givenDurationAt) : undefined} value={appointment} onChange={(event) => setAppointment(event.target.value)} /><button className="button button--primary" disabled={!appointment} onClick={() => void acceptAssignment()}>{copy("Randevuyu onayla", "Confirm appointment")}</button></div>
        </section>}

        {(isPlatform || isCpo || (isContractor && selected.contractorAcceptedAt)) && ["WAITING", "ASSIGNED"].includes(selected.status) && <section className="drawer-section action-panel">
          <h3><CalendarClock /> {copy("Randevu tarihini güncelle", "Update appointment date")}</h3>
          <p>{copy("Tüm yönetici rolleri randevuyu, role gösterilen Verilen Süre sınırını aşmadan değiştirebilir.", "All manager roles can change the appointment without exceeding the Given Time shown for their role.")}</p>
          <div><input aria-label={copy("Randevu tarihini güncelle", "Update appointment date")} type="datetime-local" min={toInputDate(new Date().toISOString())} max={selected.givenDurationAt ? toInputDate(selected.givenDurationAt) : undefined} value={appointment} onChange={(event) => setAppointment(event.target.value)} /><button className="button button--primary" disabled={!appointment || appointment === (selected.appointmentAt ? toInputDate(selected.appointmentAt) : "")} onClick={() => void updateAppointment()}>{copy("Randevuyu güncelle", "Update appointment")}</button></div>
        </section>}

        {(isPlatform || isContractor) && selected.contractorTenantId && !["MAINTENANCE_DONE", "MAINTENANCE_APPROVED", "CPO_APPROVAL", "PAID", "CLOSED"].includes(selected.status) && <section className="drawer-section action-panel">
          <h3><UserRound /> {copy("Atanmış saha personeli", "Assigned field worker")}</h3>
          <p>{copy("Yalnız seçilen taşeron firmaya ait aktif saha hesapları listelenir. İş, atamadan sonra personelin Mobile App ekranına düşer.", "Only active field accounts belonging to the selected technical service are listed. After assignment, the job appears in the worker's Mobile App.")}</p>
          <div>
            <select value={fieldWorkerSelection} onChange={(event) => setFieldWorkerSelection(event.target.value)}>
              <option value="">{copy("Saha personeli seçin", "Select a field worker")}</option>
              {availableFieldWorkers.map((worker) => <option value={worker.id} key={worker.id}>{worker.name} · {worker.phone || worker.email}</option>)}
            </select>
            <button className="button button--primary" disabled={!fieldWorkerSelection || fieldWorkerSelection === selected.fieldWorkerUserId} onClick={() => void assignFieldWorker()}>
              {selected.fieldWorkerUserId ? copy("Atamayı değiştir", "Change assignment") : copy("Saha personeline ata", "Assign field worker")}
            </button>
          </div>
        </section>}

        {(isPlatform || isContractor) && ["MAINTENANCE_DONE", "MAINTENANCE_APPROVED", "CPO_APPROVAL", "PAID", "CLOSED"].includes(selected.status) && <section className="drawer-section locked-assignment">
          <h3><UserRound /> {copy("Saha personeli ataması kilitlendi", "Field worker assignment locked")}</h3>
          <p>{copy(`Bakım tamamlandığı için ${selected.fieldWorkerName ?? "atanmış saha personeli"} artık değiştirilemez.`, `Maintenance is complete, so ${selected.fieldWorkerName ?? "the assigned field worker"} can no longer be changed.`)}</p>
        </section>}

        <section className="drawer-section">
          <div className="section-title"><h3><ClipboardCheck /> {copy("Saha işlem formu", "Field service form")}</h3>{fieldReport?.completed && <span><CheckCircle2 size={12} /> {copy("Tamamlandı", "Completed")}</span>}</div>
          {fieldReport ? <div className="field-report-summary">
            <div><small>{copy("HİZMET", "SERVICE")}</small><b>{fieldReportLabel(fieldReport.serviceType, language)}</b></div>
            <div><small>{copy("CİHAZ DURUMU", "DEVICE CONDITION")}</small><b>{fieldReportLabel(fieldReport.equipmentCondition, language)}</b></div>
            <div><small>{copy("ARIZA", "FAULT")}</small><b>{fieldReportLabel(fieldReport.faultCategory, language)}</b></div>
            <div><small>{copy("İŞLEM", "ACTION")}</small><b>{fieldReportLabel(fieldReport.actionTaken, language)}</b></div>
            <div><small>{copy("GÜVENLİK", "SAFETY")}</small><b>{fieldReportLabel(fieldReport.safetyResult, language)}</b></div>
            <div><small>{copy("ÖLÇÜM", "MEASUREMENT")}</small><b>{fieldReport.measurements?.inputVoltage ?? "-"} V / {fieldReport.measurements?.outputVoltage ?? "-"} V</b></div>
            <p>{fieldReport.notes}</p>
          </div> : <p className="muted-copy">{copy("Saha personeli işlem formunu henüz kaydetmedi.", "The field worker has not saved the service form yet.")}</p>}
        </section>

        <section className="drawer-section">
          <div className="section-title"><h3><Image /> {copy("Mobil saha kanıtları", "Mobile field evidence")}</h3>{evidence.some((item) => item.downloadAvailable) && <button className="button button--outline evidence-download-all" type="button" onClick={() => void downloadAllEvidence()}><Download /> {copy("Tümünü indir", "Download all")}</button>}</div>
          <div className="evidence-summary">
            <EvidenceCount label={copy("Bakım öncesi", "Before maintenance")} count={evidence.filter((item) => item.phase === "BEFORE").length} target={6} language={language} />
            <EvidenceCount label={copy("Bakım sonrası", "After maintenance")} count={evidence.filter((item) => item.phase === "AFTER").length} target={6} language={language} />
            <EvidenceCount label={copy("Markalı tişört", "Branded shirt")} count={evidence.filter((item) => item.phase === "BRANDED").length} target={1} language={language} />
          </div>
          {evidence.length > 0 && <div className="evidence-feed">{evidence.map((item) => <article key={item.id}><Image /><div><b>{item.phase === "BEFORE" ? copy("Önce", "Before") : item.phase === "AFTER" ? copy("Sonra", "After") : copy("Markalı", "Branded")}</b><span>{item.description || copy("Açıklama yok", "No description")}</span></div></article>)}</div>}
        </section>

        <section className="drawer-section">
          <div className="section-title"><h3><Wrench /> {copy("Ek tedarik talepleri", "Additional supply requests")}</h3><span>{requests.length}</span></div>
          {requests.length === 0 && <p className="muted-copy">{copy("Bu iş için ek tedarik talebi bulunmuyor.", "There are no additional supply requests for this job.")}</p>}
          <div className="supply-request-list">{requests.map((item) => <article className="request-card supply-request-card" key={item.id}>
            <div className="supply-request-copy"><b>{supplyTypeLabel(item.type, language)}</b><span>{item.description}</span></div>
            <div className="supply-request-meta">
              <em className={`supply-status supply-status--${item.partSupplyStatus.toLocaleLowerCase("en-US")}`}>{supplyStatusLabel(item.partSupplyStatus, language)}</em>
              {(isPlatform || isCpo) && item.cpoPrice !== null && item.cpoPrice !== undefined && <strong>{money(item.cpoPrice, locale)}</strong>}
              {item.supplyDeadlineAt && <small>{copy("Kesin tarih", "Final date")}: {new Date(item.supplyDeadlineAt).toLocaleString(locale)}</small>}
            </div>
            {isPlatform && item.partSupplyStatus === "PENDING_PRICING" && <div className="supply-request-action"><label><span>{copy("CPO ücreti", "CPO price")}</span><input aria-label={copy("CPO ücreti", "CPO price")} min="1" type="number" value={requestPrices[item.id] ?? ""} onChange={(event) => setRequestPrices((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="₺" /></label><button className="button button--primary" disabled={Number(requestPrices[item.id]) <= 0} onClick={() => void priceAdditionalRequest(item)}>{copy("Fiyatlandır ve CPO'ya aktar", "Set price and send to CPO")}</button></div>}
            {isCpo && item.partSupplyStatus === "AWAITING_CPO_DEADLINE" && <div className="supply-request-action"><label><span>{copy("Kesin tedarik tarihi", "Final supply date")}</span><input aria-label={copy("Kesin tedarik tarihi", "Final supply date")} type="datetime-local" min={toInputDate(new Date().toISOString())} value={requestDeadlines[item.id] ?? ""} onChange={(event) => setRequestDeadlines((current) => ({ ...current, [item.id]: event.target.value }))} /></label><button className="button button--primary" disabled={!requestDeadlines[item.id]} onClick={() => void setAdditionalRequestDeadline(item)}>{copy("Tarihi bildir", "Submit date")}</button></div>}
            {isCpo && ["SUPPLY_IN_PROGRESS", "DELAYED"].includes(item.partSupplyStatus) && <div className="supply-manual-actions">{item.partSupplyStatus !== "DELAYED" && <button className="button button--outline" onClick={() => void updateAdditionalRequestStatus(item, "DELAYED")}>{copy("Gecikme bildir", "Report delay")}</button>}<button className="button button--primary" onClick={() => void updateAdditionalRequestStatus(item, "AWAITING_FIELD_CONFIRMATION")}>{copy("Saha teslimini bildir", "Report field delivery")}</button></div>}
          </article>)}</div>
          {(isContractor || isPlatform) && ["ASSIGNED", "IN_PROGRESS", "ADDITIONAL_SUPPLY"].includes(selected.status) && <form className="inline-request supply-create-form" onSubmit={createAdditionalRequest}><select aria-label={copy("Tedarik türü", "Supply type")} required value={requestType} onChange={(event) => setRequestType(event.target.value)}><option value="">{copy("Tedarik türünü seçin", "Select supply type")}</option>{supplyTypes.map(([value]) => <option value={value} key={value}>{supplyTypeLabel(value, language)}</option>)}</select><textarea aria-label={copy("Ek tedarik açıklaması", "Additional supply description")} required minLength={5} maxLength={1000} rows={3} value={requestDescription} onChange={(event) => setRequestDescription(event.target.value)} placeholder={copy("Gereken parça veya işlemi açıklayın", "Describe the required part or work")} /><button className="button button--primary" disabled={!requestType || requestDescription.trim().length < 5}>{copy("Bakımnerde'ye aktar", "Send to Bakımnerde")}</button><small>{copy("Talep önce yalnız Bakımnerde ekibine ulaşır; fiyatlandırmadan sonra CPO'ya aktarılır. Fiyat bilgisi saha ve teknik servis ekranlarında gösterilmez.", "The request first goes only to the Bakımnerde team and is sent to the CPO after pricing. Price information is not shown on field or technical service screens.")}</small></form>}
        </section>

        {!isCpo && <section className="drawer-section job-chat">
          <div className="section-title"><h3><MessageSquare /> {copy("İş görüşmesi", "Job conversation")}</h3><span>{messages.length} {copy("mesaj", "messages")}</span></div>
          <div className="chat-feed">{messages.length === 0 && <p className="muted-copy">{copy("Bu işte henüz mesaj yok.", "There are no messages for this job yet.")}</p>}{messages.map((item) => <article className={item.mine ? "mine" : ""} key={item.id}><b>{item.senderName} · {item.senderTenantName}</b><p>{item.text}</p><small>{new Date(item.createdAt).toLocaleString(locale)}</small></article>)}</div>
          <form className="chat-form" onSubmit={sendMessage}><input aria-label={copy("İş mesajı", "Job message")} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={copy("Bakımnerde veya taşeron ekibine mesaj yazın", "Write a message to Bakımnerde or the technical service team")} /><button aria-label={copy("Mesaj gönder", "Send message")} disabled={!message.trim()}><Send /></button></form>
        </section>}

        {(isPlatform || isCpo) && selected.cpoReview && <section className="drawer-section cpo-review-summary"><h3><Star /> {copy("CPO puanlaması", "CPO rating")}</h3><strong>{"★".repeat(selected.cpoReview.rating)}{"☆".repeat(5 - selected.cpoReview.rating)}</strong><p>{selected.cpoReview.feedback || copy("Yazılı geribildirim eklenmedi.", "No written feedback was added.")}</p><small>{new Date(selected.cpoReview.ratedAt).toLocaleString(locale)} · {copy("Yalnız Admin ve CPO", "Admin and CPO only")}</small></section>}
        {isCpo && selected.status === "MAINTENANCE_APPROVED" && <section className="drawer-section cpo-review-form"><h3><Star /> {copy("Zorunlu CPO puanlaması", "Required CPO rating")}</h3><p>{copy("İşi onaylamak için teknik hizmeti 5 yıldız üzerinden puanlayın.", "Rate the technical service out of 5 stars to approve the job.")}</p><div className="rating-stars" role="radiogroup" aria-label={copy("İş puanı", "Job rating")}>{[1, 2, 3, 4, 5].map((score) => <button type="button" className={score <= rating ? "is-active" : ""} role="radio" aria-checked={score === rating} aria-label={copy(`${score} yıldız`, `${score} stars`)} onClick={() => setRating(score)} key={score}><Star /></button>)}</div><textarea aria-label={copy("CPO geribildirimi", "CPO feedback")} maxLength={1000} rows={3} value={ratingFeedback} onChange={(event) => setRatingFeedback(event.target.value)} placeholder={copy("Admin ile paylaşılacak geribildirim (isteğe bağlı)", "Feedback shared with the Admin (optional)")} /><button className="button button--primary" disabled={rating === 0} onClick={() => void submitCpoReview()}><ShieldCheck size={15} /> {copy("Puanla ve CPO onayını tamamla", "Rate and complete CPO approval")}</button></section>}
        <div className="drawer-actions job-actions">
          {isPlatform && <><button className="button button--outline danger-button" onClick={() => void remove(selected)}><Trash2 size={15} /> {copy("Sil", "Delete")}</button>{["WAITING", "ASSIGNED"].includes(selected.status) && !selected.maintenanceStartedAt && <><button className="button button--outline" onClick={() => openAssign(selected)}><UserRound size={15} /> {copy("Ata", "Assign")}</button><button className="button button--outline" onClick={() => openEdit(selected)}><Edit3 size={15} /> {copy("Düzenle", "Edit")}</button></>}</>}
          {isPlatform && nextPlatformStatus[selected.status] && <button className="button button--primary" onClick={() => void advance(nextPlatformStatus[selected.status][0])}>{nextPlatformStatus[selected.status][1]}</button>}
          {isCpo && selected.status === "CPO_APPROVAL" && !selected.cpoToPlatformPaidAt && <button className="button button--primary" disabled={Boolean(paymentBusy)} onClick={() => void payCpoInvoice()}><CreditCard size={15} /> {paymentBusy === "cpo" ? copy("Ödeniyor…", "Paying…") : copy("Bakımnerde ücretini öde", "Pay Bakımnerde fee")}</button>}
          {isPlatform && selected.status === "CPO_APPROVAL" && selected.cpoToPlatformPaidAt && !selected.contractorPaidAt && <button className="button button--primary" disabled={Boolean(paymentBusy)} onClick={() => void payContractor()}><CreditCard size={15} /> {paymentBusy === "contractor" ? copy("Ödeniyor…", "Paying…") : copy("Teknik servis ücretini öde", "Pay technical service fee")}</button>}
        </div>
      </aside>
    </div>}

    {modalOpen && <div className="modal-wrap">
      <button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label={copy("Kapat", "Close")} />
      <form className="tenant-modal job-modal" onSubmit={save} role="dialog" aria-modal="true" aria-label={modalMode === "assign" ? copy("İşi ata", "Assign job") : modalMode === "edit" ? copy("İşi düzenle", "Edit job") : copy("Yeni bakım talebi", "New maintenance request")}>
        <div className="modal-head"><div><p className="eyebrow">{modalMode === "assign" ? copy("İŞİ ATA", "ASSIGN JOB") : modalMode === "edit" ? copy("İŞİ DÜZENLE", "EDIT JOB") : copy("YENİ BAKIM TALEBİ", "NEW MAINTENANCE REQUEST")}</p><h2>{modalMode === "assign" ? copy("Teknik ekip ve ticari atama", "Technical team and commercial assignment") : copy("Bakım işi bilgileri", "Maintenance job information")}</h2><span>{modalMode === "assign" ? copy("CPO tarafından belirlenen istasyon, cihaz kodu, yorum ve verilen süre bu ekranda değiştirilemez.", "The station, device code, comment, and given time set by the CPO cannot be changed on this screen.") : isCpo ? copy("Verilen Süre yalnız CPO tarafından belirlenir; varsayılan randevu bu süreyi aşamaz.", "Only the CPO sets the Given Time; the default appointment cannot exceed it.") : copy("İş parametrelerini düzenleyebilirsiniz; Verilen Süre CPO değeridir ve salt okunurdur.", "You can edit the job parameters; the CPO's Given Time is read-only.")}</span></div><button type="button" className="icon-button" aria-label={copy("Formu kapat", "Close form")} onClick={() => setModalOpen(false)}><X /></button></div>
        <div className="modal-fields">
          {modalMode === "assign" ? <>
            <div className="assignment-snapshot field-wide"><span><small>{copy("İSTASYON", "STATION")}</small><b>{form.stationName} · {form.city}/{form.district}</b></span><span><small>{copy("VERİLEN SÜRE", "GIVEN TIME")}</small><b>{form.givenDurationAt ? new Date(form.givenDurationAt).toLocaleString(locale) : copy("CPO belirlemedi", "Not set by CPO")}</b></span></div>
            <Select label={copy("Teknik servis", "Technical service")} placeholder={copy("Seçin", "Select")} value={form.contractorTenantId} set={(value) => setForm({ ...form, contractorTenantId: value })} options={eligibleContractors} required />
            {form.city && eligibleContractors.length === 0 && <div className="coverage-warning field-wide">{copy(`${form.city} bölgesine hizmet veren aktif teknik servis bulunamadı.`, `No active technical service was found for ${form.city}.`)}</div>}
            <label><span>{copy("Randevu Tarihi", "Appointment Date")}</span><input required type="datetime-local" min={toInputDate(new Date().toISOString())} max={selected?.contractorGivenDurationAt ? toInputDate(selected.contractorGivenDurationAt) : form.givenDurationAt || undefined} value={form.appointmentAt} onChange={(event) => setForm({ ...form, appointmentAt: event.target.value })} /></label>
            <JobField label={copy("CPO satış fiyatı", "CPO sales price")} value={form.cpoPrice} set={(value) => setForm({ ...form, cpoPrice: value })} type="number" />
            <JobField label={copy("Teknik servis maliyeti", "Technical service cost")} value={form.contractorCost} set={(value) => setForm({ ...form, contractorCost: value })} type="number" />
          </> : <>
            {isPlatform && <Select label={copy("CPO firma", "CPO company")} placeholder={copy("Seçin", "Select")} value={form.cpoTenantId} set={(value) => {
              setForm({ ...form, cpoTenantId: value, stationName: "", city: "", district: "", chargerExternalId: "" });
            }} options={cpos} required />}
            <label><span>{copy("Bakım türü", "Maintenance type")}</span><select value={form.maintenanceTarget} onChange={(event) => {
              const maintenanceTarget = event.target.value as JobForm["maintenanceTarget"];
              setForm({ ...form, maintenanceTarget, chargerExternalId: maintenanceTarget === "DEVICE" ? form.chargerExternalId : "" });
            }}><option value="DEVICE">{copy("Cihaz bakımı", "Device maintenance")}</option><option value="STATION">{copy("İstasyon bakımı", "Station maintenance")}</option></select></label>
            <label><span>{copy("İstasyon", "Station")}</span><select required value={`${form.stationName}|${form.city}|${form.district}`} onChange={(event) => {
              const station = stations.find((item) => `${item.station}|${item.city}|${item.district}` === event.target.value);
              if (station) setForm({ ...form, stationName: station.station, city: station.city, district: station.district, chargerExternalId: "" });
              else setForm({ ...form, stationName: "", city: "", district: "", chargerExternalId: "" });
            }}><option value="||">{copy("İstasyon seçin", "Select station")}</option>{stations.map(item => <option value={`${item.station}|${item.city}|${item.district}`} key={`${item.cpoTenantId}|${item.station}|${item.city}|${item.district}`}>{item.station} · {item.city}/{item.district}</option>)}</select></label>
            {form.maintenanceTarget === "DEVICE" ? <label><span>{copy("Cihaz kodu", "Device code")}</span><select required value={form.chargerExternalId} onChange={(event) => setForm({ ...form, chargerExternalId: event.target.value })}><option value="">{copy("Cihaz seçin", "Select device")}</option>{chargers.map(item => <option value={item.charger} key={item.charger}>{item.charger}</option>)}</select></label> : <label><span>{copy("İstasyon bakım alanı", "Station maintenance area")}</span><select required value={form.stationMaintenanceArea} onChange={(event) => setForm({ ...form, stationMaintenanceArea: event.target.value as JobForm["stationMaintenanceArea"] })}><option value="GENERAL_COMPONENTS">{copy("İstasyonun genel parçaları", "General station components")}</option><option value="GRID_CONNECTION">{copy("Bölgesel şebeke bağlantısı", "Regional grid connection")}</option></select></label>}
            <label className="field-wide"><span>{copy("Yorum", "Comment")}</span><textarea maxLength={2000} rows={4} value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} placeholder={copy("İş ile ilgili manuel yorum ekleyin", "Add a manual comment about the job")} /></label>
            <label><span>{copy("Randevu Tarihi (Varsayılan)", "Appointment Date (Default)")}</span><input required type="datetime-local" min={toInputDate(new Date().toISOString())} max={form.givenDurationAt || undefined} value={form.appointmentAt} onChange={(event) => setForm({ ...form, appointmentAt: event.target.value })} /></label>
            {isCpo ? <label><span>{copy("Verilen Süre", "Given Time")}</span><input required type="datetime-local" min={form.appointmentAt || toInputDate(new Date().toISOString())} value={form.givenDurationAt} onChange={(event) => setForm({ ...form, givenDurationAt: event.target.value })} /></label> : <label><span>{copy("Verilen Süre (CPO)", "Given Time (CPO)")}</span><input readOnly value={form.givenDurationAt} /></label>}
            {isPlatform && <><JobField label={copy("CPO satış fiyatı", "CPO sales price")} value={form.cpoPrice} set={(value) => setForm({ ...form, cpoPrice: value })} type="number" required={false} /><JobField label={copy("Teknik servis maliyeti", "Technical service cost")} value={form.contractorCost} set={(value) => setForm({ ...form, contractorCost: value })} type="number" required={false} /></>}
          </>}
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>{copy("Vazgeç", "Cancel")}</button><button className="button button--primary">{modalMode === "assign" ? copy("Atamayı kaydet", "Save assignment") : modalMode === "edit" ? copy("Değişiklikleri kaydet", "Save changes") : copy("Talebi oluştur", "Create request")}</button></div>
      </form>
    </div>}
  </>;
  
}

function JobProgressBars({ job, requests, tenantType, language }: { job: JobApi;
   requests: AdditionalRequest[];
   tenantType: string;
   language: AppLanguage }) {
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
  const finalStatuses = ["MAINTENANCE_DONE", "MAINTENANCE_APPROVED", "CPO_APPROVAL", "PAID", "CLOSED"];
  
  const platformApproved = Boolean(job.platformApprovedAt) || ["MAINTENANCE_APPROVED", "CPO_APPROVAL", "PAID", "CLOSED"].includes(job.status);
  
  const cpoApproved = Boolean(job.cpoApprovedAt) || ["CPO_APPROVAL", "PAID", "CLOSED"].includes(job.status);
  
  const supplyOpen = requests.some((request) => request.partSupplyStatus !== "SUPPLIED");
  
  const maintenanceSteps = [
    [copy("Talep oluşturuldu", "Request created"), true],
    [copy("Teknik Servise Atandı", "Assigned to technical service"), Boolean(job.contractorTenantId)],
    [copy("Saha Personeline atandı", "Assigned to field worker"), Boolean(job.fieldWorkerUserId)],
    [copy("Bakım başladı", "Maintenance started"), Boolean(job.maintenanceStartedAt)],
    [copy("Bakım tamamlandı", "Maintenance completed"), Boolean(job.maintenanceCompletedAt) || finalStatuses.includes(job.status)],
    [copy("Bakım raporu onaylandı (Bakımnerde)", "Maintenance report approved (Bakımnerde)"), platformApproved],
    [copy("Bakım raporu onaylandı (CPO)", "Maintenance report approved (CPO)"), cpoApproved],
    [copy("Talep Kapatıldı (Bakımnerde)", "Request closed (Bakımnerde)"), Boolean(job.closedAt) || job.status === "CLOSED"],
  ] as Array<[string, boolean]>;
  
  const priceDetermined = tenantType === "PLATFORM"
    ? Number(job.amount ?? 0) > 0 && Number(job.contractorCost ?? 0) > 0
    : tenantType === "CPO" ? Number(job.amount ?? 0) > 0 : Number(job.amount ?? 0) > 0;
    
  const paymentSteps: Array<[string, boolean]> = [[copy("Ücret belirlendi", "Price set"), priceDetermined]];
  
  if (tenantType === "PLATFORM" || tenantType === "CPO") paymentSteps.push([copy("Ödeme Yapıldı (CPO → Bakımnerde)", "Payment completed (CPO → Bakımnerde)"), Boolean(job.cpoToPlatformPaidAt)]);
  
  if (tenantType === "PLATFORM" || tenantType === "CONTRACTOR") paymentSteps.push([copy("Ödeme Yapıldı (Bakımnerde → Teknik Servis)", "Payment completed (Bakımnerde → Technical Service)"), Boolean(job.contractorPaidAt)]);
  
  const supplySteps: Array<[string, boolean]> = requests.length === 0 ? [] : [
    [copy("Talep oluşturuldu", "Request created"), true],
    [copy("Fiyat belirlendi", "Price set"), requests.every((request) => request.partSupplyStatus !== "PENDING_PRICING")],
    [copy("Parça teminatı son tarihi belirlendi", "Part supply deadline set"), requests.every((request) => Boolean(request.supplyDeadlineAt))],
    [copy("Parça Saha ekibine ulaştı", "Part delivered to the field team"), requests.every((request) => request.partSupplyStatus === "SUPPLIED")],
  ];
  
  return <section className="drawer-section progress-stack">
    <ProgressTrack icon={<Wrench />} title={copy("Bakım durumu", "Maintenance status")} badge={supplyOpen ? copy("Ek Tedarik", "Additional Supply") : undefined} steps={maintenanceSteps} />
    <ProgressTrack icon={<CreditCard />} title={copy("Ödeme durumu", "Payment status")} steps={paymentSteps} />
    {supplySteps.length > 0 && <ProgressTrack icon={<PackageCheck />} title={copy("Ek Tedarik durumu", "Additional supply status")} steps={supplySteps} />}
  </section>;
  
}

function ProgressTrack({ icon, title, badge, steps }: { icon: ReactNode;
   title: string;
   badge?: string;
   steps: Array<[string, boolean]> }) {
  const completed = steps.filter(([, done]) => done).length;
  
  const percent = Math.round((completed / steps.length) * 100);
  
  return <div className="job-progress-track">
    <div className="job-progress-track__head"><span>{icon}</span><b>{title}</b>{badge && <em>{badge}</em>}<strong>{percent}/100</strong></div>
    <div className="horizontal-progress"><i style={{ width: `${percent}%` }} /></div>
    <div className="job-progress-steps">{steps.map(([label, done]) => <span className={done ? "done" : ""} key={label}><i />{label}</span>)}</div>
  </div>;
  
}

function EvidenceCount({ label, count, target, language }: { label: string;
   count: number;
   target: number;
   language: AppLanguage }) {
  return <article className={count === target ? "complete" : ""}><Image /><div><b>{label}</b><span>{count}/{target} {language === "tr" ? "görsel" : "images"}</span></div></article>;
  
}
function JobField({ label, value, set, type = "text", required = true }: { label: string;
   value: string;
   set(value: string): void;
   type?: string;
   required?: boolean }) {
  return <label><span>{label}</span><input required={required} type={type} value={value} onChange={(event) => set(event.target.value)} /></label>;
  
}
function Select({ label, placeholder, value, set, options, required }: { label: string;
   placeholder: string;
   value: string;
   set(value: string): void;
   options: Tenant[];
   required?: boolean }) {
  return <label><span>{label}</span><select required={required} value={value} onChange={(event) => set(event.target.value)}><option value="">{placeholder}</option>{options.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>;
  
}
function toInputDate(value: string) {
  const date = new Date(value);
  
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  
}
function latestInputDate(...values: Array<string | null | undefined>) {
  const validTimes = values.map((value) => value ? new Date(value).getTime() : Number.NaN).filter(Number.isFinite);
  return toInputDate(new Date(Math.max(...validTimes)).toISOString());
}
function money(value: number, locale: "tr-TR" | "en-US") {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
  
}
function jobAssetLabel(job: Pick<JobApi, "maintenanceTarget" | "stationMaintenanceArea" | "charger">, language: AppLanguage) {
  if (job.maintenanceTarget !== "STATION") return job.charger || (language === "tr" ? "Cihaz kodu yok" : "No device code");
  
  return job.stationMaintenanceArea === "GRID_CONNECTION"
    ? language === "tr" ? "Şebeke bağlantısı" : "Grid connection"
    : language === "tr" ? "İstasyon genel parçaları" : "General station components";
  
}
function normalizeLocation(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").replaceAll("ı", "i");
}
function errorMessage(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback;
  
 }

function supplyTypeLabel(value: string, language: AppLanguage): string {
  const item = supplyTypes.find(([type]) => type === value);
  return item ? item[language === "tr" ? 1 : 2] : value.replaceAll("_", " ");
}

function supplyStatusLabel(value: string, language: AppLanguage): string {
  const item = supplyStatusLabels[value];
  return item ? item[language === "tr" ? 0 : 1] : value.replaceAll("_", " ");
}

function fieldReportLabel(value: string, language: AppLanguage) {
  const labels: Record<string, readonly [string, string]> = {
    PREVENTIVE_MAINTENANCE: ["Periyodik bakım", "Preventive maintenance"], FAULT_REPAIR: ["Arıza müdahalesi", "Fault repair"], INSTALLATION_CHECK: ["Kurulum kontrolü", "Installation check"],
    OPERATIONAL: ["Çalışır durumda", "Operational"], LIMITED: ["Kısıtlı çalışıyor", "Limited operation"], OUT_OF_SERVICE: ["Hizmet dışı", "Out of service"],
    ELECTRICAL: ["Elektrik", "Electrical"], MECHANICAL: ["Mekanik", "Mechanical"], COMMUNICATION: ["İletişim", "Communication"], SOFTWARE: ["Yazılım", "Software"], OTHER: ["Diğer", "Other"],
    REPAIRED: ["Yerinde onarıldı", "Repaired on site"], PART_REQUIRED: ["Parça gerekiyor", "Part required"], MONITORING: ["Takibe alındı", "Monitoring"], NO_FAULT: ["Arıza görülmedi", "No fault found"],
    SAFE: ["Alan güvenli", "Area safe"], ISOLATED: ["Enerji izole edildi", "Power isolated"], ESCALATED: ["Güvenlik eskalasyonu", "Safety escalated"],
  };
  
  return labels[value]?.[language === "tr" ? 0 : 1] ?? value.replaceAll("_", " ");
  
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
