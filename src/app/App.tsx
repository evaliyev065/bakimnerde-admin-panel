import { Navigate, Route, Routes } from "react-router-dom";
import { usePreferences } from "./PreferencesContext";
import { useAuth } from "../auth/AuthContext";
import { AppShell } from "../layouts/AppShell";
import { BalancesPage } from "../pages/BalancesPage";
import { CompaniesPage } from "../pages/CompaniesPage";
import { ContractorRegistrationPage } from "../pages/ContractorRegistrationPage";
import { DashboardPage } from "../pages/DashboardPage";
import { AssetsPage } from "../pages/AssetsPage";
import { AccountPage } from "../pages/AccountPage";
import { AuditLogsPage } from "../pages/AuditLogsPage";
import { JobsPage } from "../pages/JobsPage";
import { LoginPage } from "../pages/LoginPage";
import { PlatformLoginPage } from "../pages/PlatformLoginPage";
import { PricingPage } from "../pages/PricingPage";
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
      <Route path="login" element={<LoginPage />} />
      <Route path="auth/admin/login" element={<PlatformLoginPage />} />
      <Route path="contractor-registration" element={<ContractorRegistrationPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<RequireAuth />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="job-details/:jobId" element={<JobsPage />} />
        <Route path="assets" element={<PlatformOrCpo><AssetsPage /></PlatformOrCpo>} />
        <Route path="account" element={<AccountPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="contractors" element={<PlatformOnly><CompaniesPage kind="contractor" /></PlatformOnly>} />
        <Route path="cpo-companies" element={<PlatformOnly><CompaniesPage kind="cpo" /></PlatformOnly>} />
        <Route path="pricing" element={<PlatformOnly><PricingPage /></PlatformOnly>} />
        <Route path="wallet" element={<BalancesPage />} />
        <Route path="audit-logs" element={<PlatformOnly><AuditLogsPage /></PlatformOnly>} />
      </Route>
      <Route path="giris" element={<Navigate to="/login" replace />} />
      <Route path="isler" element={<Navigate to="/jobs" replace />} />
      <Route path="devices" element={<Navigate to="/assets" replace />} />
      <Route path="kullanicilar" element={<Navigate to="/users" replace />} />
      <Route path="taseronlar" element={<Navigate to="/contractors" replace />} />
      <Route path="cpo-firmalar" element={<Navigate to="/cpo-companies" replace />} />
      <Route path="fiyatlar" element={<Navigate to="/pricing" replace />} />
      <Route path="bakiyeler" element={<Navigate to="/wallet" replace />} />
      <Route path="denetim-kayitlari" element={<Navigate to="/audit-logs" replace />} />
      <Route path="ayarlar" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function PlatformOnly({ children }: { children: React.ReactNode }) {
  const { principal } = useAuth();
  return principal?.tenantType === "PLATFORM" ? children : <Navigate to="/dashboard" replace />;
}

function PlatformOrCpo({ children }: { children: React.ReactNode }) {
  const { principal } = useAuth();
  return principal?.tenantType === "PLATFORM" || principal?.tenantType === "CPO" ? children : <Navigate to="/dashboard" replace />;
}

function RequireAuth() {
  const { principal, loading } = useAuth();
  const { language } = usePreferences();
  if (loading) return <div className="app-loading"><span /><p>{language === "tr" ? "Güvenli oturum kontrol ediliyor…" : "Checking your secure session…"}</p></div>;
  return principal ? <AppShell /> : <Navigate to="/login" replace />;
}
