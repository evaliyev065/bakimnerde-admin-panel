import { Building2, CheckCircle2, FileCheck2, ShieldCheck, Wrench } from "lucide-react";
import { useState, type FormEvent } from "react";
import { usePreferences } from "../app/PreferencesContext";
import { TURKEY_PROVINCES } from "../data/turkeyLocations";
import { apiRequest } from "../lib/api";
import { LocationFields, PhoneInput } from "../shared/components/FormControls";
import { Brand } from "../shared/components/Brand";
import { PublicPreferences } from "../shared/components/PublicPreferences";

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
  ["PERIODIC_MAINTENANCE", "Periyodik bakım", "Periodic maintenance"],
  ["ELECTRICAL", "Elektrik", "Electrical"],
  ["ELECTRONICS", "Elektronik", "Electronics"],
  ["MECHANICAL", "Mekanik", "Mechanical"],
  ["SOFTWARE", "Yazılım", "Software"],
  ["CHARGER_INSTALLATION", "Şarj cihazı kurulumu", "Charging device installation"],
] as const;
const dayOptions = [
  [1, "Pazartesi", "Monday"], [2, "Salı", "Tuesday"], [3, "Çarşamba", "Wednesday"], [4, "Perşembe", "Thursday"],
  [5, "Cuma", "Friday"], [6, "Cumartesi", "Saturday"], [7, "Pazar", "Sunday"],
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
  const { language, locale } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
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
      setError(reason instanceof Error ? reason.message : copy("Başvuru gönderilemedi.", "The application could not be submitted."));
    } finally {
      setBusy(false);
    }
  }

  if (applicationNumber) {
    return <main className="registration-page">
      <PublicPreferences />
      <section className="registration-success">
        <span><CheckCircle2 aria-hidden="true" /></span>
        <p className="eyebrow">{copy("BAŞVURU ALINDI", "APPLICATION RECEIVED")}</p>
        <h1>{copy("Bilgileriniz Bakımnerde ekibine ulaştı.", "Your information has reached the Bakımnerde team.")}</h1>
        <p>{copy("İnceleme tamamlandığında yetkili e-posta adresiniz üzerinden giriş yapabileceksiniz.", "Once the review is complete, you will be able to sign in with your authorized email address.")}</p>
        <div><small>{copy("Başvuru numarası", "Application number")}</small><strong>{applicationNumber}</strong></div>
      </section>
    </main>;
  }

  return <main className="registration-page">
    <PublicPreferences />
    <header className="registration-hero">
      <div className="registration-brand"><Brand /></div>
      <div>
        <p className="eyebrow">{copy("TAŞERON HİZMET AĞI", "TECHNICAL SERVICE NETWORK")}</p>
        <h1>{copy("Bakımnerde taşeron başvurusu", "Bakımnerde technical service application")}</h1>
        <p>{copy("Firma ve hizmet bilgilerinizi tamamlayın. Başvurunuz Bakımnerde paneline onay isteği olarak iletilsin.", "Complete your company and service details. Your application will be sent to the Bakımnerde panel for approval.")}</p>
      </div>
      <div className="registration-domain"><ShieldCheck aria-hidden="true" /><span><b>{copy("Güvenli kayıt alanı", "Secure registration area")}</b><small>contractor-registrations.bakimnerde.com</small></span></div>
    </header>

    <form className="registration-form" onSubmit={submit} aria-label={copy("Taşeron hizmet ağı başvuru formu", "Technical service network application form")}>
      <RegistrationSection icon={<Building2 aria-hidden="true" />} eyebrow={copy("FİRMA", "COMPANY")} title={copy("Kurumsal bilgiler", "Company information")}>
        <Field label={copy("Firma unvanı", "Company name")} value={form.companyName} set={(value) => setForm({ ...form, companyName: value })} required />
        <Field label={copy("Vergi numarası", "Tax number")} value={form.taxNumber} set={(value) => setForm({ ...form, taxNumber: digits(value, 10) })} inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required />
        <Field label={copy("Ticaret sicil numarası", "Trade registry number")} value={form.tradeRegistryNumber} set={(value) => setForm({ ...form, tradeRegistryNumber: value })} required />
        <Field label={copy("Firma e-postası", "Company email")} type="email" value={form.companyEmail} set={(value) => setForm({ ...form, companyEmail: value })} required />
        <PhoneInput label={copy("Firma telefonu", "Company phone")} value={form.companyPhone} onChange={(value) => setForm({ ...form, companyPhone: value })} required />
        <Field label={copy("Web sitesi", "Website")} type="url" value={form.website} set={(value) => setForm({ ...form, website: value })} placeholder="https://" />
      </RegistrationSection>

      <RegistrationSection icon={<ShieldCheck aria-hidden="true" />} eyebrow={copy("YETKİLİ", "AUTHORIZED PERSON")} title={copy("Yönetici hesabı", "Manager account")}>
        <Field label={copy("Yetkili ad soyad", "Authorized person's full name")} value={form.authorizedName} set={(value) => setForm({ ...form, authorizedName: value })} required />
        <label><span>{copy("Görevi", "Title")}</span><select required value={form.authorizedTitle} onChange={(event) => setForm({ ...form, authorizedTitle: event.target.value })}>
          <option value="">{copy("Görev seçin", "Select a title")}</option>
          <option value="Firma sahibi">{copy("Firma sahibi", "Company owner")}</option>
          <option value="Genel müdür">{copy("Genel müdür", "General manager")}</option>
          <option value="Operasyon müdürü">{copy("Operasyon müdürü", "Operations manager")}</option>
          <option value="Teknik müdür">{copy("Teknik müdür", "Technical manager")}</option>
          <option value="Diğer yetkili">{copy("Diğer yetkili", "Other authorized person")}</option>
        </select></label>
        <Field label={copy("Yetkili e-postası", "Authorized person's email")} type="email" value={form.authorizedEmail} set={(value) => setForm({ ...form, authorizedEmail: value })} required />
        <PhoneInput label={copy("Yetkili telefonu", "Authorized person's phone")} value={form.authorizedPhone} onChange={(value) => setForm({ ...form, authorizedPhone: value })} required />
        <Field label={copy("İlk giriş parolası", "Initial sign-in password")} type="password" value={form.password} set={(value) => setForm({ ...form, password: value })} minLength={8} required />
      </RegistrationSection>

      <RegistrationSection icon={<Wrench aria-hidden="true" />} eyebrow={copy("OPERASYON", "OPERATIONS")} title={copy("Adres ve hizmet kapsamı", "Address and service coverage")}>
        <LocationFields
          city={form.city}
          district={form.district}
          cityLabel={copy("İl", "Province")}
          districtLabel={copy("İlçe", "District")}
          onCityChange={(city) => setForm((current) => ({ ...current, city, district: "" }))}
          onDistrictChange={(district) => setForm((current) => ({ ...current, district }))}
        />
        <label className="field-wide"><span>{copy("Açık adres", "Full address")}</span><textarea required rows={3} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
        <label><span>{copy("Hizmet verilen iller", "Provinces served")}</span><select multiple required value={form.serviceRegions} onChange={(event) => setForm({ ...form, serviceRegions: selectedStrings(event.currentTarget) })}>
          {TURKEY_PROVINCES.map((item) => <option value={item.name} key={item.id}>{String(item.id).padStart(2, "0")} · {item.name}</option>)}
        </select><small className="field-hint">{copy("Birden fazla seçim için Ctrl/Cmd tuşunu kullanın.", "Use Ctrl/Cmd to select more than one option.")}</small></label>
        <label><span>{copy("Uzmanlık alanları", "Areas of expertise")}</span><select multiple required value={form.specialties} onChange={(event) => setForm({ ...form, specialties: selectedStrings(event.currentTarget) })}>
          {specialtyOptions.map(([value, tr, en]) => <option value={value} key={value}>{language === "tr" ? tr : en}</option>)}
        </select></label>
        <label><span>{copy("Müsait günler", "Available days")}</span><select multiple required value={form.availabilityDays.map(String)} onChange={(event) => setForm({ ...form, availabilityDays: selectedStrings(event.currentTarget).map(Number) })}>
          {dayOptions.map(([value, tr, en]) => <option value={value} key={value}>{language === "tr" ? tr : en}</option>)}
        </select></label>
      </RegistrationSection>

      <section className="registration-agreement">
        <div><FileCheck2 aria-hidden="true" /><span><b>{copy("Bakımnerde Taşeronlarla Hizmet Sözleşmesi", "Bakımnerde Technical Service Agreement")}</b><small>{copy("Sürüm", "Version")}: {new Intl.DateTimeFormat(locale).format(new Date(2026, 6, 24))}</small></span></div>
        <details>
          <summary>{copy("Sözleşme özetini görüntüle", "View the agreement summary")}</summary>
          <p>{copy(
            "Taşeron; verdiği bilgilerin doğruluğunu, iş sağlığı ve güvenliği yükümlülüklerini, hizmet kalitesi standartlarını, kişisel verilerin korunmasını ve Bakımnerde iş akışı kurallarını kabul eder. Nihai kayıt, Bakımnerde incelemesi ve onayıyla etkinleşir.",
            "The technical service company accepts responsibility for the accuracy of its information, occupational health and safety obligations, service quality standards, personal data protection and Bakımnerde workflow rules. Final registration becomes active after Bakımnerde review and approval.",
          )}</p>
        </details>
        <label className="agreement-check"><input type="checkbox" required checked={form.agreementAccepted} onChange={(event) => setForm({ ...form, agreementAccepted: event.target.checked })} /><span><b>{copy("Bakımnerde Taşeronlarla Hizmet Sözleşmesi’ni okudum ve kabul ediyorum.", "I have read and accept the Bakımnerde Technical Service Agreement.")}</b><small>{copy("Bu onay olmadan başvuru tamamlanamaz.", "The application cannot be completed without this approval.")}</small></span></label>
      </section>

      {error && <div className="login-error" role="alert">{error}</div>}
      <button className="registration-submit" disabled={busy || !form.agreementAccepted}>{busy ? copy("Başvuru gönderiliyor…", "Submitting application…") : copy("Başvuruyu onaya gönder", "Submit application for approval")}<FileCheck2 aria-hidden="true" /></button>
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
