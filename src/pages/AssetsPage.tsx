import { BatteryCharging, Eye, MapPin, RefreshCw, Search, Wrench, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";
import { StatusBadge, type Status } from "../shared/components/StatusBadge";

interface ChargePoint { id: string; externalId: string; model: string; cpoTenantId: string; station: { name: string; city: string; district: string } }
interface Station { id: string; cpoTenantId: string; name: string; city: string; district: string; deviceCount: number }
interface MaintenanceRecord {
  documentId: string; id: string; status: string; maintenanceTarget: "DEVICE" | "STATION";
  stationMaintenanceArea?: "GENERAL_COMPONENTS" | "GRID_CONNECTION"; contractor: string;
  fieldWorkerName?: string | null; maintenanceStartedAt?: string; createdAt: string;
}
const statusMap: Record<string, Status> = {
  WAITING: "waiting", ASSIGNED: "assigned", IN_PROGRESS: "progress", MAINTENANCE_DONE: "maintenanceDone",
  MAINTENANCE_APPROVED: "maintenanceApproved", CPO_APPROVAL: "cpoApproval", PAID: "paid", CLOSED: "closed",
};

export function AssetsPage() {
  const [devices, setDevices] = useState<ChargePoint[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationFilter, setStationFilter] = useState("ALL");
  const [selectedDevice, setSelectedDevice] = useState<ChargePoint | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const load = useCallback(async () => {
    const [deviceRows, stationRows] = await Promise.all([apiRequest<ChargePoint[]>("/charge-points-list"), apiRequest<Station[]>("/stations-list")]);
    setDevices(deviceRows); setStations(stationRows);
  }, []);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 3_000); return () => window.clearInterval(timer); }, [load]);

  const visibleDevices = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return devices.filter((device) => {
      const key = stationKey(device.cpoTenantId, device.station.name, device.station.city, device.station.district);
      return (stationFilter === "ALL" || key === stationFilter) && (!needle || `${device.externalId} ${device.model} ${device.station.name} ${device.station.city} ${device.station.district}`.toLocaleLowerCase("tr-TR").includes(needle));
    });
  }, [devices, query, stationFilter]);

  async function viewDevice(device: ChargePoint) {
    setSelectedStation(null); setSelectedDevice(device); setHistory([]); setLoadingHistory(true);
    try { setHistory(await apiRequest<MaintenanceRecord[]>("/charge-point-maintenance-list", { method: "POST", body: JSON.stringify({ cpoTenantId: device.cpoTenantId, externalId: device.externalId }) })); }
    finally { setLoadingHistory(false); }
  }
  async function viewStation(station: Station) {
    setStationFilter(station.id); setSelectedDevice(null); setSelectedStation(station); setHistory([]); setLoadingHistory(true);
    try { setHistory(await apiRequest<MaintenanceRecord[]>("/station-maintenance-list", { method: "POST", body: JSON.stringify({ cpoTenantId: station.cpoTenantId, stationName: station.name, city: station.city, district: station.district }) })); }
    finally { setLoadingHistory(false); }
  }
  const closeDrawer = () => { setSelectedDevice(null); setSelectedStation(null); };
  const selectedTitle = selectedDevice?.externalId ?? selectedStation?.name;
  const selectedSubtitle = selectedDevice ? `${selectedDevice.model} · ${selectedDevice.station.name}` : selectedStation ? `${selectedStation.city} / ${selectedStation.district} · ${selectedStation.deviceCount} cihaz` : "";

  return <>
    <PageHeader eyebrow="VARLIK YÖNETİMİ" title="Cihazlar ve İstasyonlar" description="İstasyonları, yalnız o istasyona bağlı cihazları ve iki bakım türünün geçmişini görüntüleyin." />
    <div className="toolbar asset-toolbar">
      <label><span>İstasyon</span><select value={stationFilter} onChange={(event) => setStationFilter(event.target.value)}><option value="ALL">Tüm istasyonlar</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.name} · {station.city}/{station.district}</option>)}</select></label>
      <label className="table-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cihaz, model veya istasyon ara" /></label>
      <button className="button button--outline" onClick={() => void load()}><RefreshCw size={15} /> Yenile</button>
    </div>
    <section className="data-card asset-section"><div className="asset-section__head"><div><MapPin /><span><b>İstasyonlar</b><small>Konum ve istasyon bakım geçmişi</small></span></div><strong>{stations.length}</strong></div><div className="data-table station-table">
      <div className="data-row data-head"><span>İSTASYON</span><span>KONUM</span><span>BAĞLI CİHAZ</span><span>İŞLEM</span></div>
      {stations.map((station) => <div className={`data-row ${stationFilter === station.id ? "selected-asset-row" : ""}`} key={station.id}><span className="primary-cell"><i className="device-symbol station-symbol"><MapPin /></i><b>{station.name}</b></span><span>{station.city} / {station.district}</span><span><b>{station.deviceCount}</b></span><span><button className="button button--outline compact-button" onClick={() => void viewStation(station)}><Eye size={15} /> Görüntüle</button></span></div>)}
    </div></section>
    <section className="data-card asset-section"><div className="asset-section__head"><div><BatteryCharging /><span><b>İstasyona bağlı cihazlar</b><small>{stationFilter === "ALL" ? "Tüm istasyonlar" : stations.find((item) => item.id === stationFilter)?.name}</small></span></div><strong>{visibleDevices.length}</strong></div><div className="data-table device-table">
      <div className="data-row data-head"><span>CİHAZ</span><span>MODEL</span><span>İSTASYON</span><span>KONUM</span><span>İŞLEM</span></div>
      {visibleDevices.map((device) => <div className="data-row" key={`${device.cpoTenantId}:${device.externalId}`}><span className="primary-cell"><i className="device-symbol"><BatteryCharging /></i><b>{device.externalId}</b></span><span><b>{device.model}</b></span><span><b>{device.station.name}</b></span><span>{device.station.city} / {device.station.district}</span><span><button className="button button--outline compact-button" onClick={() => void viewDevice(device)}><Eye size={15} /> Görüntüle</button></span></div>)}
      {visibleDevices.length === 0 && <div className="empty-state"><b>Bu istasyonda cihaz bulunamadı</b><span>Başka istasyon seçin veya yeni cihazı iş oluşturma ekranından tanımlayın.</span></div>}
    </div></section>
    {(selectedDevice || selectedStation) && <div className="drawer-wrap"><button className="drawer-backdrop" onClick={closeDrawer} aria-label="Kapat" /><aside className="detail-drawer device-history-drawer">
      <div className="drawer-head"><div><span>{selectedDevice ? "CİHAZ BAKIM GEÇMİŞİ" : "İSTASYON BAKIM GEÇMİŞİ"}</span><h2>{selectedTitle}</h2><p>{selectedSubtitle}</p></div><button className="icon-button" onClick={closeDrawer}><X /></button></div>
      <div className="device-location">{selectedDevice ? <BatteryCharging /> : <MapPin />}<div><b>{selectedDevice?.station.name ?? selectedStation?.name}</b><span>{selectedDevice ? `${selectedDevice.station.city} / ${selectedDevice.station.district}` : `${selectedStation?.city} / ${selectedStation?.district}`}</span></div></div>
      <section className="drawer-section"><h3><Wrench /> Bakım kayıtları</h3>{loadingHistory && <p className="muted-copy">Bakım kayıtları yükleniyor…</p>}{!loadingHistory && history.length === 0 && <div className="empty-state"><b>Bakım kaydı yok</b><span>Bu {selectedDevice ? "cihaz" : "istasyon"} için henüz bakım işi oluşturulmamış.</span></div>}
        <div className="maintenance-history">{history.map((record) => <article key={record.documentId}><div><b>{record.id}</b><span>{new Date(record.createdAt).toLocaleString("tr-TR")}</span></div><StatusBadge status={statusMap[record.status] ?? "waiting"} /><p>{record.maintenanceTarget === "STATION" ? stationAreaLabel(record.stationMaintenanceArea) : selectedDevice?.model} · {record.contractor}{record.fieldWorkerName ? ` · ${record.fieldWorkerName}` : ""}</p><small>{record.maintenanceStartedAt ? `Bakıma başlandı: ${new Date(record.maintenanceStartedAt).toLocaleString("tr-TR")}` : "Bakıma başlama bekleniyor"}</small></article>)}</div>
      </section>
    </aside></div>}
  </>;
}
function stationKey(cpoTenantId: string, name: string, city: string, district: string) { return `${cpoTenantId}:${name}:${city}:${district}`; }
function stationAreaLabel(area?: MaintenanceRecord["stationMaintenanceArea"]) { return area === "GRID_CONNECTION" ? "Bölgesel şebeke bağlantısı" : "İstasyonun genel parçaları"; }
