import { useEffect, useState } from "react";
import { getDistricts, TURKEY_PROVINCES } from "../../data/turkeyLocations";
import { usePreferences } from "../../app/PreferencesContext";

interface PhoneInputProps {
  label: string;
  value: string;
  onChange(value: string): void;
  required?: boolean;
}

export function PhoneInput({ label, value, onChange, required }: PhoneInputProps) {
  const { language } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
  return <label>
    <span>{label}</span>
    <input
      aria-label={label}
      autoComplete="tel-national"
      inputMode="numeric"
      maxLength={10}
      minLength={10}
      pattern="[1-9][0-9]{9}"
      placeholder="5XXXXXXXXX"
      required={required}
      title={copy("0 ile başlamayan 10 haneli telefon numarası", "A 10-digit phone number that does not start with 0")}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 10))}
    />
    <small className="field-hint">{copy("Başında 0 olmadan 10 hane", "10 digits without a leading 0")}</small>
  </label>;
}

interface LocationFieldsProps {
  city: string;
  district: string;
  onCityChange(value: string): void;
  onDistrictChange(value: string): void;
  cityLabel?: string;
  districtLabel?: string;
  required?: boolean;
}

export function LocationFields({
  city,
  district,
  onCityChange,
  onDistrictChange,
  cityLabel,
  districtLabel,
  required = true,
}: LocationFieldsProps) {
  const { language } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
  const resolvedCityLabel = cityLabel ?? copy("İl", "Province");
  const resolvedDistrictLabel = districtLabel ?? copy("İlçe", "District");
  const [districts, setDistricts] = useState<string[]>(district ? [district] : []);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!city) {
      setDistricts([]);
      setLoadFailed(false);
      return;
    }
    setLoading(true);
    setLoadFailed(false);
    void getDistricts(city)
      .then((items) => {
        if (!active) return;
        setDistricts(items);
        if (district && !items.includes(district)) onDistrictChange("");
      })
      .catch(() => {
        if (!active) return;
        setDistricts(district ? [district] : []);
        setLoadFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [city]);

  return <>
    <label>
      <span>{resolvedCityLabel}</span>
      <select
        required={required}
        value={city}
        onChange={(event) => {
          onCityChange(event.target.value);
          onDistrictChange("");
        }}
      >
        <option value="">{copy("İl seçin", "Select province")}</option>
        {TURKEY_PROVINCES.map((item) => <option value={item.name} key={item.id}>{String(item.id).padStart(2, "0")} · {item.name}</option>)}
      </select>
    </label>
    <label>
      <span>{resolvedDistrictLabel}</span>
      <select
        disabled={!city || loading || loadFailed}
        required={required}
        value={district}
        onChange={(event) => onDistrictChange(event.target.value)}
      >
        <option value="">{loading ? copy("İlçeler yükleniyor…", "Loading districts…") : loadFailed ? copy("İlçe listesi yüklenemedi", "District list could not be loaded") : copy("İlçe seçin", "Select district")}</option>
        {districts.map((item) => <option value={item} key={item}>{item}</option>)}
      </select>
      {loadFailed && <small className="field-error">{copy("İlçe servisine ulaşılamadı; tekrar deneyin.", "The district service could not be reached; please try again.")}</small>}
    </label>
  </>;
}
