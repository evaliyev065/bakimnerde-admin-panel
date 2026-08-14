import { BatteryCharging, Eye, MapPin, Plus, RefreshCw, Search, Wrench, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { usePreferences } from "../app/PreferencesContext";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../lib/api";
import { LocationFields } from "../shared/components/FormControls";
import { Pagination } from "../shared/components/Pagination";
import { PageHeader } from "../shared/components/PageHeader";
import { StatusBadge, type Status } from "../shared/components/StatusBadge";

interface ChargePoint { id: string; externalId: string; cpoTenantId: string; stationId?: string | null; station: { id?: string; name: string; city: string; district: string } }
interface Station { id: string; cpoTenantId: string; name: string; city: string; district: string; deviceCount: number }
interface Tenant { id: string; name: string; type: string }
interface MaintenanceRecord {
  documentId: string; id: string; status: string; maintenanceTarget: "DEVICE" | "STATION";
  stationMaintenanceArea?: "GENERAL_COMPONENTS" | "GRID_CONNECTION"; contractor: string;
  fieldWorkerName?: string | null; maintenanceStartedAt?: string; createdAt: string;
}
const statusMap: Record<string, Status> = {
  WAITING: "waiting", ASSIGNED: "assigned", IN_PROGRESS: "progress", MAINTENANCE_DONE: "maintenanceDone",
  MAINTENANCE_APPROVED: "maintenanceApproved", CPO_APPROVAL: "cpoApproval", PAID: "paid", CLOSED: "closed",
};
const STATION_PAGE_SIZE = 6;
const deviceGridStyle: CSSProperties = { gridTemplateColumns: "1.05fr 1.35fr 1fr 120px" };

export function AssetsPage() {
  const { principal } = useAuth();
  const { language, locale } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
  const isPlatform = principal?.tenantType === "PLATFORM";
  const isCpo = principal?.tenantType === "CPO";
  const [devices, setDevices] = useState<ChargePoint[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [cpos, setCpos] = useState<Tenant[]>([]);
  const [stationFilter, setStationFilter] = useState("ALL");
  const [stationPage, setStationPage] = useState(1);
  const [selectedDevice, setSelectedDevice] = useState<ChargePoint | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [createMode, setCreateMode] = useState<"station" | "device" | null>(null);
  const [stationForm, setStationForm] = useState({ cpoTenantId: "", name: "", city: "", district: "" });
  const [deviceStation, setDeviceStation] = useState<Station | null>(null);
  const [deviceCode, setDeviceCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const [deviceRows, stationRows, tenantRows] = await Promise.all([
      apiRequest<ChargePoint[]>("/charge-points-list"),
      apiRequest<Station[]>("/stations-list"),
      isPlatform ? apiRequest<Tenant[]>("/tenants-list") : Promise.resolve([]),
    ]);
    setDevices(deviceRows); setStations(stationRows);
    if (isPlatform) setCpos(tenantRows.filter((item) => item.type === "CPO"));
    return stationRows;
  }, [isPlatform]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 3_000); return () => window.clearInterval(timer); }, [load]);

  const visibleStations = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    if (!needle) return stations;
    const stationMatchesByDevice = new Set(devices
      .filter((device) => device.externalId.toLocaleLowerCase(locale).includes(needle))
      .map((device) => stationKey(device.cpoTenantId, device.station.name, device.station.city, device.station.district)));
    return stations.filter((station) => `${station.name} ${station.city} ${station.district}`.toLocaleLowerCase(locale).includes(needle)
      || stationMatchesByDevice.has(station.id)
      || stationMatchesByDevice.has(stationKey(station.cpoTenantId, station.name, station.city, station.district)));
  }, [devices, locale, query, stations]);
  const pagedStations = useMemo(() => visibleStations.slice((stationPage - 1) * STATION_PAGE_SIZE, stationPage * STATION_PAGE_SIZE), [stationPage, visibleStations]);
  const visibleDevices = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    const selected = stations.find((station) => station.id === stationFilter);
    return devices.filter((device) => {
      const key = stationKey(device.cpoTenantId, device.station.name, device.station.city, device.station.district);
      const belongsToSelected = stationFilter === "ALL" || Boolean(selected && (device.stationId === selected.id || device.station.id === selected.id || key === stationKey(selected.cpoTenantId, selected.name, selected.city, selected.district)));
      return belongsToSelected && (!needle || `${device.externalId} ${device.station.name} ${device.station.city} ${device.station.district}`.toLocaleLowerCase(locale).includes(needle));
    });
  }, [devices, locale, query, stationFilter, stations]);
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(visibleStations.length / STATION_PAGE_SIZE));
    if (stationPage > lastPage) setStationPage(lastPage);
  }, [stationPage, visibleStations.length]);

  async function viewDevice(device: ChargePoint) {
    setSelectedStation(null); setSelectedDevice(device); setHistory([]); setHistoryError(""); setLoadingHistory(true);
    try { setHistory(await apiRequest<MaintenanceRecord[]>("/charge-point-maintenance-list", { method: "POST", body: JSON.stringify({ cpoTenantId: device.cpoTenantId, externalId: device.externalId }) })); }
    catch (reason) { setHistoryError(errorMessage(reason, copy("Bakım geçmişi yüklenemedi.", "Maintenance history could not be loaded."))); }
    finally { setLoadingHistory(false); }
  }
  async function viewStation(station: Station) {
    setStationFilter(station.id); setSelectedDevice(null); setSelectedStation(station); setHistory([]); setHistoryError(""); setLoadingHistory(true);
    try { setHistory(await apiRequest<MaintenanceRecord[]>("/station-maintenance-list", { method: "POST", body: JSON.stringify({ cpoTenantId: station.cpoTenantId, stationName: station.name, city: station.city, district: station.district }) })); }
    catch (reason) { setHistoryError(errorMessage(reason, copy("Bakım geçmişi yüklenemedi.", "Maintenance history could not be loaded."))); }
    finally { setLoadingHistory(false); }
  }
  const closeDetail = () => { setSelectedDevice(null); setSelectedStation(null); setHistoryError(""); };
  function openStationCreate() {
    setStationForm({ cpoTenantId: isPlatform ? cpos[0]?.id ?? "" : "", name: "", city: "", district: "" });
    setError(""); setCreateMode("station");
  }
  function openDeviceCreate(station: Station) {
    setDeviceStation(station); setDeviceCode(""); setError(""); setCreateMode("device");
  }
  async function createStation(event: FormEvent) {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      await apiRequest("/stations-create", {
        method: "POST",
        body: JSON.stringify({
          ...(isPlatform ? { cpoTenantId: stationForm.cpoTenantId } : {}),
          name: stationForm.name.trim(), city: stationForm.city, district: stationForm.district,
        }),
      });
      await load(); setCreateMode(null);
    } catch (reason) { setError(errorMessage(reason, copy("İstasyon eklenemedi.", "Station could not be added."))); }
    finally { setSaving(false); }
  }
  async function createDevice(event: FormEvent) {
    event.preventDefault();
    if (!deviceStation) return;
    setError(""); setSaving(true);
    try {
      await apiRequest("/charge-points-create", {
        method: "POST",
        body: JSON.stringify({
          ...(isPlatform ? { cpoTenantId: deviceStation.cpoTenantId } : {}),
          stationId: deviceStation.id,
          externalId: deviceCode.trim(),
        }),
      });
      const refreshedStations = await load();
      const canonicalStation = refreshedStations.find((station) => station.cpoTenantId === deviceStation.cpoTenantId
        && stationKey(station.cpoTenantId, station.name, station.city, station.district)
          === stationKey(deviceStation.cpoTenantId, deviceStation.name, deviceStation.city, deviceStation.district));
      setStationFilter(canonicalStation?.id ?? deviceStation.id); setCreateMode(null);
    } catch (reason) { setError(errorMessage(reason, copy("Cihaz eklenemedi.", "Device could not be added."))); }
    finally { setSaving(false); }
  }
  const selectedTitle = selectedDevice?.externalId ?? selectedStation?.name;
  const selectedSubtitle = selectedDevice ? selectedDevice.station.name : selectedStation ? `${selectedStation.city} / ${selectedStation.district} · ${selectedStation.deviceCount} ${copy("cihaz", "devices")}` : "";

  return <>
    <PageHeader eyebrow="" title={copy("Cihazlar ve İstasyonlar", "Devices and Stations")} description={copy("İstasyonları, bağlı cihaz kodlarını ve bakım geçmişini yönetin.", "Manage stations, linked device codes and maintenance history.")} />
    <div className="toolbar asset-toolbar">
      <label><span>{copy("İstasyon", "Station")}</span><select value={stationFilter} onChange={(event) => setStationFilter(event.target.value)}><option value="ALL">{copy("Tüm istasyonlar", "All stations")}</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.name} · {station.city}/{station.district}</option>)}</select></label>
      <label className="table-search"><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setStationPage(1); }} placeholder={copy("Cihaz kodu veya istasyon ara", "Search device code or station")} /></label>
      <button className="button button--outline" onClick={() => void load()}><RefreshCw size={15} /> {copy("Yenile", "Refresh")}</button>
      {(isPlatform || isCpo) && <button className="button button--primary" onClick={openStationCreate}><Plus size={16} /> {copy("İstasyon ekle", "Add station")}</button>}
    </div>
    <section className="data-card asset-section"><div className="asset-section__head"><div><MapPin /><span><b>{copy("İstasyonlar", "Stations")}</b><small>{copy("Konum ve istasyon bakım geçmişi", "Location and station maintenance history")}</small></span></div><strong>{visibleStations.length}</strong></div><div className="data-table station-table">
      <div className="data-row data-head"><span>{copy("İSTASYON", "STATION")}</span><span>{copy("KONUM", "LOCATION")}</span><span>{copy("BAĞLI CİHAZ", "DEVICES")}</span><span>{copy("İŞLEM", "ACTIONS")}</span></div>
      {pagedStations.map((station) => <div className={`data-row ${stationFilter === station.id ? "selected-asset-row" : ""}`} key={station.id}><span className="primary-cell"><i className="device-symbol station-symbol"><MapPin /></i><b>{station.name}</b></span><span>{station.city} / {station.district}</span><span><b>{station.deviceCount}</b></span><span className="row-actions"><button type="button" onClick={() => void viewStation(station)} aria-label={copy(`${station.name} detayını görüntüle`, `View ${station.name} details`)} title={copy("Görüntüle", "View")}><Eye /></button>{(isPlatform || isCpo) && <button type="button" onClick={() => openDeviceCreate(station)} aria-label={copy(`${station.name} istasyonuna cihaz ekle`, `Add a device to ${station.name}`)} title={copy("Cihaz ekle", "Add device")}><Plus /></button>}</span></div>)}
      {visibleStations.length === 0 && <div className="empty-state"><b>{copy("İstasyon bulunamadı", "No stations found")}</b><span>{copy("Arama ölçütünü değiştirin veya yeni bir istasyon ekleyin.", "Change the search criteria or add a new station.")}</span></div>}
    </div><Pagination page={stationPage} pageSize={STATION_PAGE_SIZE} total={visibleStations.length} onPageChange={setStationPage} /></section>
    <section className="data-card asset-section"><div className="asset-section__head"><div><BatteryCharging /><span><b>{copy("İstasyona bağlı cihazlar", "Devices linked to stations")}</b><small>{stationFilter === "ALL" ? copy("Tüm istasyonlar", "All stations") : stations.find((item) => item.id === stationFilter)?.name}</small></span></div><strong>{visibleDevices.length}</strong></div><div className="data-table device-table">
      <div className="data-row data-head" style={deviceGridStyle}><span>{copy("CİHAZ KODU", "DEVICE CODE")}</span><span>{copy("İSTASYON", "STATION")}</span><span>{copy("KONUM", "LOCATION")}</span><span>{copy("İŞLEM", "ACTION")}</span></div>
      {visibleDevices.map((device) => <div className="data-row" style={deviceGridStyle} key={`${device.cpoTenantId}:${device.externalId}`}><span className="primary-cell"><i className="device-symbol"><BatteryCharging /></i><b>{device.externalId}</b></span><span><b>{device.station.name}</b></span><span>{device.station.city} / {device.station.district}</span><span className="row-actions"><button type="button" onClick={() => void viewDevice(device)} aria-label={copy(`${device.externalId} detayını görüntüle`, `View ${device.externalId} details`)} title={copy("Görüntüle", "View")}><Eye /></button></span></div>)}
      {visibleDevices.length === 0 && <div className="empty-state"><b>{copy("Bu istasyonda cihaz bulunamadı", "No devices found for this station")}</b><span>{copy("İstasyon satırındaki artı düğmesiyle cihaz kodu ekleyebilirsiniz.", "Use the plus button on a station row to add a device code.")}</span></div>}
    </div></section>
    {(selectedDevice || selectedStation) && <div className="modal-wrap"><button className="modal-backdrop" onClick={closeDetail} aria-label={copy("Kapat", "Close")} /><aside className="tenant-modal device-history-drawer" role="dialog" aria-modal="true" aria-label={copy("Bakım geçmişi", "Maintenance history")}>
      <div className="modal-head"><div><p className="eyebrow">{selectedDevice ? copy("CİHAZ BAKIM GEÇMİŞİ", "DEVICE MAINTENANCE HISTORY") : copy("İSTASYON BAKIM GEÇMİŞİ", "STATION MAINTENANCE HISTORY")}</p><h2>{selectedTitle}</h2><span>{selectedSubtitle}</span></div><button className="icon-button" onClick={closeDetail} aria-label={copy("Kapat", "Close")}><X /></button></div>
      <div className="device-location">{selectedDevice ? <BatteryCharging /> : <MapPin />}<div><b>{selectedDevice?.station.name ?? selectedStation?.name}</b><span>{selectedDevice ? `${selectedDevice.station.city} / ${selectedDevice.station.district}` : `${selectedStation?.city} / ${selectedStation?.district}`}</span></div></div>
      <section className="drawer-section"><h3><Wrench /> {copy("Bakım kayıtları", "Maintenance records")}</h3>{loadingHistory && <p className="muted-copy">{copy("Bakım kayıtları yükleniyor…", "Loading maintenance records…")}</p>}{historyError && <div className="login-error">{historyError}</div>}{!loadingHistory && !historyError && history.length === 0 && <div className="empty-state"><b>{copy("Bakım kaydı yok", "No maintenance records")}</b><span>{copy(`Bu ${selectedDevice ? "cihaz" : "istasyon"} için henüz bakım işi oluşturulmamış.`, `No maintenance job has been created for this ${selectedDevice ? "device" : "station"} yet.`)}</span></div>}
        <div className="maintenance-history">{history.map((record) => <article key={record.documentId}><div><b>{record.id}</b><span>{new Date(record.createdAt).toLocaleString(locale)}</span></div><StatusBadge status={statusMap[record.status] ?? "waiting"} /><p>{record.maintenanceTarget === "STATION" ? stationAreaLabel(record.stationMaintenanceArea, language) : selectedDevice?.externalId} · {record.contractor}{record.fieldWorkerName ? ` · ${record.fieldWorkerName}` : ""}</p><small>{record.maintenanceStartedAt ? `${copy("Bakıma başlandı", "Maintenance started")}: ${new Date(record.maintenanceStartedAt).toLocaleString(locale)}` : copy("Bakıma başlama bekleniyor", "Waiting for maintenance to start")}</small></article>)}</div>
      </section>
    </aside></div>}
    {createMode === "station" && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setCreateMode(null)} aria-label={copy("Kapat", "Close")} /><form className="tenant-modal" onSubmit={createStation} role="dialog" aria-modal="true" aria-label={copy("İstasyon ekle", "Add station")}>
      <div className="modal-head"><div><p className="eyebrow">{copy("VARLIK YÖNETİMİ", "ASSET MANAGEMENT")}</p><h2>{copy("İstasyon ekle", "Add station")}</h2><span>{copy("İstasyon bilgilerini girin; cihaz kodlarını daha sonra bağlayabilirsiniz.", "Enter station details; device codes can be linked afterwards.")}</span></div><button type="button" className="icon-button" onClick={() => setCreateMode(null)} aria-label={copy("Kapat", "Close")}><X /></button></div>
      <div className="modal-fields">{isPlatform && <label><span>{copy("CPO firma", "CPO company")}</span><select required value={stationForm.cpoTenantId} onChange={(event) => setStationForm({ ...stationForm, cpoTenantId: event.target.value })}><option value="">{copy("Firma seçin", "Select company")}</option>{cpos.map((cpo) => <option value={cpo.id} key={cpo.id}>{cpo.name}</option>)}</select></label>}<label><span>{copy("İstasyon adı", "Station name")}</span><input required maxLength={160} value={stationForm.name} onChange={(event) => setStationForm({ ...stationForm, name: event.target.value })} /></label><LocationFields city={stationForm.city} district={stationForm.district} cityLabel={copy("İl", "City")} districtLabel={copy("İlçe", "District")} onCityChange={(city) => setStationForm((current) => ({ ...current, city, district: "" }))} onDistrictChange={(district) => setStationForm((current) => ({ ...current, district }))} /></div>
      {error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setCreateMode(null)}>{copy("Vazgeç", "Cancel")}</button><button className="button button--primary" disabled={saving}>{saving ? copy("Kaydediliyor…", "Saving…") : copy("İstasyonu kaydet", "Save station")}</button></div>
    </form></div>}
    {createMode === "device" && deviceStation && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setCreateMode(null)} aria-label={copy("Kapat", "Close")} /><form className="tenant-modal compact-modal" onSubmit={createDevice} role="dialog" aria-modal="true" aria-label={copy("Cihaz ekle", "Add device")}>
      <div className="modal-head"><div><p className="eyebrow">{copy("CİHAZ KODU", "DEVICE CODE")}</p><h2>{copy("İstasyona cihaz ekle", "Add device to station")}</h2><span>{deviceStation.name} · {deviceStation.city}/{deviceStation.district}</span></div><button type="button" className="icon-button" onClick={() => setCreateMode(null)} aria-label={copy("Kapat", "Close")}><X /></button></div>
      <div className="modal-fields"><label><span>{copy("İstasyon", "Station")}</span><input readOnly value={deviceStation.name} /></label><label><span>{copy("Cihaz kodu", "Device code")}</span><input required autoFocus maxLength={120} value={deviceCode} onChange={(event) => setDeviceCode(event.target.value)} /></label></div>
      {error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setCreateMode(null)}>{copy("Vazgeç", "Cancel")}</button><button className="button button--primary" disabled={saving}>{saving ? copy("Kaydediliyor…", "Saving…") : copy("Cihazı ekle", "Add device")}</button></div>
    </form></div>}
  </>;
}
function stationKey(cpoTenantId: string, name: string, city: string, district: string) { return `${cpoTenantId}:${name}:${city}:${district}`; }
function stationAreaLabel(area: MaintenanceRecord["stationMaintenanceArea"] | undefined, language: "tr" | "en") {
  if (area === "GRID_CONNECTION") return language === "tr" ? "Bölgesel şebeke bağlantısı" : "Regional grid connection";
  return language === "tr" ? "İstasyonun genel parçaları" : "General station components";
}
function errorMessage(reason: unknown, fallback: string) { return reason instanceof Error ? reason.message : fallback; }
