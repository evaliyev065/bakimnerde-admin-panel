import { Building2, Check, KeyRound, LockKeyhole, Plus, ShieldCheck, UserCog, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth, type TenantType } from "../auth/AuthContext";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";

interface Tenant {
  id: string; tenantKey: string; name: string; type: TenantType; status: string;
  contact: { email: string; phone: string }; hasPrivatePolicy: boolean;
}

const emptyForm = { name: "", tenantKey: "", type: "MANUFACTURER" as TenantType, contactEmail: "", contactPhone: "", adminName: "", adminEmail: "", adminPassword: "" };

export function SettingsPage() {
  const { principal } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (principal?.tenantType === "PLATFORM") apiRequest<Tenant[]>("/tenants-list").then(setTenants).catch(reason => setError(String(reason)));
  }, [principal]);

  async function createTenant(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest("/tenants-create", { method: "POST", body: JSON.stringify(form) });
      setTenants(await apiRequest<Tenant[]>("/tenants-list"));
      setForm(emptyForm);
      setModalOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tenant oluşturulamadı.");
    } finally { setSaving(false); }
  }

  return <>
    <PageHeader eyebrow="GÜVENLİK & ERİŞİM" title="Yetki & tenant yönetimi" description="Her şirketin yalnız kendisine ait veri ve işlemlere erişmesini sağlayın." />
    <section className="security-banner"><span><ShieldCheck /></span><div><h2>Tenant izolasyonu etkin</h2><p>CPO, üretici ve taşeron firmalar birbirlerinin kimliğini, özel fiyatlarını ve iş koşullarını göremez.</p></div><strong><Check size={15} /> Korumalı</strong></section>
    <div className="settings-grid">
      <section className="panel settings-main"><div className="panel__head"><div><h2>Şirket hesapları</h2><p>Veritabanındaki aktif tenantlar</p></div><button className="button button--primary tenant-add" onClick={() => setModalOpen(true)}><Plus size={15} /> Tenant ekle</button></div>
        <div className="tenant-list">{tenants.map(tenant => <article key={tenant.id}><i>{tenant.name.split(" ").map(item => item[0]).join("").slice(0, 2)}</i><div><b>{tenant.name}</b><small>{tenant.type} · {tenant.tenantKey}</small></div><span><small>DURUM</small><b>{tenant.status === "ACTIVE" ? "Aktif" : "Askıda"}</b></span><span><small>YÖNETİCİ İLETİŞİMİ</small><b>{tenant.contact.email}</b></span><button className="text-button">Yönet</button></article>)}
          {tenants.length === 0 && <div className="empty-state"><Building2 /><b>Henüz tenant yüklenmedi</b><span>MongoDB bağlantısını ve örnek veri kurulumunu kontrol edin.</span></div>}
        </div>
      </section>
      <aside className="settings-side">
        <article className="panel permission-card"><span><LockKeyhole /></span><div><h3>Gizli ticari kurallar</h3><p>Firma özel politikaları yalnız Bakımnerde rolüne açıktır.</p></div><b>Etkin</b></article>
        <article className="panel permission-card"><span><UserCog /></span><div><h3>Rol bazlı yetkilendirme</h3><p>Platform, üretici, CPO ve taşeron rolleri ayrıdır.</p></div><b>5 rol</b></article>
        <article className="panel permission-card"><span><KeyRound /></span><div><h3>İşlem denetim kaydı</h3><p>Bakiye ve durum değişiklikleri kullanıcı bazında saklanır.</p></div><b>Aktif</b></article>
      </aside>
    </div>
    <section className="role-matrix panel"><div className="panel__head"><div><h2>Rol erişim özeti</h2><p>Tarafların panelde görebildiği alanlar</p></div><Building2 size={19} /></div><div className="matrix"><div><b>YETKİ</b><b>BAKIMNERDE</b><b>ÜRETİCİ / CPO</b><b>TAŞERON</b></div>{[["Tüm işleri görüntüleme","✓","—","—"],["Firma özel fiyatlarını yönetme","✓","—","—"],["Kendi işlerini görüntüleme","✓","✓","✓"],["Bakım kanıtı yükleme","✓","—","✓"],["Bakiye işlemi yapma","✓","—","—"]].map(row => <div key={row[0]}>{row.map((cell, index) => <span className={cell === "✓" ? "allowed" : ""} key={index}>{cell}</span>)}</div>)}</div></section>
    {modalOpen && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setModalOpen(false)} aria-label="Pencereyi kapat" /><form className="tenant-modal" onSubmit={createTenant}><div className="modal-head"><div><p className="eyebrow">YENİ ŞİRKET HESABI</p><h2>Tenant oluştur</h2><span>Şirket ve ilk yönetici hesabı birlikte oluşturulur.</span></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)}><X /></button></div>
      <div className="modal-fields"><label><span>Şirket adı</span><input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label><label><span>Tenant anahtarı</span><input required placeholder="ornek-firma" value={form.tenantKey} onChange={event => setForm({ ...form, tenantKey: event.target.value })} /></label><label><span>Şirket türü</span><select value={form.type} onChange={event => setForm({ ...form, type: event.target.value as TenantType })}><option value="MANUFACTURER">Üretici firma</option><option value="CPO">CPO firma</option><option value="CONTRACTOR">Taşeron firma</option></select></label><label><span>Telefon</span><input value={form.contactPhone} onChange={event => setForm({ ...form, contactPhone: event.target.value })} /></label><label><span>Şirket e-postası</span><input type="email" required value={form.contactEmail} onChange={event => setForm({ ...form, contactEmail: event.target.value })} /></label><label><span>Yönetici adı</span><input required value={form.adminName} onChange={event => setForm({ ...form, adminName: event.target.value })} /></label><label><span>Yönetici e-postası</span><input type="email" required value={form.adminEmail} onChange={event => setForm({ ...form, adminEmail: event.target.value })} /></label><label><span>İlk parola</span><input type="password" minLength={8} required value={form.adminPassword} onChange={event => setForm({ ...form, adminPassword: event.target.value })} /></label></div>
      {error && <div className="login-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button--outline" onClick={() => setModalOpen(false)}>Vazgeç</button><button className="button button--primary" disabled={saving}>{saving ? "Oluşturuluyor…" : "Tenant oluştur"}</button></div>
    </form></div>}
  </>;
}
