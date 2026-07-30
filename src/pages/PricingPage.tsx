import { Edit3, EyeOff, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";

interface Price { id: string; itemCode: string; itemName: string; category: string; cost: number; salePrice: number; currency: string; supplyType: string; active: boolean; counterpartyTenantId?: string; counterpartyName: string }
interface Tenant { id: string; name: string; type: string }
const emptyPrice: Price = { id: "", itemCode: "", itemName: "", category: "", cost: 0, salePrice: 0, currency: "TRY", supplyType: "Merkez stoğu", active: true, counterpartyTenantId: "", counterpartyName: "" };
const itemCatalog = [
  ["PERIODIC-MAINTENANCE", "Periyodik bakım"],
  ["FAN-REPLACEMENT-LABOR", "Fan değişimi işçiliği"],
  ["CONTACTOR-REPLACEMENT", "Kontaktör değişimi"],
  ["POWER-MODULE-REPAIR", "Güç modülü onarımı"],
  ["SOFTWARE-DIAGNOSTIC", "Yazılım ve uzaktan teşhis"],
] as const;

export function PricingPage() {
  const [items, setItems] = useState<Price[]>([]);
  const [query, setQuery] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [form, setForm] = useState<Price>(emptyPrice);
  const [counterpartyType, setCounterpartyType] = useState<"CONTRACTOR" | "CPO">("CONTRACTOR");
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(() => Promise.all([apiRequest<Price[]>("/pricing-list"), apiRequest<Tenant[]>("/tenants-list")]).then(([prices, tenantItems]) => { setItems(prices); setTenants(tenantItems.filter(item => item.type !== "PLATFORM")); }), []);
  useEffect(() => { void load(); }, [load]);
  async function save(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      await apiRequest(form.id ? "/pricing-update" : "/pricing-create", { method: "POST", body: JSON.stringify({ ...form, counterpartyTenantId: form.counterpartyTenantId || undefined }) });
      await load(); setModalOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Fiyat kaydedilemedi."); }
  }
  async function remove(item: Price) {
    if (!window.confirm(`${item.itemName} fiyat kaydını silmek istiyor musunuz?`)) return;
    try { await apiRequest("/pricing-delete", { method: "POST", body: JSON.stringify({ id: item.id }) }); await load(); }
    catch (reason) { window.alert(reason instanceof Error ? reason.message : "Fiyat silinemedi."); }
  }
  function openCreate() {
    const tenant = tenants.find(item => item.type === "CONTRACTOR");
    setCounterpartyType("CONTRACTOR");
    setForm({ ...emptyPrice, counterpartyTenantId: tenant?.id ?? "" });
    setError("");
    setModalOpen(true);
  }
  function openEdit(item: Price) {
    const type = tenants.find(tenant => tenant.id === item.counterpartyTenantId)?.type === "CPO" ? "CPO" : "CONTRACTOR";
    setCounterpartyType(type);
    setForm(item);
    setError("");
    setModalOpen(true);
  }
  const selectableTenants = tenants.filter(tenant => tenant.type === counterpartyType);
  const catalog = Array.from(new Map([...itemCatalog, ...items.map(item => [item.itemCode, item.itemName] as const)]).entries());
  const visibleItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return needle ? items.filter((item) => `${item.itemCode} ${item.itemName} ${item.category} ${item.counterpartyName} ${item.supplyType}`.toLocaleLowerCase("tr-TR").includes(needle)) : items;
  }, [items, query]);
  return <>
    <PageHeader eyebrow="TİCARİ YÖNETİM" title="Fiyat yönetimi" description="Taşeron maliyetlerini ve CPO satış fiyatlarını birbirinden bağımsız yönetin." />
    <div className="privacy-notice"><EyeOff size={19} /><div><strong>Rol bazlı fiyat görünürlüğü</strong><span>CPO yalnız kendisine atanan satış fiyatını, taşeron yalnız kendisine atanan maliyeti görür; atanmayan tutar “-” görünür.</span></div></div>
    <div className="toolbar"><label className="table-search"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Parça veya kategori ara" /></label><button className="button button--primary" onClick={openCreate}><Plus size={16} /> Yeni fiyat kalemi</button></div>
    <section className="data-card"><div className="data-table pricing-table live-pricing-table"><div className="data-row data-head"><span>PARÇA / İŞLEM</span><span>KATEGORİ</span><span>TAŞERON MALİYETİ</span><span>CPO SATIŞI</span><span>MARJ</span><span>FİRMA / TEMİN</span><span>İŞLEMLER</span></div>
      {visibleItems.map(item => <div className="data-row" key={item.id}><span className="primary-cell"><b>{item.itemName}</b><small>{item.itemCode}</small></span><span>{item.category}</span><span className="private-value"><b>₺{item.cost.toLocaleString("tr-TR")}</b><small>Taşeron ekranı</small></span><span className="private-value sale"><b>₺{item.salePrice.toLocaleString("tr-TR")}</b><small>CPO ekranı</small></span><span className="positive"><b>%{item.salePrice ? Math.round((item.salePrice - item.cost) / item.salePrice * 100) : 0}</b></span><span><b>{item.counterpartyName}</b><small>{item.supplyType}</small></span><span className="row-actions"><button onClick={() => openEdit(item)}><Edit3 /></button><button className="danger" onClick={() => void remove(item)}><Trash2 /></button></span></div>)}
      {visibleItems.length === 0 && <div className="empty-state"><b>{query ? "Aramayla eşleşen fiyat yok" : "Fiyat kalemi yok"}</b><span>{query ? "Arama ölçütünü değiştirin." : "İlk fiyatı ekleyerek başlayın."}</span></div>}
    </div></section>
    {modalOpen && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label="Kapat" /><form className="tenant-modal" onSubmit={save}><div className="modal-head"><div><p className="eyebrow">{form.id ? "FİYAT DÜZENLE" : "YENİ FİYAT"}</p><h2>Parça veya işçilik fiyatı</h2><span>Her taraf yalnız kendi rolüne atanmış tutarı görür.</span></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)}><X /></button></div><div className="modal-fields">
      <label><span>Fiyat kalemi (kod · ad)</span><select required value={form.itemCode} onChange={event => {
        const match = catalog.find(([code]) => code === event.target.value);
        setForm({ ...form, itemCode: match?.[0] ?? "", itemName: match?.[1] ?? "" });
      }}><option value="">Kalem seçin</option>{catalog.map(([code, name]) => <option value={code} key={code}>{code} · {name}</option>)}</select></label>
      <label><span>Kalem adı</span><input readOnly required value={form.itemName} /></label>
      <label><span>Kategori</span><select required value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}><option value="">Kategori seçin</option><option>Periyodik Bakım</option><option>Ek İşçilik</option><option>Yedek Parça</option><option>Uzaktan Destek</option></select></label>
      <label><span>Temin tipi</span><select required value={form.supplyType} onChange={event => setForm({ ...form, supplyType: event.target.value })}><option>Merkez stoğu</option><option>Taşeron temini</option><option>CPO temini</option><option>Parça hariç</option></select></label>
      <PriceField label="Taşeron maliyeti" value={String(form.cost)} set={value => setForm({ ...form, cost: Number(value) })} type="number" /><PriceField label="CPO satış fiyatı" value={String(form.salePrice)} set={value => setForm({ ...form, salePrice: Number(value) })} type="number" />
      <label><span>Firma tipi</span><select value={counterpartyType} onChange={event => {
        const type = event.target.value as "CONTRACTOR" | "CPO";
        setCounterpartyType(type);
        setForm({ ...form, counterpartyTenantId: tenants.find(item => item.type === type)?.id ?? "" });
      }}><option value="CONTRACTOR">Taşeron</option><option value="CPO">CPO</option></select></label>
      <label><span>{counterpartyType === "CONTRACTOR" ? "Taşeron firma" : "CPO firma"}</span><select required value={form.counterpartyTenantId ?? ""} onChange={event => setForm({ ...form, counterpartyTenantId: event.target.value })}><option value="">Firma seçin</option>{selectableTenants.map(tenant => <option value={tenant.id} key={tenant.id}>{tenant.name}</option>)}</select></label>
      <label><span>Durum</span><select value={form.active ? "true" : "false"} onChange={event => setForm({ ...form, active: event.target.value === "true" })}><option value="true">Aktif</option><option value="false">Pasif</option></select></label>
    </div>{error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>Vazgeç</button><button className="button button--primary">Kaydet</button></div></form></div>}
  </>;
}

function PriceField({ label, value, set, type = "text" }: { label: string; value: string; set(value: string): void; type?: string }) {
  return <label><span>{label}</span><input required type={type} min={type === "number" ? 0 : undefined} value={value} onChange={event => set(event.target.value)} /></label>;
}
