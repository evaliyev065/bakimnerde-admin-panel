import { RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../shared/components/PageHeader";

interface AuditLog {
  id: string; action: string; resourceType: string; resourceId: string;
  actorRole: string; requestId: string; ipAddress: string; createdAt: string;
}

const actionLabels: Record<string, string> = {
  AUTH_LOGIN_SUCCEEDED: "Oturum açıldı",
  TENANT_CREATED: "Şirket hesabı oluşturuldu",
};

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const load = useCallback(() => {
    setLoading(true);
    apiRequest<AuditLog[]>("/audit-logs").then(setLogs).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  const visibleLogs = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return needle ? logs.filter((log) => `${actionLabels[log.action] ?? log.action} ${log.action} ${log.actorRole} ${log.resourceType} ${log.resourceId} ${log.requestId} ${log.ipAddress}`.toLocaleLowerCase("tr-TR").includes(needle)) : logs;
  }, [logs, query]);
  return <>
    <PageHeader eyebrow="GÜVENLİK" title="Denetim kayıtları" description="Kim, ne zaman, hangi veride işlem yaptı: değiştirilemez operasyon günlüğü." />
    <div className="toolbar"><label className="table-search"><Search size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kayıtlarda ara" /></label><button className="button button--outline" onClick={load}><RefreshCw size={15} /> Yenile</button></div>
    <section className="data-card"><div className="data-table audit-table"><div className="data-row data-head"><span>İŞLEM</span><span>ROL</span><span>KAYNAK</span><span>İSTEK KİMLİĞİ</span><span>IP ADRESİ</span><span>TARİH</span></div>
      {visibleLogs.map(log => <div className="data-row" key={log.id}><span className="primary-cell"><b>{actionLabels[log.action] ?? log.action}</b><small>{log.action}</small></span><span>{log.actorRole}</span><span><b>{log.resourceType}</b><small>{log.resourceId}</small></span><span>{log.requestId}</span><span>{log.ipAddress}</span><span>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(log.createdAt))}</span></div>)}
      {!loading && visibleLogs.length === 0 && <div className="empty-state"><ShieldCheck /><b>Kayıt bulunamadı</b><span>{query ? "Arama ölçütünü değiştirin." : "İlk işlemlerden sonra burada görünecek."}</span></div>}
    </div></section>
  </>;
}
