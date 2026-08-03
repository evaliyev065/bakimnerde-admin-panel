import { ArrowDownLeft, ArrowUpRight, Plus, Search, WalletCards, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";

interface Wallet { id: string; tenantId: string; tenantName: string; tenantType: string; currency: string; balance: number; blockedBalance: number }
interface Transaction { id: string; tenantName: string; amount: number; direction: string; description: string; createdAt: string }

export function BalancesPage() {
  const { principal } = useAuth();
  const isPlatform = principal?.tenantType === "PLATFORM";
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [companyType, setCompanyType] = useState<"CONTRACTOR" | "CPO">("CONTRACTOR");
  const [form, setForm] = useState({ tenantId: "", amount: "", description: "" });
  const [error, setError] = useState("");
  const load = useCallback(() => Promise.all([apiRequest<Wallet[]>("/wallets-list"), apiRequest<Transaction[]>("/wallet-transactions-list")]).then(([walletItems, txItems]) => { setWallets(walletItems); setTransactions(txItems); }), []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 3_000);
    return () => window.clearInterval(timer);
  }, [load]);
  const totals = useMemo(() => ({
    all: wallets.reduce((sum, wallet) => sum + wallet.balance, 0),
    cpo: wallets.filter(wallet => wallet.tenantType === "CPO").reduce((sum, wallet) => sum + wallet.balance, 0),
    contractor: wallets.filter(wallet => wallet.tenantType === "CONTRACTOR").reduce((sum, wallet) => sum + wallet.balance, 0),
  }), [wallets]);
  const visibleTransactions = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return needle ? transactions.filter((item) => `${item.id} ${item.tenantName} ${item.description} ${item.direction}`.toLocaleLowerCase("tr-TR").includes(needle)) : transactions;
  }, [query, transactions]);
  async function adjust(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      await apiRequest("/wallet-adjust", { method: "POST", body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
      await load(); setModalOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Bakiye işlemi yapılamadı."); }
  }
  const money = (value: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
  const selectableWallets = wallets.filter(wallet => wallet.tenantType === companyType);
  const ownWallet = isPlatform ? undefined : wallets[0];
  function openAdjustment() {
    const type: "CONTRACTOR" | "CPO" = wallets.some(wallet => wallet.tenantType === "CONTRACTOR") ? "CONTRACTOR" : "CPO";
    setCompanyType(type);
    setForm({ tenantId: wallets.find(wallet => wallet.tenantType === type)?.tenantId ?? "", amount: "", description: "" });
    setError("");
    setModalOpen(true);
  }
  return <>
    <PageHeader eyebrow="FİNANS" title="Cüzdan" description={isPlatform ? "Firma cüzdanlarını, bakiyeleri ve iş bazlı hak edişleri yönetin." : "Şirketinizin güncel bakiyesini ve cüzdan hareketlerini anlık olarak görüntüleyin."} />
    {isPlatform ? <section className="balance-hero"><article className="balance-main"><span className="metric__icon metric__icon--green"><WalletCards /></span><div><small>YÖNETİLEN TOPLAM BAKİYE</small><strong>{money(totals.all)}</strong><p>{wallets.length} firma kapalı cüzdanı</p></div></article><article><span className="metric__icon metric__icon--blue"><ArrowDownLeft /></span><div><small>CPO BAKİYELERİ</small><strong>{money(totals.cpo)}</strong><p>Müşteri cüzdanları</p></div></article><article><span className="metric__icon metric__icon--amber"><ArrowUpRight /></span><div><small>TAŞERON BAKİYELERİ</small><strong>{money(totals.contractor)}</strong><p>Hak ediş cüzdanları</p></div></article></section> : <section className="balance-hero balance-hero--company"><article className="balance-main"><span className="metric__icon metric__icon--green"><WalletCards /></span><div><small>ANLIK KULLANILABİLİR BAKİYE</small><strong>{money(Number(ownWallet?.balance ?? 0))}</strong><p>{principal?.tenantName} · Bloke: {money(Number(ownWallet?.blockedBalance ?? 0))}</p></div></article></section>}
    {isPlatform && <div className="toolbar"><label className="table-search"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hareketlerde ara" /></label><button className="button button--primary" onClick={openAdjustment}><Plus size={16} /> Bakiye işlemi</button></div>}
    <section className="data-card"><div className="data-table balance-table"><div className="data-row data-head"><span>İŞLEM ID</span><span>FİRMA</span><span>TÜR</span><span>AÇIKLAMA</span><span>TARİH</span><span>TUTAR</span></div>{visibleTransactions.map(item => <div className="data-row" key={item.id}><span className="primary-cell"><b>{item.id.slice(-8).toUpperCase()}</b><small>Kapalı cüzdan</small></span><span><b>{item.tenantName}</b></span><span>{item.direction === "CREDIT" ? "Bakiye ekleme" : "Kesinti / ödeme"}</span><span>{item.description}</span><span>{new Date(item.createdAt).toLocaleString("tr-TR")}</span><span className={item.amount > 0 ? "positive" : "danger-text"}><b>{item.amount > 0 ? "+" : ""}{money(item.amount)}</b></span></div>)}
      {visibleTransactions.length === 0 && <div className="empty-state"><b>{query ? "Aramayla eşleşen hareket yok" : "Henüz bakiye hareketi yok"}</b><span>{query ? "Arama ölçütünü değiştirin." : isPlatform ? "İlk işlemi yaparak başlayın." : "Şirketinizin ilk cüzdan hareketi burada görünecek."}</span></div>}</div></section>
    {isPlatform && modalOpen && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label="Kapat" /><form className="tenant-modal compact-modal" onSubmit={adjust}><div className="modal-head"><div><p className="eyebrow">FİNANSAL İŞLEM</p><h2>Bakiye ekle veya düş</h2><span>Eksi tutar bakiyeden düşer; tüm işlemler benzersiz işlem ID’siyle kaydedilir.</span></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)}><X /></button></div><div className="modal-fields"><label><span>Firma tipi</span><select value={companyType} onChange={event => { const type = event.target.value as "CONTRACTOR" | "CPO"; setCompanyType(type); setForm({ ...form, tenantId: wallets.find(wallet => wallet.tenantType === type)?.tenantId ?? "" }); }}><option value="CONTRACTOR">Teknik servis</option><option value="CPO">CPO</option></select></label><label><span>{companyType === "CONTRACTOR" ? "Teknik servis" : "CPO firma"}</span><select required value={form.tenantId} onChange={event => setForm({ ...form, tenantId: event.target.value })}><option value="">Firma seçin</option>{selectableWallets.map(wallet => <option value={wallet.tenantId} key={wallet.id}>{wallet.tenantName}</option>)}</select></label><label><span>Tutar (+ / -)</span><input required type="number" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></label><label><span>Açıklama</span><select required value={form.description} onChange={event => setForm({ ...form, description: event.target.value })}><option value="">İşlem türü seçin</option><option>Hak ediş ödemesi</option><option>Bakiye yükleme</option><option>Düzeltme</option><option>İade</option></select></label></div>{error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>Vazgeç</button><button className="button button--primary">İşlemi kaydet</button></div></form></div>}
  </>;
}
