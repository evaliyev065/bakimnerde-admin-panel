import { ArrowRight, CalendarDays, CheckCircle2, Clock3, MapPin, MoreHorizontal, Plus, TrendingUp, TriangleAlert, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../shared/components/StatusBadge";

const orders = [
  { id: "BN-2481", station: "İstanbul Havalimanı P3", company: "VoltGo Enerji", city: "İstanbul", status: "urgent", time: "2 sa 18 dk" },
  { id: "BN-2479", station: "Ankara Söğütözü AVM", company: "Eşarj Teknoloji", city: "Ankara", status: "progress", time: "1 gün 4 sa" },
  { id: "BN-2474", station: "İzmir Alsancak Otopark", company: "ChargeNet", city: "İzmir", status: "waiting", time: "3 gün 7 sa" },
  { id: "BN-2468", station: "Bursa Nilüfer Plaza", company: "VoltGo Enerji", city: "Bursa", status: "completed", time: "12 dk önce" }
] as const;

export function DashboardPage() {
  return <>
    <section className="page-heading"><div><p className="eyebrow">22 TEMMUZ 2026, ÇARŞAMBA</p><h1>İyi akşamlar, Elif</h1><p>Operasyon ağındaki son durumu ve kritik aksiyonları burada görebilirsin.</p></div><button className="button button--primary"><Plus size={18} /> Yeni bakım talebi</button></section>
    <section className="metrics" aria-label="Operasyon özeti">
      <article className="metric"><span className="metric__icon metric__icon--navy"><Wrench /></span><div><small>Aktif iş emri</small><strong>128</strong><p><em><TrendingUp size={13} /> %12</em> geçen haftaya göre</p></div></article>
      <article className="metric"><span className="metric__icon metric__icon--amber"><Clock3 /></span><div><small>SLA riski</small><strong>7</strong><p><b>3 kritik</b> müdahale bekliyor</p></div></article>
      <article className="metric"><span className="metric__icon metric__icon--green"><CheckCircle2 /></span><div><small>Bu ay tamamlanan</small><strong>342</strong><p><em><TrendingUp size={13} /> %8</em> hedefin üzerinde</p></div></article>
      <article className="metric"><span className="metric__icon metric__icon--blue"><CalendarDays /></span><div><small>Ortalama çözüm</small><strong>4,2 <sup>gün</sup></strong><p>Hedef <span>≤ 5 gün</span></p></div></article>
    </section>
    <div className="dashboard-grid">
      <section className="panel panel--orders"><div className="panel__head"><div><h2>Öncelikli iş emirleri</h2><p>SLA ve operasyon önceliğine göre sıralandı</p></div><Link to="/is-emirleri">Tümünü gör <ArrowRight size={16} /></Link></div>
        <div className="orders-table"><div className="orders-table__head"><span>İŞ EMRİ</span><span>İSTASYON</span><span>DURUM</span><span>SÜRE / SLA</span><span /></div>
          {orders.map(order => <div className="order-row" key={order.id}><strong>{order.id}</strong><div><b>{order.station}</b><small><MapPin size={12} /> {order.city} · {order.company}</small></div><StatusBadge status={order.status} /><div className={order.status === "urgent" ? "time-critical" : ""}>{order.status === "urgent" && <TriangleAlert size={14} />} {order.time}</div><button className="icon-button" aria-label={`${order.id} seçenekleri`}><MoreHorizontal /></button></div>)}
        </div>
      </section>
      <aside className="panel activity"><div className="panel__head"><div><h2>Canlı akış</h2><p>Son operasyon hareketleri</p></div><span className="live"><i /> CANLI</span></div>
        <div className="timeline"><article><span className="timeline__mark timeline__mark--green"><CheckCircle2 /></span><div><p><b>BN-2468</b> tamamlandı</p><small>Bursa Nilüfer · Ahmet Kaya</small><time>12 dk</time></div></article><article><span className="timeline__mark"><Wrench /></span><div><p><b>BN-2479</b> teknisyene atandı</p><small>Ankara · Zeynep Eren</small><time>28 dk</time></div></article><article><span className="timeline__mark timeline__mark--amber"><TriangleAlert /></span><div><p><b>BN-2481</b> SLA kritik seviyede</p><small>İstanbul · VoltGo Enerji</small><time>41 dk</time></div></article></div>
        <div className="capacity"><div><span>Bugünkü ekip kapasitesi</span><strong>26 / 32</strong></div><div className="progress"><i /></div><small>6 teknisyen yeni göreve uygun</small></div>
      </aside>
    </div>
  </>;
}
