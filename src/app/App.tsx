import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../layouts/AppShell";
import { DashboardPage } from "../pages/DashboardPage";
import { PlaceholderPage } from "../pages/PlaceholderPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="is-emirleri" element={<PlaceholderPage title="İş emirleri" description="Tüm bakım operasyonlarını durum, SLA ve sorumlu ekip bazında yönetin." />} />
        <Route path="kuruluslar" element={<PlaceholderPage title="Kuruluşlar" description="Üretici ve bakım firmalarının onay, durum ve hizmet kapsamlarını yönetin." />} />
        <Route path="raporlar" element={<PlaceholderPage title="Raporlar" description="Tespit ve giderme raporlarını inceleyin, doğrulayın ve paylaşın." />} />
        <Route path="tarifeler" element={<PlaceholderPage title="Tarife yönetimi" description="Versiyonlu ücret tarifelerini hazırlayın, kontrol edin ve yayımlayın." />} />
        <Route path="ayarlar" element={<PlaceholderPage title="Sistem ayarları" description="Platform tercihlerini, bildirimleri ve entegrasyonları yapılandırın." />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
