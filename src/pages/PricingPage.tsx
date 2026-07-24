import { Edit3, EyeOff, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";

interface Price { id: string; itemCode: string; itemName: string; category: string; cost: number; salePrice: number; currency: string; supplyType: string; active: boolean; counterpartyTenantId?: string; counterpartyName: string }
interface Tenant { id: string; name: string; type: string }
const emptyPrice: Price = { id: "", itemCode: "", itemName: "", category: "", cost: 0, salePrice: 0, currency: "TRY", supplyType: "Merkez stoğu", active: true, counterpartyTenantId: "", counterpartyName: "" };

export function PricingPage() {
  const [items, setItems] = useState<Price[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [form, setForm] = useState<Price>(emptyPrice);
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
  return <>
    <PageHeader eyebrow="TİCARİ YÖNETİM" title="Fiyat yönetimi" description="Taşeron maliyetlerini ve CPO satış fiyatlarını birbirinden bağımsız yönetin." />
    <div className="privacy-notice"><EyeOff size={19} /><div><strong>Taraflara kapalı fiyatlandırma</strong><span>Taşeron maliyeti ve CPO satış fiyatı yalnız Bakımnerde yöneticileri tarafından görülebilir.</span></div></div>
    <div className="toolbar"><label className="table-search"><Search size={16} /><input placeholder="Parça veya kategori ara" /></label><button className="button button--primary" onClick={() => { setForm(emptyPrice); setError(""); setModalOpen(true); }}><Plus size={16} /> Yeni fiyat kalemi</button></div>
    <section className="data-card"><div className="data-table pricing-table live-pricing-table"><div className="data-row data-head"><span>PARÇA / İŞLEM</span><span>KATEGORİ</span><span>TAŞERON MALİYETİ</span><span>CPO SATIŞI</span><span>MARJ</span><span>FİRMA / TEMİN</span><span>İŞLEMLER</span></div>
      {items.map(item => <div className="data-row" key={item.id}><span className="primary-cell"><b>{item.itemName}</b><small>{item.itemCode}</small></span><span>{item.category}</span><span className="private-value"><b>₺{item.cost.toLocaleString("tr-TR")}</b><small>Gizli maliyet</small></span><span className="private-value sale"><b>₺{item.salePrice.toLocaleString("tr-TR")}</b><small>Gizli satış</small></span><span className="positive"><b>%{item.salePrice ? Math.round((item.salePrice - item.cost) / item.salePrice * 100) : 0}</b></span><span><b>{item.counterpartyName}</b><small>{item.supplyType}</small></span><span className="row-actions"><button onClick={() => { setForm(item); setError(""); setModalOpen(true); }}><Edit3 /></button><button className="danger" onClick={() => void remove(item)}><Trash2 /></button></span></div>)}
      {items.length === 0 && <div className="empty-state"><b>Fiyat kalemi yok</b><span>İlk fiyatı ekleyerek başlayın.</span></div>}
    </div></section>
    {modalOpen && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label="Kapat" /><form className="tenant-modal" onSubmit={save}><div className="modal-head"><div><p className="eyebrow">{form.id ? "FİYAT DÜZENLE" : "YENİ FİYAT"}</p><h2>Parça veya işçilik fiyatı</h2><span>Maliyet ve satış fiyatı taraflardan gizlenir.</span></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)}><X /></button></div><div className="modal-fields">
      <PriceField label="Kalem kodu" value={form.itemCode} set={value => setForm({ ...form, itemCode: value })} /><PriceField label="Kalem adı" value={form.itemName} set={value => setForm({ ...form, itemName: value })} /><PriceField label="Kategori" value={form.category} set={value => setForm({ ...form, category: value })} /><PriceField label="Temin tipi" value={form.supplyType} set={value => setForm({ ...form, supplyType: value })} /><PriceField label="Taşeron maliyeti" value={String(form.cost)} set={value => setForm({ ...form, cost: Number(value) })} type="number" /><PriceField label="CPO satış fiyatı" value={String(form.salePrice)} set={value => setForm({ ...form, salePrice: Number(value) })} type="number" /><label><span>Firma özel fiyatı</span><select value={form.counterpartyTenantId ?? ""} onChange={event => setForm({ ...form, counterpartyTenantId: event.target.value })}><option value="">Standart fiyat</option>{tenants.map(tenant => <option value={tenant.id} key={tenant.id}>{tenant.name}</option>)}</select></label><label><span>Durum</span><select value={form.active ? "true" : "false"} onChange={event => setForm({ ...form, active: event.target.value === "true" })}><option value="true">Aktif</option><option value="false">Pasif</option></select></label>
    </div>{error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>Vazgeç</button><button className="button button--primary">Kaydet</button></div></form></div>}
  </>;
}

function PriceField({ label, value, set, type = "text" }: { label: string; value: string; set(value: string): void; type?: string }) {
  return <label><span>{label}</span><input required type={type} min={type === "number" ? 0 : undefined} value={value} onChange={event => set(event.target.value)} /></label>;
}
