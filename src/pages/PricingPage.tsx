import { Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { usePreferences } from "../app/PreferencesContext";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";

interface Price { id: string; itemCode: string; itemName: string; category: string; cost: number; salePrice: number; currency: string; supplyType: string; active: boolean; counterpartyTenantId?: string; counterpartyName: string }
interface Tenant { id: string; name: string; type: string }
const emptyPrice: Price = { id: "", itemCode: "", itemName: "", category: "", cost: 0, salePrice: 0, currency: "TRY", supplyType: "Merkez stoğu", active: true, counterpartyTenantId: "", counterpartyName: "" };
const itemCatalog = [
  ["PERIODIC-MAINTENANCE", "Periyodik bakım", "Periodic maintenance"],
  ["FAN-REPLACEMENT-LABOR", "Fan değişimi işçiliği", "Fan replacement labor"],
  ["CONTACTOR-REPLACEMENT", "Kontaktör değişimi", "Contactor replacement"],
  ["POWER-MODULE-REPAIR", "Güç modülü onarımı", "Power module repair"],
  ["SOFTWARE-DIAGNOSTIC", "Yazılım ve uzaktan teşhis", "Software and remote diagnostics"],
] as const;

export function PricingPage() {
  const { language, locale } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
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
    } catch (reason) { setError(reason instanceof Error ? reason.message : copy("Fiyat kaydedilemedi.", "Price could not be saved.")); }
  }
  async function remove(item: Price) {
    if (!window.confirm(copy(`${item.itemName} fiyat kaydını silmek istiyor musunuz?`, `Do you want to delete the price record for ${item.itemName}?`))) return;
    try { await apiRequest("/pricing-delete", { method: "POST", body: JSON.stringify({ id: item.id }) }); await load(); }
    catch (reason) { window.alert(reason instanceof Error ? reason.message : copy("Fiyat silinemedi.", "Price could not be deleted.")); }
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
  const catalog = Array.from(new Map([...itemCatalog.map(([code, name]) => [code, name] as const), ...items.map(item => [item.itemCode, item.itemName] as const)]).entries());
  const visibleItems = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return needle ? items.filter((item) => `${item.itemCode} ${priceItemLabel(item.itemCode, item.itemName, language)} ${categoryLabel(item.category, language)} ${item.counterpartyName} ${supplyTypeLabel(item.supplyType, language)}`.toLocaleLowerCase(locale).includes(needle)) : items;
  }, [items, language, locale, query]);
  const money = (value: number, currency: string) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  return <>
    <PageHeader eyebrow={copy("TİCARİ YÖNETİM", "COMMERCIAL MANAGEMENT")} title={copy("Fiyat yönetimi", "Pricing")} description={copy("Taşeron maliyetlerini ve CPO satış fiyatlarını birbirinden bağımsız yönetin.", "Manage technical service costs and CPO sales prices independently.")} />
    <div className="toolbar"><label className="table-search"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy("Parça veya kategori ara", "Search item or category")} /></label><button className="button button--primary" onClick={openCreate}><Plus size={16} /> {copy("Yeni fiyat kalemi", "New price item")}</button></div>
    <section className="data-card"><div className="data-table pricing-table live-pricing-table"><div className="data-row data-head"><span>{copy("PARÇA / İŞLEM", "ITEM / OPERATION")}</span><span>{copy("KATEGORİ", "CATEGORY")}</span><span>{copy("TAŞERON MALİYETİ", "TECHNICAL SERVICE COST")}</span><span>{copy("CPO SATIŞI", "CPO SALE")}</span><span>{copy("MARJ", "MARGIN")}</span><span>{copy("FİRMA / TEMİN", "COMPANY / SUPPLY")}</span><span>{copy("İŞLEMLER", "ACTIONS")}</span></div>
      {visibleItems.map(item => <div className="data-row" key={item.id}><span className="primary-cell"><b>{priceItemLabel(item.itemCode, item.itemName, language)}</b><small>{item.itemCode}</small></span><span>{categoryLabel(item.category, language)}</span><span className="private-value"><b>{money(item.cost, item.currency)}</b><small>{copy("Taşeron ekranı", "Technical service view")}</small></span><span className="private-value sale"><b>{money(item.salePrice, item.currency)}</b><small>{copy("CPO ekranı", "CPO view")}</small></span><span className="positive"><b>%{item.salePrice ? Math.round((item.salePrice - item.cost) / item.salePrice * 100) : 0}</b></span><span><b>{item.counterpartyName}</b><small>{supplyTypeLabel(item.supplyType, language)}</small></span><span className="row-actions"><button onClick={() => openEdit(item)} aria-label={copy(`${item.itemName} fiyatını düzenle`, `Edit price for ${item.itemName}`)} title={copy("Düzenle", "Edit")}><Edit3 /></button><button className="danger" onClick={() => void remove(item)} aria-label={copy(`${item.itemName} fiyatını sil`, `Delete price for ${item.itemName}`)} title={copy("Sil", "Delete")}><Trash2 /></button></span></div>)}
      {visibleItems.length === 0 && <div className="empty-state"><b>{query ? copy("Aramayla eşleşen fiyat yok", "No prices match the search") : copy("Fiyat kalemi yok", "No price items")}</b><span>{query ? copy("Arama ölçütünü değiştirin.", "Change the search criteria.") : copy("İlk fiyatı ekleyerek başlayın.", "Start by adding the first price.")}</span></div>}
    </div></section>
    {modalOpen && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label={copy("Kapat", "Close")} /><form className="tenant-modal" onSubmit={save}><div className="modal-head"><div><p className="eyebrow">{form.id ? copy("FİYAT DÜZENLE", "EDIT PRICE") : copy("YENİ FİYAT", "NEW PRICE")}</p><h2>{copy("Parça veya işçilik fiyatı", "Item or labor price")}</h2><span>{copy("Her taraf yalnız kendi rolüne atanmış tutarı görür.", "Each party sees only the amount assigned to its role.")}</span></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)} aria-label={copy("Kapat", "Close")}><X /></button></div><div className="modal-fields">
      <label><span>{copy("Fiyat kalemi (kod · ad)", "Price item (code · name)")}</span><select required value={form.itemCode} onChange={event => {
        const match = catalog.find(([code]) => code === event.target.value);
        setForm({ ...form, itemCode: match?.[0] ?? "", itemName: match?.[1] ?? "" });
      }}><option value="">{copy("Kalem seçin", "Select an item")}</option>{catalog.map(([code, name]) => <option value={code} key={code}>{code} · {priceItemLabel(code, name, language)}</option>)}</select></label>
      <label><span>{copy("Kalem adı", "Item name")}</span><input readOnly required value={priceItemLabel(form.itemCode, form.itemName, language)} /></label>
      <label><span>{copy("Kategori", "Category")}</span><select required value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}><option value="">{copy("Kategori seçin", "Select a category")}</option><option value="Periyodik Bakım">{copy("Periyodik Bakım", "Periodic Maintenance")}</option><option value="Ek İşçilik">{copy("Ek İşçilik", "Additional Labor")}</option><option value="Yedek Parça">{copy("Yedek Parça", "Spare Part")}</option><option value="Uzaktan Destek">{copy("Uzaktan Destek", "Remote Support")}</option></select></label>
      <label><span>{copy("Temin tipi", "Supply type")}</span><select required value={form.supplyType} onChange={event => setForm({ ...form, supplyType: event.target.value })}><option value="Merkez stoğu">{copy("Merkez stoğu", "Central stock")}</option><option value="Taşeron temini">{copy("Taşeron temini", "Technical service supply")}</option><option value="CPO temini">{copy("CPO temini", "CPO supply")}</option><option value="Parça hariç">{copy("Parça hariç", "Parts excluded")}</option></select></label>
      <PriceField label={copy("Taşeron maliyeti", "Technical service cost")} value={String(form.cost)} set={value => setForm({ ...form, cost: Number(value) })} type="number" /><PriceField label={copy("CPO satış fiyatı", "CPO sales price")} value={String(form.salePrice)} set={value => setForm({ ...form, salePrice: Number(value) })} type="number" />
      <label><span>{copy("Firma tipi", "Company type")}</span><select value={counterpartyType} onChange={event => {
        const type = event.target.value as "CONTRACTOR" | "CPO";
        setCounterpartyType(type);
        setForm({ ...form, counterpartyTenantId: tenants.find(item => item.type === type)?.id ?? "" });
      }}><option value="CONTRACTOR">{copy("Taşeron", "Technical service")}</option><option value="CPO">CPO</option></select></label>
      <label><span>{counterpartyType === "CONTRACTOR" ? copy("Taşeron firma", "Technical service company") : copy("CPO firma", "CPO company")}</span><select required value={form.counterpartyTenantId ?? ""} onChange={event => setForm({ ...form, counterpartyTenantId: event.target.value })}><option value="">{copy("Firma seçin", "Select a company")}</option>{selectableTenants.map(tenant => <option value={tenant.id} key={tenant.id}>{tenant.name}</option>)}</select></label>
      <label><span>{copy("Durum", "Status")}</span><select value={form.active ? "true" : "false"} onChange={event => setForm({ ...form, active: event.target.value === "true" })}><option value="true">{copy("Aktif", "Active")}</option><option value="false">{copy("Pasif", "Inactive")}</option></select></label>
    </div>{error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>{copy("Vazgeç", "Cancel")}</button><button className="button button--primary">{copy("Kaydet", "Save")}</button></div></form></div>}
  </>;
}

function PriceField({ label, value, set, type = "text" }: { label: string; value: string; set(value: string): void; type?: string }) {
  return <label><span>{label}</span><input required type={type} min={type === "number" ? 0 : undefined} value={value} onChange={event => set(event.target.value)} /></label>;
}

function priceItemLabel(code: string, fallback: string, language: "tr" | "en"): string {
  const item = itemCatalog.find(([itemCode]) => itemCode === code);
  return item?.[language === "tr" ? 1 : 2] ?? fallback;
}

function categoryLabel(value: string, language: "tr" | "en"): string {
  const labels: Record<string, [string, string]> = {
    "Periyodik Bakım": ["Periyodik Bakım", "Periodic Maintenance"],
    "Ek İşçilik": ["Ek İşçilik", "Additional Labor"],
    "Yedek Parça": ["Yedek Parça", "Spare Part"],
    "Uzaktan Destek": ["Uzaktan Destek", "Remote Support"],
  };
  return labels[value]?.[language === "tr" ? 0 : 1] ?? value;
}

function supplyTypeLabel(value: string, language: "tr" | "en"): string {
  const labels: Record<string, [string, string]> = {
    "Merkez stoğu": ["Merkez stoğu", "Central stock"],
    "Taşeron temini": ["Taşeron temini", "Technical service supply"],
    "CPO temini": ["CPO temini", "CPO supply"],
    "Parça hariç": ["Parça hariç", "Parts excluded"],
  };
  return labels[value]?.[language === "tr" ? 0 : 1] ?? value;
}
