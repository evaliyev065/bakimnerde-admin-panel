import { ArrowRight, CheckCircle2, Clock3, Eye, TrendingUp, TriangleAlert, WalletCards, Wrench } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { usePreferences } from "../app/PreferencesContext";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";
import { StatusBadge, type Status } from "../shared/components/StatusBadge";

interface Job {
  documentId: string; id: string; station: string; city: string; charger: string; cpo: string;
  contractor: string; status: string; givenDurationAt: string; amount: number | null;
}
const labels = [
  ["WAITING", "Beklemede", "Waiting"], ["ASSIGNED", "Atandı", "Assigned"], ["IN_PROGRESS", "İşlemde", "In progress"],
  ["ADDITIONAL_SUPPLY", "Ek tedarik sürecinde", "Additional supply in progress"],
  ["MAINTENANCE_DONE", "Bakım tamamlandı", "Maintenance completed"], ["MAINTENANCE_APPROVED", "Bakım onaylandı", "Maintenance approved"],
  ["CPO_APPROVAL", "CPO onayı", "CPO approval"], ["PAID", "Ödeme yapıldı", "Paid"], ["CLOSED", "Süreç sonlandı", "Closed"],
] as const;
const badge: Record<string, Status> = {
  WAITING: "waiting", ASSIGNED: "assigned", IN_PROGRESS: "progress", MAINTENANCE_DONE: "maintenanceDone",
  ADDITIONAL_SUPPLY: "additionalSupply",
  MAINTENANCE_APPROVED: "maintenanceApproved", CPO_APPROVAL: "cpoApproval", PAID: "paid", CLOSED: "closed",
};

export function DashboardPage() {
  const { principal } = useAuth();
  const { language, locale } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => {
    const load = () => apiRequest<Job[]>("/jobs-list").then(setJobs);
    void load();
    const timer = window.setInterval(() => void load(), 3_000);
    return () => window.clearInterval(timer);
  }, []);

  const active = jobs.filter((job) => job.status !== "CLOSED").length;
  const waiting = jobs.filter((job) => ["WAITING", "ASSIGNED", "ADDITIONAL_SUPPLY", "MAINTENANCE_DONE", "MAINTENANCE_APPROVED", "CPO_APPROVAL"].includes(job.status)).length;
  const completed = jobs.filter((job) => ["PAID", "CLOSED"].includes(job.status)).length;
  const risk = jobs.filter((job) => {
    const remaining = new Date(job.givenDurationAt).getTime() - Date.now();
    return Number.isFinite(remaining) && remaining < 2 * 86400000 && job.status !== "CLOSED";
  }).length;
  const priority = useMemo(() => jobs.slice(0, 4), [jobs]);
  const current = jobs.find((job) => job.status === "IN_PROGRESS") ?? jobs[0];
  const currentIndex = current ? labels.findIndex(([key]) => key === current.status) : -1;
  const sideMetric = principal?.tenantType === "PLATFORM"
    ? { title: copy("Hakediş bekleyen", "Awaiting settlement"), value: jobs.filter((job) => job.status === "CPO_APPROVAL").length, detail: copy("CPO onayı tamamlanan işler", "Jobs approved by CPO") }
    : principal?.tenantType === "CPO"
      ? { title: copy("Onay bekleyen", "Awaiting approval"), value: jobs.filter((job) => job.status === "MAINTENANCE_APPROVED").length, detail: copy("CPO kararınızı bekliyor", "Waiting for your CPO decision") }
      : { title: copy("Atama bekleyen", "Awaiting assignment"), value: jobs.filter((job) => job.status === "ASSIGNED").length, detail: copy("1 günlük kabul süresi", "One-day acceptance period") };

  return <>
    <PageHeader
      eyebrow={new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(new Date()).toLocaleUpperCase(locale)}
      title={copy(`İyi günler, ${principal?.name.split(" ")[0] ?? ""}`, `Hello, ${principal?.name.split(" ")[0] ?? ""}`)}
      description={principal?.tenantType === "PLATFORM"
        ? copy("CPO taleplerini, taşeron operasyonlarını ve finansal hareketleri tek merkezden yönetin.", "Manage CPO requests, technical service operations and financial activity from one place.")
        : principal?.tenantType === "CPO"
          ? copy(`${principal.tenantName} bakım taleplerini ve onaylarını takip edin.`, `Track maintenance requests and approvals for ${principal.tenantName}.`)
          : copy(`${principal?.tenantName} atamalarını, saha verilerini ve ek talepleri takip edin.`, `Track assignments, field data and additional requests for ${principal?.tenantName}.`)}
    />
    <section className="metrics" aria-label={copy("Operasyon özeti", "Operations summary")}>
      <Metric icon={<Wrench />} color="navy" label={copy("Aktif iş", "Active jobs")} value={active} detail={copy("Canlı veritabanı kaydı", "Live database records")} />
      <Metric icon={<Clock3 />} color="amber" label={copy("Aksiyon bekleyen", "Awaiting action")} value={waiting} detail={copy(`${risk} iş süre sınırında`, `${risk} jobs near their time limit`)} />
      <Metric icon={<CheckCircle2 />} color="green" label={copy("Tamamlanan", "Completed")} value={completed} detail={copy("Ödenen veya kapanan", "Paid or closed")} />
      <Metric icon={<WalletCards />} color="blue" label={sideMetric.title} value={sideMetric.value} detail={sideMetric.detail} />
    </section>
    {risk > 0 && <section className="attention-strip"><TriangleAlert size={18} /><div><strong>{copy(`${risk} işte süre riski var`, `${risk} jobs have a time risk`)}</strong><span>{copy("Atama, bakım veya onay aksiyonu bekleniyor.", "Assignment, maintenance or approval action is pending.")}</span></div><Link to="/jobs">{copy("Riskli işleri göster", "Show at-risk jobs")} <ArrowRight size={15} /></Link></section>}
    <div className="dashboard-grid">
      <section className="panel panel--orders">
        <div className="panel__head"><div><h2>{copy("Son işler", "Recent jobs")}</h2><p>{copy("CPO, Bakımnerde ve taşeron ekranlarında aynı kayıtlar", "The same records across CPO, Bakımnerde and technical service views")}</p></div><Link to="/jobs">{copy("Tümünü gör", "View all")} <ArrowRight size={16} /></Link></div>
        <div className="orders-table">
          <div className="orders-table__head"><span>{copy("İŞ NO", "JOB NO")}</span><span>{copy("İSTASYON / CPO", "STATION / CPO")}</span><span>{copy("DURUM", "STATUS")}</span><span>{copy("VERİLEN SÜRE", "GIVEN TIME")}</span><span /></div>
          {priority.map((job) => <div className="order-row" key={job.documentId}><strong>{job.id}</strong><div><b>{job.station}</b><small>{job.city} · {job.cpo}</small></div><StatusBadge status={badge[job.status] ?? "waiting"} /><div>{formatDate(job.givenDurationAt, locale)}</div><Link className="row-arrow" to={`/job-details/${encodeURIComponent(job.documentId)}`} aria-label={copy(`${job.id} iş detayını görüntüle`, `View details for job ${job.id}`)} title={copy("İş detayını görüntüle", "View job details")}><Eye size={16} /></Link></div>)}
          {priority.length === 0 && <div className="empty-state"><b>{copy("Henüz iş yok", "No jobs yet")}</b><span>{copy("CPO ilk bakım talebini yayınlayabilir.", "The CPO can publish the first maintenance request.")}</span></div>}
        </div>
      </section>
      <aside className="panel flow-card">
        <div className="panel__head"><div><h2>{copy("İş akışı", "Job workflow")}</h2><p>{current ? `${current.id} · ${current.station}` : copy("Canlı iş bekleniyor", "Waiting for a live job")}</p></div><span className="live"><i /> {copy("CANLI", "LIVE")}</span></div>
        <div className="mini-flow">{labels.map(([key, trLabel, enLabel], index) => <div className={index < currentIndex ? "done" : index === currentIndex ? "current" : ""} key={key}><i>{index < currentIndex ? "✓" : index + 1}</i><span>{copy(trLabel, enLabel)}</span>{index === currentIndex && <small>{copy("Şu an", "Now")}</small>}</div>)}</div>
      </aside>
    </div>
  </>;
}

function Metric({ icon, color, label, value, detail }: { icon: ReactNode; color: string; label: string; value: number; detail: string }) {
  return <article className="metric"><span className={`metric__icon metric__icon--${color}`}>{icon}</span><div><small>{label}</small><strong>{value}</strong><p><em><TrendingUp size={13} /></em> {detail}</p></div></article>;
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString(locale);
}
