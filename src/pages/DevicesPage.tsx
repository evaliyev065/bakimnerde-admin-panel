import { BatteryCharging, Eye, RefreshCw, Search, Wrench, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";
import { StatusBadge, type Status } from "../shared/components/StatusBadge";

interface ChargePoint {
  id: string;
  externalId: string;
  model: string;
  cpoTenantId: string;
  station: { name: string; city: string; district: string };
}

interface MaintenanceRecord {
  documentId: string;
  id: string;
  status: string;
  station: string;
  city: string;
  district: string;
  contractor: string;
  fieldWorkerName?: string | null;
  appointmentAt?: string;
  maintenanceStartedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const statusMap: Record<string, Status> = {
  WAITING: "waiting", ASSIGNED: "assigned", IN_PROGRESS: "progress",
  MAINTENANCE_DONE: "maintenanceDone", MAINTENANCE_APPROVED: "maintenanceApproved",
  CPO_APPROVAL: "cpoApproval", PAID: "paid", CLOSED: "closed",
};

export function DevicesPage() {
  const [devices, setDevices] = useState<ChargePoint[]>([]);
  const [selected, setSelected] = useState<ChargePoint | null>(null);
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);

  const load = useCallback(async () => setDevices(await apiRequest<ChargePoint[]>("/charge-points-list")), []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 3_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return devices.filter((device) => !needle || `${device.externalId} ${device.model} ${device.station.name} ${device.station.city} ${device.station.district}`.toLocaleLowerCase("tr-TR").includes(needle));
  }, [devices, query]);

  async function view(device: ChargePoint) {
    setSelected(device);
    setHistory([]);
    setLoadingHistory(true);
    try {
      setHistory(await apiRequest<MaintenanceRecord[]>("/charge-point-maintenance-list", {
        method: "POST",
        body: JSON.stringify({ cpoTenantId: device.cpoTenantId, externalId: device.externalId }),
      }));
    } finally {
      setLoadingHistory(false);
    }
  }

  return <>
    <PageHeader eyebrow="VARLIK YÖNETİMİ" title="Cihazlar" description="Şarj cihazlarını ve cihaz bazlı bakım geçmişini tek ekranda görüntüleyin." />
    <div className="toolbar">
      <label className="table-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cihaz, model veya istasyon ara" /></label>
      <button className="button button--outline" onClick={() => void load()}><RefreshCw size={15} /> Yenile</button>
    </div>
    <section className="data-card"><div className="data-table device-table">
      <div className="data-row data-head"><span>CİHAZ</span><span>MODEL</span><span>İSTASYON</span><span>KONUM</span><span>İŞLEM</span></div>
      {visible.map((device) => <div className="data-row" key={`${device.cpoTenantId}:${device.externalId}`}>
        <span className="primary-cell"><i className="device-symbol"><BatteryCharging /></i><b>{device.externalId}</b></span>
        <span><b>{device.model}</b></span>
        <span><b>{device.station.name}</b></span>
        <span>{device.station.city} / {device.station.district}</span>
        <span><button className="button button--outline compact-button" onClick={() => void view(device)}><Eye size={15} /> Görüntüle</button></span>
      </div>)}
      {visible.length === 0 && <div className="empty-state"><b>Cihaz bulunamadı</b><span>İşlerde tanımlanan cihazlar burada listelenir.</span></div>}
    </div></section>

    {selected && <div className="drawer-wrap"><button className="drawer-backdrop" onClick={() => setSelected(null)} aria-label="Kapat" /><aside className="detail-drawer device-history-drawer">
      <div className="drawer-head"><div><span>CİHAZ BAKIM GEÇMİŞİ</span><h2>{selected.externalId}</h2><p>{selected.model} · {selected.station.name}</p></div><button className="icon-button" onClick={() => setSelected(null)}><X /></button></div>
      <div className="device-location"><BatteryCharging /><div><b>{selected.station.name}</b><span>{selected.station.city} / {selected.station.district}</span></div></div>
      <section className="drawer-section">
        <h3><Wrench /> Bakım kayıtları</h3>
        {loadingHistory && <p className="muted-copy">Bakım kayıtları yükleniyor…</p>}
        {!loadingHistory && history.length === 0 && <div className="empty-state"><b>Bakım kaydı yok</b><span>Bu cihaz için henüz bakım işi oluşturulmamış.</span></div>}
        <div className="maintenance-history">{history.map((record) => <article key={record.documentId}>
          <div><b>{record.id}</b><span>{new Date(record.createdAt).toLocaleString("tr-TR")}</span></div>
          <StatusBadge status={statusMap[record.status] ?? "waiting"} />
          <p>{record.contractor}{record.fieldWorkerName ? ` · ${record.fieldWorkerName}` : ""}</p>
          <small>{record.maintenanceStartedAt ? `Bakıma başlandı: ${new Date(record.maintenanceStartedAt).toLocaleString("tr-TR")}` : "Bakıma başlama bekleniyor"}</small>
        </article>)}</div>
      </section>
    </aside></div>}
  </>;
}
