import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePreferences } from "../app/PreferencesContext";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";

interface AuditLog {
  id: string; action: string; resourceType: string; resourceId: string;
  actorRole: string; requestId: string; ipAddress: string; createdAt: string;
}

const actionLabels: Record<string, [string, string]> = {
  AUTH_LOGIN_SUCCEEDED: ["Oturum açıldı", "Signed in"],
  TENANT_CREATED: ["Şirket hesabı oluşturuldu", "Company account created"],
};

export function AuditLogsPage() {
  const { language, locale } = usePreferences();
  const copy = (tr: string, en: string) => language === "tr" ? tr : en;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const load = useCallback(() => {
    setLoading(true);
    apiRequest<AuditLog[]>("/audit-logs").then(setLogs).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  const visibleLogs = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return needle ? logs.filter((log) => `${actionLabel(log.action, language)} ${log.action} ${log.actorRole} ${log.resourceType} ${log.resourceId} ${log.requestId} ${log.ipAddress}`.toLocaleLowerCase(locale).includes(needle)) : logs;
  }, [language, locale, logs, query]);
  return <>
    <PageHeader eyebrow={copy("GÜVENLİK", "SECURITY")} title={copy("Denetim kayıtları", "Audit logs")} description={copy("Kim, ne zaman, hangi veride işlem yaptı: değiştirilemez operasyon günlüğü.", "An immutable operations log of who changed what and when.")} />
    <div className="toolbar"><label className="table-search"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy("Kayıtlarda ara", "Search logs")} /></label><button className="button button--outline" onClick={load}><RefreshCw size={15} /> {copy("Yenile", "Refresh")}</button></div>
    <section className="data-card"><div className="data-table audit-table"><div className="data-row data-head"><span>{copy("İŞLEM", "ACTION")}</span><span>{copy("ROL", "ROLE")}</span><span>{copy("KAYNAK", "RESOURCE")}</span><span>{copy("İSTEK KİMLİĞİ", "REQUEST ID")}</span><span>{copy("IP ADRESİ", "IP ADDRESS")}</span><span>{copy("TARİH", "DATE")}</span></div>
      {visibleLogs.map(log => <div className="data-row" key={log.id}><span className="primary-cell"><b>{actionLabel(log.action, language)}</b><small>{log.action}</small></span><span>{log.actorRole}</span><span><b>{log.resourceType}</b><small>{log.resourceId}</small></span><span>{log.requestId}</span><span>{log.ipAddress}</span><span>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.createdAt))}</span></div>)}
      {!loading && visibleLogs.length === 0 && <div className="empty-state"><ShieldCheck /><b>{copy("Kayıt bulunamadı", "No records found")}</b><span>{query ? copy("Arama ölçütünü değiştirin.", "Change the search criteria.") : copy("İlk işlemlerden sonra burada görünecek.", "Records will appear here after the first operations.")}</span></div>}
    </div></section>
  </>;
}

function actionLabel(action: string, language: "tr" | "en"): string {
  return actionLabels[action]?.[language === "tr" ? 0 : 1] ?? action;
}
