import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AppShell } from "../layouts/AppShell";
import { BalancesPage } from "../pages/BalancesPage";
import { CompaniesPage } from "../pages/CompaniesPage";
import { DashboardPage } from "../pages/DashboardPage";
import { AuditLogsPage } from "../pages/AuditLogsPage";
import { JobsPage } from "../pages/JobsPage";
import { LoginPage } from "../pages/LoginPage";
import { PricingPage } from "../pages/PricingPage";
import { SettingsPage } from "../pages/SettingsPage";

export function App() {
  return (
    <Routes>
      <Route path="giris" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route index element={<DashboardPage />} />
        <Route path="isler" element={<JobsPage />} />
        <Route path="taseronlar" element={<PlatformOnly><CompaniesPage kind="contractor" /></PlatformOnly>} />
        <Route path="cpo-firmalar" element={<PlatformOnly><CompaniesPage kind="cpo" /></PlatformOnly>} />
        <Route path="fiyatlar" element={<PlatformOnly><PricingPage /></PlatformOnly>} />
        <Route path="bakiyeler" element={<PlatformOnly><BalancesPage /></PlatformOnly>} />
        <Route path="denetim-kayitlari" element={<PlatformOnly><AuditLogsPage /></PlatformOnly>} />
        <Route path="ayarlar" element={<PlatformOnly><SettingsPage /></PlatformOnly>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function PlatformOnly({ children }: { children: React.ReactNode }) {
  const { principal } = useAuth();
  return principal?.tenantType === "PLATFORM" ? children : <Navigate to="/" replace />;
}

function RequireAuth() {
  const { principal, loading } = useAuth();
  if (loading) return <div className="app-loading"><span /><p>Güvenli oturum kontrol ediliyor…</p></div>;
  return principal ? <AppShell /> : <Navigate to="/giris" replace />;
}
