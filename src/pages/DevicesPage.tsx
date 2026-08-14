import { BatteryCharging, Eye, RefreshCw, Search, Wrench, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePreferences } from "../app/PreferencesContext";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";
import { StatusBadge, type Status } from "../shared/components/StatusBadge";

interface ChargePoint {
  id: string;
  externalId: string;
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
  const { language, locale } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
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
    const needle = query.trim().toLocaleLowerCase(locale);
    return devices.filter((device) => !needle || `${device.externalId} ${device.station.name} ${device.station.city} ${device.station.district}`.toLocaleLowerCase(locale).includes(needle));
  }, [devices, locale, query]);

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
    <PageHeader eyebrow="" title={copy("Cihazlar", "Devices")} description={copy("Şarj cihazlarını ve cihaz bazlı bakım geçmişini tek ekranda görüntüleyin.", "View charging devices and device-based maintenance history in one place.")} />
    <div className="toolbar">
      <label className="table-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy("Cihaz kodu veya istasyon ara", "Search device code or station")} /></label>
      <button className="button button--outline" onClick={() => void load()}><RefreshCw size={15} /> {copy("Yenile", "Refresh")}</button>
    </div>
    <section className="data-card"><div className="data-table device-table">
      <div className="data-row data-head"><span>{copy("CİHAZ KODU", "DEVICE CODE")}</span><span>{copy("İSTASYON", "STATION")}</span><span>{copy("KONUM", "LOCATION")}</span><span>{copy("İŞLEM", "ACTION")}</span></div>
      {visible.map((device) => <div className="data-row" key={`${device.cpoTenantId}:${device.externalId}`}>
        <span className="primary-cell"><i className="device-symbol"><BatteryCharging /></i><b>{device.externalId}</b></span>
        <span><b>{device.station.name}</b></span>
        <span>{device.station.city} / {device.station.district}</span>
        <span><button className="button button--outline compact-button" onClick={() => void view(device)}><Eye size={15} /> {copy("Görüntüle", "View")}</button></span>
      </div>)}
      {visible.length === 0 && <div className="empty-state"><b>{copy("Cihaz bulunamadı", "No devices found")}</b><span>{copy("İşlerde tanımlanan cihazlar burada listelenir.", "Devices assigned to jobs are listed here.")}</span></div>}
    </div></section>

    {selected && <div className="drawer-wrap"><button className="drawer-backdrop" onClick={() => setSelected(null)} aria-label={copy("Kapat", "Close")} /><aside className="detail-drawer device-history-drawer" role="dialog" aria-modal="true" aria-label={copy("Cihaz bakım geçmişi", "Device maintenance history")}>
      <div className="drawer-head"><div><span>{copy("CİHAZ BAKIM GEÇMİŞİ", "DEVICE MAINTENANCE HISTORY")}</span><h2>{selected.externalId}</h2><p>{selected.station.name}</p></div><button autoFocus className="icon-button" onClick={() => setSelected(null)} aria-label={copy("Kapat", "Close")}><X /></button></div>
      <div className="device-location"><BatteryCharging /><div><b>{selected.station.name}</b><span>{selected.station.city} / {selected.station.district}</span></div></div>
      <section className="drawer-section">
        <h3><Wrench /> {copy("Bakım kayıtları", "Maintenance records")}</h3>
        {loadingHistory && <p className="muted-copy">{copy("Bakım kayıtları yükleniyor…", "Loading maintenance records…")}</p>}
        {!loadingHistory && history.length === 0 && <div className="empty-state"><b>{copy("Bakım kaydı yok", "No maintenance records")}</b><span>{copy("Bu cihaz için henüz bakım işi oluşturulmamış.", "No maintenance job has been created for this device yet.")}</span></div>}
        <div className="maintenance-history">{history.map((record) => <article key={record.documentId}>
          <div><b>{record.id}</b><span>{new Date(record.createdAt).toLocaleString(locale)}</span></div>
          <StatusBadge status={statusMap[record.status] ?? "waiting"} />
          <p>{record.contractor}{record.fieldWorkerName ? ` · ${record.fieldWorkerName}` : ""}</p>
          <small>{record.maintenanceStartedAt ? `${copy("Bakıma başlandı", "Maintenance started")}: ${new Date(record.maintenanceStartedAt).toLocaleString(locale)}` : copy("Bakıma başlama bekleniyor", "Waiting for maintenance to start")}</small>
        </article>)}</div>
      </section>
    </aside></div>}
  </>;
}
