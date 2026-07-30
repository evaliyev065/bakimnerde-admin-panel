import { ArrowRight, CheckCircle2, Clock3, TrendingUp, TriangleAlert, WalletCards, Wrench } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";
import { StatusBadge, type Status } from "../shared/components/StatusBadge";

interface Job {
  documentId: string; id: string; station: string; city: string; charger: string; cpo: string;
  contractor: string; status: string; deadlineAt: string; amount: number | null;
}
const labels = [
  ["WAITING", "Beklemede"], ["ASSIGNED", "Atandı"], ["IN_PROGRESS", "İşlemde"],
  ["MAINTENANCE_DONE", "Bakım tamamlandı"], ["MAINTENANCE_APPROVED", "Bakım onaylandı"],
  ["CPO_APPROVAL", "CPO onayı"], ["PAID", "Ödeme yapıldı"], ["CLOSED", "Süreç sonlandı"],
] as const;
const badge: Record<string, Status> = {
  WAITING: "waiting", ASSIGNED: "assigned", IN_PROGRESS: "progress", MAINTENANCE_DONE: "maintenanceDone",
  MAINTENANCE_APPROVED: "maintenanceApproved", CPO_APPROVAL: "cpoApproval", PAID: "paid", CLOSED: "closed",
};

export function DashboardPage() {
  const { principal } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => {
    const load = () => apiRequest<Job[]>("/jobs-list").then(setJobs);
    void load();
    const timer = window.setInterval(() => void load(), 3_000);
    return () => window.clearInterval(timer);
  }, []);

  const active = jobs.filter((job) => job.status !== "CLOSED").length;
  const waiting = jobs.filter((job) => ["WAITING", "ASSIGNED", "MAINTENANCE_DONE", "MAINTENANCE_APPROVED", "CPO_APPROVAL"].includes(job.status)).length;
  const completed = jobs.filter((job) => ["PAID", "CLOSED"].includes(job.status)).length;
  const risk = jobs.filter((job) => new Date(job.deadlineAt).getTime() - Date.now() < 2 * 86400000 && job.status !== "CLOSED").length;
  const priority = useMemo(() => jobs.slice(0, 4), [jobs]);
  const current = jobs.find((job) => job.status === "IN_PROGRESS") ?? jobs[0];
  const currentIndex = current ? labels.findIndex(([key]) => key === current.status) : -1;
  const sideMetric = principal?.tenantType === "PLATFORM"
    ? { title: "Hakediş bekleyen", value: jobs.filter((job) => job.status === "CPO_APPROVAL").length, detail: "CPO onayı tamamlanan işler" }
    : principal?.tenantType === "CPO"
      ? { title: "Onay bekleyen", value: jobs.filter((job) => job.status === "MAINTENANCE_APPROVED").length, detail: "CPO kararınızı bekliyor" }
      : { title: "Atama bekleyen", value: jobs.filter((job) => job.status === "ASSIGNED").length, detail: "1 günlük kabul süresi" };

  return <>
    <PageHeader
      eyebrow={new Intl.DateTimeFormat("tr-TR", { dateStyle: "full" }).format(new Date()).toLocaleUpperCase("tr-TR")}
      title={`İyi günler, ${principal?.name.split(" ")[0] ?? ""}`}
      description={principal?.tenantType === "PLATFORM"
        ? "CPO taleplerini, taşeron operasyonlarını ve finansal hareketleri tek merkezden yönetin."
        : principal?.tenantType === "CPO"
          ? `${principal.tenantName} bakım taleplerini ve onaylarını takip edin.`
          : `${principal?.tenantName} atamalarını, saha verilerini ve ek talepleri takip edin.`}
    />
    <section className="metrics" aria-label="Operasyon özeti">
      <Metric icon={<Wrench />} color="navy" label="Aktif iş" value={active} detail="Canlı veritabanı kaydı" />
      <Metric icon={<Clock3 />} color="amber" label="Aksiyon bekleyen" value={waiting} detail={`${risk} iş süre sınırında`} />
      <Metric icon={<CheckCircle2 />} color="green" label="Tamamlanan" value={completed} detail="Ödenen veya kapanan" />
      <Metric icon={<WalletCards />} color="blue" label={sideMetric.title} value={sideMetric.value} detail={sideMetric.detail} />
    </section>
    {risk > 0 && <section className="attention-strip"><TriangleAlert size={18} /><div><strong>{risk} işte süre riski var</strong><span>Atama, bakım veya onay aksiyonu bekleniyor.</span></div><Link to="/jobs">Riskli işleri göster <ArrowRight size={15} /></Link></section>}
    <div className="dashboard-grid">
      <section className="panel panel--orders">
        <div className="panel__head"><div><h2>Son işler</h2><p>CPO, Bakımnerde ve taşeron ekranlarında aynı kayıtlar</p></div><Link to="/jobs">Tümünü gör <ArrowRight size={16} /></Link></div>
        <div className="orders-table">
          <div className="orders-table__head"><span>İŞ NO</span><span>İSTASYON / CPO</span><span>DURUM</span><span>SON TARİH</span><span /></div>
          {priority.map((job) => <div className="order-row" key={job.documentId}><strong>{job.id}</strong><div><b>{job.station}</b><small>{job.city} · {job.cpo}</small></div><StatusBadge status={badge[job.status] ?? "waiting"} /><div>{new Date(job.deadlineAt).toLocaleDateString("tr-TR")}</div><Link className="row-arrow" to="/jobs"><ArrowRight size={16} /></Link></div>)}
          {priority.length === 0 && <div className="empty-state"><b>Henüz iş yok</b><span>CPO ilk bakım talebini yayınlayabilir.</span></div>}
        </div>
      </section>
      <aside className="panel flow-card">
        <div className="panel__head"><div><h2>İş akışı</h2><p>{current ? `${current.id} · ${current.station}` : "Canlı iş bekleniyor"}</p></div><span className="live"><i /> CANLI</span></div>
        <div className="mini-flow">{labels.map(([key, label], index) => <div className={index < currentIndex ? "done" : index === currentIndex ? "current" : ""} key={key}><i>{index < currentIndex ? "✓" : index + 1}</i><span>{label}</span>{index === currentIndex && <small>Şu an</small>}</div>)}</div>
      </aside>
    </div>
  </>;
}

function Metric({ icon, color, label, value, detail }: { icon: ReactNode; color: string; label: string; value: number; detail: string }) {
  return <article className="metric"><span className={`metric__icon metric__icon--${color}`}>{icon}</span><div><small>{label}</small><strong>{value}</strong><p><em><TrendingUp size={13} /></em> {detail}</p></div></article>;
}
