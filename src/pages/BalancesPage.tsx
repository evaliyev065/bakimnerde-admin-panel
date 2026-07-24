import { ArrowDownLeft, ArrowUpRight, Plus, Search, WalletCards, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";

interface Wallet { id: string; tenantId: string; tenantName: string; tenantType: string; currency: string; balance: number; blockedBalance: number }
interface Transaction { id: string; tenantName: string; amount: number; direction: string; description: string; reference: string; createdAt: string }

export function BalancesPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ tenantId: "", amount: "", description: "", reference: "" });
  const [error, setError] = useState("");
  const load = useCallback(() => Promise.all([apiRequest<Wallet[]>("/wallets-list"), apiRequest<Transaction[]>("/wallet-transactions-list")]).then(([walletItems, txItems]) => { setWallets(walletItems); setTransactions(txItems); }), []);
  useEffect(() => { void load(); }, [load]);
  const totals = useMemo(() => ({
    all: wallets.reduce((sum, wallet) => sum + wallet.balance, 0),
    cpo: wallets.filter(wallet => wallet.tenantType === "CPO").reduce((sum, wallet) => sum + wallet.balance, 0),
    contractor: wallets.filter(wallet => wallet.tenantType === "CONTRACTOR").reduce((sum, wallet) => sum + wallet.balance, 0),
  }), [wallets]);
  async function adjust(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      await apiRequest("/wallet-adjust", { method: "POST", body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
      await load(); setModalOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Bakiye işlemi yapılamadı."); }
  }
  const money = (value: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
  return <>
    <PageHeader eyebrow="FİNANS" title="Bakiye & hak ediş" description="Kapalı cüzdanları, firma bakiyelerini ve iş bazlı hak edişleri yönetin." />
    <section className="balance-hero"><article className="balance-main"><span className="metric__icon metric__icon--green"><WalletCards /></span><div><small>YÖNETİLEN TOPLAM BAKİYE</small><strong>{money(totals.all)}</strong><p>{wallets.length} firma kapalı cüzdanı</p></div></article><article><span className="metric__icon metric__icon--blue"><ArrowDownLeft /></span><div><small>CPO BAKİYELERİ</small><strong>{money(totals.cpo)}</strong><p>Müşteri cüzdanları</p></div></article><article><span className="metric__icon metric__icon--amber"><ArrowUpRight /></span><div><small>TAŞERON BAKİYELERİ</small><strong>{money(totals.contractor)}</strong><p>Hak ediş cüzdanları</p></div></article></section>
    <div className="toolbar"><label className="table-search"><Search size={16} /><input placeholder="Hareketlerde ara" /></label><button className="button button--primary" onClick={() => { setForm({ tenantId: wallets[0]?.tenantId ?? "", amount: "", description: "", reference: "" }); setError(""); setModalOpen(true); }}><Plus size={16} /> Bakiye işlemi</button></div>
    <section className="data-card"><div className="data-table balance-table"><div className="data-row data-head"><span>İŞLEM</span><span>FİRMA</span><span>TÜR</span><span>AÇIKLAMA</span><span>TARİH</span><span>TUTAR</span><span>REFERANS</span></div>{transactions.map(item => <div className="data-row" key={item.id}><span className="primary-cell"><b>{item.id.slice(-8).toUpperCase()}</b><small>Kapalı cüzdan</small></span><span><b>{item.tenantName}</b></span><span>{item.direction === "CREDIT" ? "Bakiye ekleme" : "Kesinti / ödeme"}</span><span>{item.description}</span><span>{new Date(item.createdAt).toLocaleString("tr-TR")}</span><span className={item.amount > 0 ? "positive" : "danger-text"}><b>{item.amount > 0 ? "+" : ""}{money(item.amount)}</b></span><span>{item.reference || "—"}</span></div>)}
      {transactions.length === 0 && <div className="empty-state"><b>Henüz bakiye hareketi yok</b><span>İlk işlemi yaparak başlayın.</span></div>}</div></section>
    {modalOpen && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label="Kapat" /><form className="tenant-modal compact-modal" onSubmit={adjust}><div className="modal-head"><div><p className="eyebrow">FİNANSAL İŞLEM</p><h2>Bakiye ekle veya düş</h2><span>Eksi tutar bakiyeden düşer; tüm işlemler loglanır.</span></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)}><X /></button></div><div className="modal-fields"><label><span>Firma cüzdanı</span><select required value={form.tenantId} onChange={event => setForm({ ...form, tenantId: event.target.value })}>{wallets.map(wallet => <option value={wallet.tenantId} key={wallet.id}>{wallet.tenantName} · {money(wallet.balance)}</option>)}</select></label><label><span>Tutar (+ / -)</span><input required type="number" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></label><label><span>Açıklama</span><input required value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label><label><span>Referans</span><input value={form.reference} onChange={event => setForm({ ...form, reference: event.target.value })} /></label></div>{error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>Vazgeç</button><button className="button button--primary">İşlemi kaydet</button></div></form></div>}
  </>;
}
