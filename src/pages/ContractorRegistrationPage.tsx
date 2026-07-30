import { Building2, CheckCircle2, FileCheck2, ShieldCheck, Wrench } from "lucide-react";
import { useState, type FormEvent } from "react";
import { TURKEY_PROVINCES } from "../data/turkeyLocations";
import { apiRequest } from "../lib/api";
import { LocationFields, PhoneInput } from "../shared/components/FormControls";
import { Brand } from "../shared/components/Brand";

interface RegistrationForm {
  companyName: string;
  taxNumber: string;
  tradeRegistryNumber: string;
  companyEmail: string;
  companyPhone: string;
  website: string;
  authorizedName: string;
  authorizedTitle: string;
  authorizedEmail: string;
  authorizedPhone: string;
  password: string;
  city: string;
  district: string;
  address: string;
  serviceRegions: string[];
  specialties: string[];
  availabilityDays: number[];
  agreementAccepted: boolean;
}

const specialtyOptions = [
  ["PERIODIC_MAINTENANCE", "Periyodik bakım"],
  ["ELECTRICAL", "Elektrik"],
  ["ELECTRONICS", "Elektronik"],
  ["MECHANICAL", "Mekanik"],
  ["SOFTWARE", "Yazılım"],
  ["CHARGER_INSTALLATION", "Şarj cihazı kurulumu"],
] as const;
const dayOptions = [
  [1, "Pazartesi"], [2, "Salı"], [3, "Çarşamba"], [4, "Perşembe"],
  [5, "Cuma"], [6, "Cumartesi"], [7, "Pazar"],
] as const;
const initialForm: RegistrationForm = {
  companyName: "",
  taxNumber: "",
  tradeRegistryNumber: "",
  companyEmail: "",
  companyPhone: "",
  website: "",
  authorizedName: "",
  authorizedTitle: "",
  authorizedEmail: "",
  authorizedPhone: "",
  password: "",
  city: "",
  district: "",
  address: "",
  serviceRegions: [],
  specialties: [],
  availabilityDays: [1, 2, 3, 4, 5],
  agreementAccepted: false,
};

export function ContractorRegistrationPage() {
  const [form, setForm] = useState<RegistrationForm>(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [applicationNumber, setApplicationNumber] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<{ applicationNumber: string }>("/contractor-applications-create", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setApplicationNumber(result.applicationNumber);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Başvuru gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  if (applicationNumber) {
    return <main className="registration-page">
      <section className="registration-success">
        <span><CheckCircle2 /></span>
        <p className="eyebrow">BAŞVURU ALINDI</p>
        <h1>Bilgileriniz Bakımnerde ekibine ulaştı.</h1>
        <p>İnceleme tamamlandığında yetkili e-posta adresiniz üzerinden giriş yapabileceksiniz.</p>
        <div><small>Başvuru numarası</small><strong>{applicationNumber}</strong></div>
      </section>
    </main>;
  }

  return <main className="registration-page">
    <header className="registration-hero">
      <div className="registration-brand"><Brand /></div>
      <div>
        <p className="eyebrow">TAŞERON HİZMET AĞI</p>
        <h1>Bakımnerde taşeron başvurusu</h1>
        <p>Firma ve hizmet bilgilerinizi tamamlayın. Başvurunuz Bakımnerde paneline onay isteği olarak iletilsin.</p>
      </div>
      <div className="registration-domain"><ShieldCheck /><span><b>Güvenli kayıt alanı</b><small>contractor-registrations.bakimnerde.com</small></span></div>
    </header>

    <form className="registration-form" onSubmit={submit}>
      <RegistrationSection icon={<Building2 />} eyebrow="FİRMA" title="Kurumsal bilgiler">
        <Field label="Firma unvanı" value={form.companyName} set={(value) => setForm({ ...form, companyName: value })} required />
        <Field label="Vergi numarası" value={form.taxNumber} set={(value) => setForm({ ...form, taxNumber: digits(value, 10) })} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required />
        <Field label="Ticaret sicil numarası" value={form.tradeRegistryNumber} set={(value) => setForm({ ...form, tradeRegistryNumber: value })} required />
        <Field label="Firma e-postası" type="email" value={form.companyEmail} set={(value) => setForm({ ...form, companyEmail: value })} required />
        <PhoneInput label="Firma telefonu" value={form.companyPhone} onChange={(value) => setForm({ ...form, companyPhone: value })} required />
        <Field label="Web sitesi" type="url" value={form.website} set={(value) => setForm({ ...form, website: value })} placeholder="https://" />
      </RegistrationSection>

      <RegistrationSection icon={<ShieldCheck />} eyebrow="YETKİLİ" title="Yönetici hesabı">
        <Field label="Yetkili ad soyad" value={form.authorizedName} set={(value) => setForm({ ...form, authorizedName: value })} required />
        <label><span>Görevi</span><select required value={form.authorizedTitle} onChange={(event) => setForm({ ...form, authorizedTitle: event.target.value })}>
          <option value="">Görev seçin</option><option>Firma sahibi</option><option>Genel müdür</option><option>Operasyon müdürü</option><option>Teknik müdür</option><option>Diğer yetkili</option>
        </select></label>
        <Field label="Yetkili e-postası" type="email" value={form.authorizedEmail} set={(value) => setForm({ ...form, authorizedEmail: value })} required />
        <PhoneInput label="Yetkili telefonu" value={form.authorizedPhone} onChange={(value) => setForm({ ...form, authorizedPhone: value })} required />
        <Field label="İlk giriş parolası" type="password" value={form.password} set={(value) => setForm({ ...form, password: value })} minLength={8} required />
      </RegistrationSection>

      <RegistrationSection icon={<Wrench />} eyebrow="OPERASYON" title="Adres ve hizmet kapsamı">
        <LocationFields
          city={form.city}
          district={form.district}
          onCityChange={(city) => setForm((current) => ({ ...current, city, district: "" }))}
          onDistrictChange={(district) => setForm((current) => ({ ...current, district }))}
        />
        <label className="field-wide"><span>Açık adres</span><textarea required rows={3} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
        <label><span>Hizmet verilen iller</span><select multiple required value={form.serviceRegions} onChange={(event) => setForm({ ...form, serviceRegions: selectedStrings(event.currentTarget) })}>
          {TURKEY_PROVINCES.map((item) => <option value={item.name} key={item.id}>{String(item.id).padStart(2, "0")} · {item.name}</option>)}
        </select><small className="field-hint">Birden fazla seçim için Ctrl/Cmd tuşunu kullanın.</small></label>
        <label><span>Uzmanlık alanları</span><select multiple required value={form.specialties} onChange={(event) => setForm({ ...form, specialties: selectedStrings(event.currentTarget) })}>
          {specialtyOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>
        <label><span>Müsait günler</span><select multiple required value={form.availabilityDays.map(String)} onChange={(event) => setForm({ ...form, availabilityDays: selectedStrings(event.currentTarget).map(Number) })}>
          {dayOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>
      </RegistrationSection>

      <section className="registration-agreement">
        <div><FileCheck2 /><span><b>Bakımnerde Taşeronlarla Hizmet Sözleşmesi</b><small>Sürüm: 24.07.2026</small></span></div>
        <details><summary>Sözleşme özetini görüntüle</summary><p>Taşeron; verdiği bilgilerin doğruluğunu, iş sağlığı ve güvenliği yükümlülüklerini, hizmet kalitesi standartlarını, kişisel verilerin korunmasını ve Bakımnerde iş akışı kurallarını kabul eder. Nihai kayıt, Bakımnerde incelemesi ve onayıyla etkinleşir.</p></details>
        <label className="agreement-check"><input type="checkbox" required checked={form.agreementAccepted} onChange={(event) => setForm({ ...form, agreementAccepted: event.target.checked })} /><span><b>Bakımnerde Taşeronlarla Hizmet Sözleşmesi’ni okudum ve kabul ediyorum.</b><small>Bu onay olmadan başvuru tamamlanamaz.</small></span></label>
      </section>

      {error && <div className="login-error">{error}</div>}
      <button className="registration-submit" disabled={busy || !form.agreementAccepted}>{busy ? "Başvuru gönderiliyor…" : "Başvuruyu onaya gönder"}<FileCheck2 /></button>
    </form>
  </main>;
}

function RegistrationSection({ icon, eyebrow, title, children }: { icon: React.ReactNode; eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="registration-section"><header><span>{icon}</span><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></header><div className="registration-fields">{children}</div></section>;
}

function Field({ label, value, set, type = "text", required, placeholder, inputMode, pattern, maxLength, minLength }: {
  label: string; value: string; set(value: string): void; type?: string; required?: boolean; placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; pattern?: string; maxLength?: number; minLength?: number;
}) {
  return <label><span>{label}</span><input type={type} required={required} placeholder={placeholder} inputMode={inputMode} pattern={pattern} maxLength={maxLength} minLength={minLength} value={value} onChange={(event) => set(event.target.value)} /></label>;
}

function selectedStrings(select: HTMLSelectElement): string[] {
  return Array.from(select.selectedOptions, (option) => option.value);
}

function digits(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength);
}
