import { ArrowRight, CheckCircle2, Clock3, Plus, TrendingUp, TriangleAlert, WalletCards, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { flowSteps, jobs } from "../data/mockData";
import { PageHeader } from "../shared/components/PageHeader";
import { StatusBadge } from "../shared/components/StatusBadge";

export function DashboardPage() {
  const { principal } = useAuth();
  const isPlatform = principal?.tenantType === "PLATFORM";
  return (
    <>
      <PageHeader eyebrow="23 TEMMUZ 2026, PERŞEMBE" title={`İyi akşamlar, ${principal?.name.split(" ")[0] ?? ""}`} description={isPlatform ? "Aracılık ağındaki işleri, onayları ve finansal hareketleri tek merkezden yönet." : `${principal?.tenantName} operasyonlarını Bakımnerde güvencesiyle takip edin.`} action={isPlatform ? "Yeni iş oluştur" : undefined} icon={Plus} />
      <section className="metrics" aria-label="Operasyon özeti">
        <article className="metric"><span className="metric__icon metric__icon--navy"><Wrench /></span><div><small>Aktif iş</small><strong>128</strong><p><em><TrendingUp size={13} /> %12</em> geçen haftaya göre</p></div></article>
        <article className="metric"><span className="metric__icon metric__icon--amber"><Clock3 /></span><div><small>Aksiyon bekleyen</small><strong>18</strong><p><b>3 kritik</b> süre sınırında</p></div></article>
        <article className="metric"><span className="metric__icon metric__icon--green"><CheckCircle2 /></span><div><small>Bu ay tamamlanan</small><strong>342</strong><p><em><TrendingUp size={13} /> %8</em> hedefin üzerinde</p></div></article>
        <article className="metric"><span className="metric__icon metric__icon--blue"><WalletCards /></span><div><small>{isPlatform ? "Bekleyen hak ediş" : "Onay bekleyen bakım"}</small><strong>{isPlatform ? "₺286K" : "6"}</strong><p>{isPlatform ? "14 taşeron ödemesi" : "CPO veya üretici onayı"}</p></div></article>
      </section>
      <section className="attention-strip">
        <TriangleAlert size={18} />
        <div><strong>3 işte süre riski var</strong><span>Taşeron onayı veya CPO hazırlığı bekleniyor.</span></div>
        <button>Riskli işleri göster <ArrowRight size={15} /></button>
      </section>
      <div className="dashboard-grid">
        <section className="panel panel--orders">
          <div className="panel__head"><div><h2>Öncelikli işler</h2><p>Süre ve operasyon önceliğine göre sıralandı</p></div><Link to="/isler">Tümünü gör <ArrowRight size={16} /></Link></div>
          <div className="orders-table">
            <div className="orders-table__head"><span>İŞ NO</span><span>İSTASYON / CPO</span><span>DURUM</span><span>SON AKSİYON</span><span /></div>
            {jobs.slice(0, 4).map(job => (
              <div className="order-row" key={job.id}>
                <strong>{job.id}</strong>
                <div><b>{job.station}</b><small>{job.city} · {job.cpo}</small></div>
                <StatusBadge status={job.status} />
                <div className={job.status === "urgent" ? "time-critical" : ""}>{job.deadline}</div>
                <Link className="row-arrow" to="/isler"><ArrowRight size={16} /></Link>
              </div>
            ))}
          </div>
        </section>
        <aside className="panel flow-card">
          <div className="panel__head"><div><h2>İş akışı</h2><p>BN-2479 · Söğütözü AVM</p></div><span className="live"><i /> CANLI</span></div>
          <div className="mini-flow">
            {flowSteps.map((step, index) => <div className={index < 3 ? "done" : index === 3 ? "current" : ""} key={step}><i>{index < 3 ? "✓" : index + 1}</i><span>{step}</span>{index === 2 && <small>Bugün 09:42</small>}</div>)}
          </div>
        </aside>
      </div>
    </>
  );
}
