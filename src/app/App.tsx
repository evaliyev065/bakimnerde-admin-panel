import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AppShell } from "../layouts/AppShell";
import { BalancesPage } from "../pages/BalancesPage";
import { CompaniesPage } from "../pages/CompaniesPage";
import { ContractorRegistrationPage } from "../pages/ContractorRegistrationPage";
import { DashboardPage } from "../pages/DashboardPage";
import { AuditLogsPage } from "../pages/AuditLogsPage";
import { JobsPage } from "../pages/JobsPage";
import { LoginPage } from "../pages/LoginPage";
import { PlatformLoginPage } from "../pages/PlatformLoginPage";
import { PricingPage } from "../pages/PricingPage";
import { SettingsPage } from "../pages/SettingsPage";
import { UserManagementPage } from "../pages/UserManagementPage";

export function App() {
  if (window.location.hostname.toLocaleLowerCase("en-US") === "contractor-registrations.bakimnerde.com") {
    return <Routes>
      <Route index element={<ContractorRegistrationPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>;
  }
  return (
    <Routes>
      <Route path="giris" element={<LoginPage />} />
      <Route path="auth/admin/login" element={<PlatformLoginPage />} />
      <Route path="contractor-registration" element={<ContractorRegistrationPage />} />
      <Route element={<RequireAuth />}>
        <Route index element={<DashboardPage />} />
        <Route path="isler" element={<JobsPage />} />
        <Route path="kullanicilar" element={<UserManagementPage />} />
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
