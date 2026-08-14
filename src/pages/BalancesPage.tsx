import { ArrowDownLeft, ArrowUpRight, CreditCard, Eye, Plus, Search, ShieldAlert, WalletCards, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { usePreferences } from "../app/PreferencesContext";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../lib/api";
import { Pagination } from "../shared/components/Pagination";
import { PageHeader } from "../shared/components/PageHeader";

type PaymentMethod = "WALLET" | "CREDIT_CARD" | "MANUAL";
interface Wallet {
  id: string; tenantId: string; tenantName: string; tenantType: string; currency: string; balance: number; blockedBalance: number;
  creditLimit?: number; borrowableAmount?: number; debtStatus?: string;
}
interface Transaction {
  id: string; tenantName: string; amount: number; direction: string; description: string; createdAt: string;
  paymentMethod: PaymentMethod; type?: string; jobNumber?: string | null;
}
interface TransactionDetail extends Transaction {
  currency: string;
  paymentReference?: string | null;
  cardSummary?: string | null;
  jobId?: string | null;
  jobNumber?: string | null;
}
interface AdjustmentForm { tenantId: string; amount: string; description: string; paymentMethod: PaymentMethod; creditLimit: string }
const TRANSACTION_PAGE_SIZE = 8;
const balanceGridStyle: CSSProperties = { gridTemplateColumns: ".9fr 1.15fr .9fr 1.35fr 1fr .8fr 46px" };

export function BalancesPage() {
  const { principal } = useAuth();
  const { language, locale } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
  const isPlatform = principal?.tenantType === "PLATFORM";
  const isCpo = principal?.tenantType === "CPO";
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detailRequest, setDetailRequest] = useState<Transaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const detailRequestVersion = useRef(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyType, setCompanyType] = useState<"CONTRACTOR" | "CPO">("CONTRACTOR");
  const [form, setForm] = useState<AdjustmentForm>({ tenantId: "", amount: "", description: "", paymentMethod: "MANUAL", creditLimit: "" });
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
    const needle = query.trim().toLocaleLowerCase(locale);
    return needle ? transactions.filter((item) => `${item.id} ${item.tenantName} ${item.description} ${item.direction} ${item.paymentMethod} ${item.type ?? ""} ${item.jobNumber ?? ""}`.toLocaleLowerCase(locale).includes(needle)) : transactions;
  }, [locale, query, transactions]);
  const pagedTransactions = useMemo(() => visibleTransactions.slice((page - 1) * TRANSACTION_PAGE_SIZE, page * TRANSACTION_PAGE_SIZE), [page, visibleTransactions]);
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(visibleTransactions.length / TRANSACTION_PAGE_SIZE));
    if (page > lastPage) setPage(lastPage);
  }, [page, visibleTransactions.length]);
  async function openTransactionDetail(transaction: Transaction) {
    const requestVersion = ++detailRequestVersion.current;
    setDetailRequest(transaction);
    setSelectedTransaction(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const detail = await apiRequest<TransactionDetail>("/wallet-transaction-detail", {
        method: "POST",
        body: JSON.stringify({ id: transaction.id }),
      });
      if (requestVersion !== detailRequestVersion.current) return;
      setSelectedTransaction(detail);
    } catch (reason) {
      if (requestVersion !== detailRequestVersion.current) return;
      setDetailError(reason instanceof Error ? reason.message : copy("Ödeme ayrıntıları yüklenemedi.", "Payment details could not be loaded."));
    } finally {
      if (requestVersion === detailRequestVersion.current) setDetailLoading(false);
    }
  }
  function closeTransactionDetail() {
    detailRequestVersion.current += 1;
    setDetailRequest(null);
    setSelectedTransaction(null);
    setDetailError("");
    setDetailLoading(false);
  }
  async function adjust(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError(""); setSaving(true);
    try {
      const amount = form.amount.trim() ? Number(form.amount) : null;
      const creditLimit = companyType === "CPO" && form.creditLimit.trim() ? Number(form.creditLimit) : null;
      if (amount !== null) {
        if (!Number.isFinite(amount) || amount === 0 || !form.description) throw new Error(copy("Tutar sıfırdan farklı olmalı ve açıklama seçilmelidir.", "Amount must be non-zero and a description must be selected."));
      }
      if (creditLimit !== null) {
        if (!Number.isFinite(creditLimit) || creditLimit < 0) throw new Error(copy("Borç limiti sıfır veya daha büyük olmalıdır.", "Credit limit must be zero or greater."));
      }
      if (amount === null && creditLimit === null) throw new Error(copy("Bakiye tutarı veya borç limiti girin.", "Enter a balance amount or credit limit."));
      // The wallet adjustment must see the newly selected limit; issuing both
      // mutations concurrently makes the outcome depend on database timing.
      if (creditLimit !== null) {
        await apiRequest("/wallet-credit-limit", { method: "POST", body: JSON.stringify({ tenantId: form.tenantId, creditLimit }) });
      }
      if (amount !== null) {
        await apiRequest("/wallet-adjust", { method: "POST", body: JSON.stringify({ tenantId: form.tenantId, amount, description: form.description, paymentMethod: form.paymentMethod }) });
      }
      await load(); setModalOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : copy("Bakiye işlemi yapılamadı.", "Wallet operation failed.")); }
    finally { setSaving(false); }
  }
  const money = (value: number, currency = "TRY") => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  const selectableWallets = wallets.filter(wallet => wallet.tenantType === companyType);
  const ownWallet = isPlatform ? undefined : wallets[0];
  function openAdjustment() {
    const type: "CONTRACTOR" | "CPO" = wallets.some(wallet => wallet.tenantType === "CONTRACTOR") ? "CONTRACTOR" : "CPO";
    const wallet = wallets.find(item => item.tenantType === type);
    setCompanyType(type);
    setForm({ tenantId: wallet?.tenantId ?? "", amount: "", description: "", paymentMethod: "MANUAL", creditLimit: type === "CPO" ? String(wallet?.creditLimit ?? "") : "" });
    setError("");
    setModalOpen(true);
  }
  function changeCompanyType(type: "CONTRACTOR" | "CPO") {
    const wallet = wallets.find((item) => item.tenantType === type);
    setCompanyType(type);
    setForm({ tenantId: wallet?.tenantId ?? "", amount: "", description: "", paymentMethod: "MANUAL", creditLimit: type === "CPO" ? String(wallet?.creditLimit ?? "") : "" });
  }
  function changeWallet(tenantId: string) {
    const wallet = wallets.find((item) => item.tenantId === tenantId);
    setForm((current) => ({ ...current, tenantId, creditLimit: companyType === "CPO" ? String(wallet?.creditLimit ?? "") : "" }));
  }
  const blockedCpoWallets = wallets.filter((wallet) => wallet.tenantType === "CPO" && wallet.debtStatus === "DEBT_LIMIT_EXCEEDED");
  return <>
    {isPlatform && blockedCpoWallets.length > 0 && <section className="attention-strip" role="alert"><ShieldAlert size={18} /><div><strong>{copy(`${blockedCpoWallets.length} CPO borç limitini aştı`, `${blockedCpoWallets.length} CPO companies exceeded their credit limit`)}</strong><span>{blockedCpoWallets.map((wallet) => `${wallet.tenantName} (${money(Math.abs(wallet.balance))})`).join(", ")} · {copy("Sistem erişimi borç kapatılana veya limit yükseltilene kadar kapalıdır.", "System access is blocked until the debt is reduced or the limit is raised.")}</span></div></section>}
    <PageHeader eyebrow="" title={copy("Ödemeler", "Payments")} description={isPlatform ? copy("Firma cüzdanlarını, bakiyeleri, borç limitlerini ve iş bazlı hak edişleri yönetin.", "Manage company wallets, balances, credit limits and job-based settlements.") : copy("Şirketinizin güncel bakiyesini ve ödeme hareketlerini anlık olarak görüntüleyin.", "View your company balance and payment activity in real time.")} />
    {isPlatform
      ? <section className="balance-hero"><article className="balance-main"><span className="metric__icon metric__icon--green"><WalletCards /></span><div><small>{copy("YÖNETİLEN TOPLAM BAKİYE", "TOTAL MANAGED BALANCE")}</small><strong>{money(totals.all)}</strong><p>{wallets.length} {copy("firma cüzdanı", "company wallets")}</p></div></article><article><span className="metric__icon metric__icon--blue"><ArrowDownLeft /></span><div><small>{copy("CPO BAKİYELERİ", "CPO BALANCES")}</small><strong>{money(totals.cpo)}</strong><p>{copy("Müşteri cüzdanları", "Customer wallets")}</p></div></article><article><span className="metric__icon metric__icon--amber"><ArrowUpRight /></span><div><small>{copy("TAŞERON BAKİYELERİ", "TECHNICAL SERVICE BALANCES")}</small><strong>{money(totals.contractor)}</strong><p>{copy("Hak ediş cüzdanları", "Settlement wallets")}</p></div></article></section>
      : isCpo
        ? <section className="balance-hero"><article className="balance-main"><span className="metric__icon metric__icon--green"><WalletCards /></span><div><small>{copy("ANLIK KULLANILABİLİR BAKİYE", "AVAILABLE BALANCE")}</small><strong>{money(Number(ownWallet?.balance ?? 0))}</strong><p>{principal?.tenantName} · {copy("Bloke", "Blocked")}: {money(Number(ownWallet?.blockedBalance ?? 0))}</p></div></article><article><span className="metric__icon metric__icon--blue"><CreditCard /></span><div><small>{copy("BORÇLANABİLİR MİKTAR", "BORROWABLE AMOUNT")}</small><strong>{money(Number(ownWallet?.borrowableAmount ?? 0))}</strong><p>{copy("Borç limiti", "Credit limit")}: {money(Number(ownWallet?.creditLimit ?? 0))}</p></div></article><article><span className="metric__icon metric__icon--amber"><ShieldAlert /></span><div><small>{copy("BORÇ DURUMU", "DEBT STATUS")}</small><strong className={debtStatusClass(ownWallet?.debtStatus)}>{debtStatusLabel(ownWallet?.debtStatus, language)}</strong><p>{debtStatusDescription(ownWallet?.debtStatus, language)}</p></div></article></section>
        : <section className="balance-hero balance-hero--company"><article className="balance-main"><span className="metric__icon metric__icon--green"><WalletCards /></span><div><small>{copy("ANLIK KULLANILABİLİR BAKİYE", "AVAILABLE BALANCE")}</small><strong>{money(Number(ownWallet?.balance ?? 0))}</strong><p>{principal?.tenantName} · {copy("Bloke", "Blocked")}: {money(Number(ownWallet?.blockedBalance ?? 0))}</p></div></article></section>}
    <div className="toolbar"><label className="table-search"><Search size={16} /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={copy("Ödemelerde ara", "Search payments")} /></label>{isPlatform && <button className="button button--primary" onClick={openAdjustment}><Plus size={16} /> {copy("Bakiye / limit işlemi", "Balance / limit operation")}</button>}</div>
    <section className="data-card"><div className="data-table balance-table"><div className="data-row data-head" style={balanceGridStyle}><span>{copy("İŞLEM ID", "TRANSACTION ID")}</span><span>{copy("FİRMA", "COMPANY")}</span><span>{copy("ÖDEME YÖNTEMİ", "PAYMENT METHOD")}</span><span>{copy("AÇIKLAMA", "DESCRIPTION")}</span><span>{copy("TARİH", "DATE")}</span><span>{copy("TUTAR", "AMOUNT")}</span><span /></div>{pagedTransactions.map(item => <div className="data-row" style={balanceGridStyle} key={item.id}><span className="primary-cell"><b>{item.id.slice(-8).toUpperCase()}</b><small>{item.jobNumber ?? transactionTypeLabel(item.type, language)}</small></span><span><b>{item.tenantName}</b></span><span><b>{paymentMethodLabel(item.paymentMethod, language)}</b></span><span>{item.description}</span><span>{new Date(item.createdAt).toLocaleString(locale)}</span><span className={item.amount > 0 ? "positive" : "danger-text"}><b>{item.amount > 0 ? "+" : ""}{money(item.amount)}</b></span><span className="row-actions"><button type="button" onClick={() => void openTransactionDetail(item)} aria-label={copy(`${item.id.slice(-8)} ödeme detayını görüntüle`, `View payment details for ${item.id.slice(-8)}`)} title={copy("Ödeme detayını görüntüle", "View payment details")}><Eye /></button></span></div>)}
      {visibleTransactions.length === 0 && <div className="empty-state"><b>{query ? copy("Aramayla eşleşen ödeme yok", "No payments match the search") : copy("Henüz ödeme hareketi yok", "No payment activity yet")}</b><span>{query ? copy("Arama ölçütünü değiştirin.", "Change the search criteria.") : isPlatform ? copy("İlk işlemi yaparak başlayın.", "Start by creating the first operation.") : copy("Şirketinizin ilk ödeme hareketi burada görünecek.", "Your company's first payment will appear here.")}</span></div>}</div><Pagination page={page} pageSize={TRANSACTION_PAGE_SIZE} total={visibleTransactions.length} onPageChange={setPage} /></section>
    {isPlatform && modalOpen && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label={copy("Kapat", "Close")} /><form className="tenant-modal" onSubmit={adjust} role="dialog" aria-modal="true" aria-label={copy("Bakiye ve borç limiti işlemi", "Balance and credit limit operation")}><div className="modal-head"><div><p className="eyebrow">{copy("FİNANSAL İŞLEM", "FINANCIAL OPERATION")}</p><h2>{copy("Bakiye ve borç limiti yönetimi", "Balance and credit limit management")}</h2><span>{copy("Bakiye hareketi, borç limiti veya ikisini birlikte kaydedebilirsiniz.", "You can save a balance transaction, a credit limit, or both.")}</span></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)} aria-label={copy("Kapat", "Close")}><X /></button></div><div className="modal-fields"><label><span>{copy("Firma tipi", "Company type")}</span><select value={companyType} onChange={event => changeCompanyType(event.target.value as "CONTRACTOR" | "CPO")}><option value="CONTRACTOR">{copy("Teknik servis", "Technical service")}</option><option value="CPO">CPO</option></select></label><label><span>{companyType === "CONTRACTOR" ? copy("Teknik servis", "Technical service") : copy("CPO firma", "CPO company")}</span><select required value={form.tenantId} onChange={event => changeWallet(event.target.value)}><option value="">{copy("Firma seçin", "Select company")}</option>{selectableWallets.map(wallet => <option value={wallet.tenantId} key={wallet.id}>{wallet.tenantName}</option>)}</select></label><label><span>{copy("Tutar (+ / -)", "Amount (+ / -)")}</span><input required={companyType !== "CPO" || !form.creditLimit} type="number" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></label><label><span>{copy("Ödeme yöntemi", "Payment method")}</span><select required={Boolean(form.amount)} value={form.paymentMethod} onChange={event => setForm({ ...form, paymentMethod: event.target.value as PaymentMethod })}><option value="MANUAL">{copy("Manuel işlem", "Manual operation")}</option><option value="WALLET">{copy("Cüzdan", "Wallet")}</option><option value="CREDIT_CARD">{copy("Kredi kartı", "Credit card")}</option></select></label><label><span>{copy("Açıklama", "Description")}</span><select required={Boolean(form.amount)} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })}><option value="">{copy("İşlem türü seçin", "Select operation type")}</option><option>{copy("Hak ediş ödemesi", "Settlement payment")}</option><option>{copy("Bakiye yükleme", "Balance top-up")}</option><option>{copy("Düzeltme", "Correction")}</option><option>{copy("İade", "Refund")}</option></select></label>{companyType === "CPO" && <label><span>{copy("Borç limiti", "Credit limit")}</span><input min="0" type="number" value={form.creditLimit} onChange={event => setForm({ ...form, creditLimit: event.target.value })} /></label>}</div>{error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>{copy("Vazgeç", "Cancel")}</button><button className="button button--primary">{copy("İşlemi kaydet", "Save operation")}</button></div></form></div>}
    {detailRequest && <div className="modal-wrap">
      <button className="modal-backdrop" onClick={closeTransactionDetail} aria-label={copy("Kapat", "Close")} />
      <section className="tenant-modal compact-modal" role="dialog" aria-modal="true" aria-label={copy("Ödeme detayı", "Payment details")} aria-busy={detailLoading}>
        <div className="modal-head"><div><p className="eyebrow">{copy("ÖDEME DETAYI", "PAYMENT DETAILS")}</p><h2>{detailRequest.id.slice(-8).toUpperCase()}</h2><span>{selectedTransaction?.jobNumber ? `${copy("İş", "Job")}: ${selectedTransaction.jobNumber}` : transactionTypeLabel(selectedTransaction?.type ?? detailRequest.type, language)}</span></div><button type="button" className="icon-button" onClick={closeTransactionDetail} aria-label={copy("Kapat", "Close")}><X /></button></div>
        {detailLoading && <div className="empty-state" role="status" aria-live="polite"><b>{copy("Ödeme ayrıntıları yükleniyor…", "Loading payment details…")}</b><span>{copy("Lütfen bekleyin.", "Please wait.")}</span></div>}
        {!detailLoading && detailError && <div className="login-error" role="alert">{detailError}</div>}
        {!detailLoading && selectedTransaction && <div className="detail-summary">
          <div><small>{copy("FİRMA", "COMPANY")}</small><b>{selectedTransaction.tenantName}</b></div>
          <div><small>{copy("ÖDEME YÖNTEMİ", "PAYMENT METHOD")}</small><b>{paymentMethodLabel(selectedTransaction.paymentMethod, language)}</b></div>
          <div><small>{copy("İŞLEM TÜRÜ", "TRANSACTION TYPE")}</small><b>{transactionTypeLabel(selectedTransaction.type, language)}</b></div>
          <div><small>{copy("TARİH", "DATE")}</small><b>{new Date(selectedTransaction.createdAt).toLocaleString(locale)}</b></div>
          <div><small>{copy("AÇIKLAMA", "DESCRIPTION")}</small><b>{selectedTransaction.description}</b></div>
          <div><small>{copy("TUTAR", "AMOUNT")}</small><b className={selectedTransaction.amount > 0 ? "positive" : "danger-text"}>{selectedTransaction.amount > 0 ? "+" : ""}{money(selectedTransaction.amount, selectedTransaction.currency)}</b></div>
          <div><small>{copy("PARA BİRİMİ", "CURRENCY")}</small><b>{selectedTransaction.currency}</b></div>
          {(selectedTransaction.jobNumber || selectedTransaction.jobId) && <div><small>{copy("İŞ", "JOB")}</small><b>{selectedTransaction.jobNumber ?? selectedTransaction.jobId}</b></div>}
          {selectedTransaction.paymentReference && <div><small>{copy("ÖDEME REFERANSI", "PAYMENT REFERENCE")}</small><b>{selectedTransaction.paymentReference}</b></div>}
          {selectedTransaction.cardSummary && <div><small>{copy("KART", "CARD")}</small><b>{selectedTransaction.cardSummary}</b></div>}
        </div>}
      </section>
    </div>}
  </>;
}

function paymentMethodLabel(method: PaymentMethod | undefined, language: "tr" | "en"): string {
  if (method === "CREDIT_CARD") return language === "tr" ? "Kredi kartı" : "Credit card";
  if (method === "MANUAL") return language === "tr" ? "Manuel işlem" : "Manual operation";
  return language === "tr" ? "Cüzdan" : "Wallet";
}
function transactionTypeLabel(type: string | undefined, language: "tr" | "en"): string {
  const labels: Record<string, [string, string]> = {
    CPO_TO_PLATFORM_PAYMENT: ["CPO ödemesi", "CPO payment"],
    PLATFORM_TO_CONTRACTOR_PAYMENT: ["Teknik servis ödemesi", "Technical service payment"],
    MANUAL_ADJUSTMENT: ["Manuel bakiye işlemi", "Manual balance adjustment"],
    WALLET_ADJUSTMENT: ["Cüzdan düzeltmesi", "Wallet adjustment"],
  };
  const label = type ? labels[type] : undefined;
  return label ? label[language === "tr" ? 0 : 1] : (type?.replaceAll("_", " ") ?? (language === "tr" ? "Cüzdan hareketi" : "Wallet transaction"));
}
function debtStatusLabel(status: string | undefined, language: "tr" | "en"): string {
  if (status === "DEBT_LIMIT_EXCEEDED") return language === "tr" ? "Borçlu" : "Debtor";
  if (status === "IN_DEBT") return language === "tr" ? "Borçta" : "In debt";
  return language === "tr" ? "Aktif" : "Active";
}
function debtStatusClass(status: string | undefined): string | undefined {
  if (status === "DEBT_LIMIT_EXCEEDED") return "danger-text";
  return status === "IN_DEBT" ? undefined : "positive";
}
function debtStatusDescription(status: string | undefined, language: "tr" | "en"): string {
  if (status === "DEBT_LIMIT_EXCEEDED") return language === "tr" ? "Borç limiti aşıldığı için sistem kullanımı durduruldu" : "System use is blocked because the credit limit was exceeded";
  if (status === "IN_DEBT") return language === "tr" ? "Borçlanma limitiniz içinde; sistemi kullanmaya devam edebilirsiniz" : "Within your credit limit; you can continue using the system";
  return language === "tr" ? "Borçlanma limitiniz kullanılabilir" : "Your credit limit is available";
}
