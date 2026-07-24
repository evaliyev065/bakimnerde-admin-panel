import { Bell, HelpCircle, LogOut, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { navigation } from "../app/navigation";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../shared/components/Brand";

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { principal, logout } = useAuth();
  const visibleNavigation = principal?.tenantType === "PLATFORM" ? navigation : navigation.filter(item => ["/", "/isler"].includes(item.to));
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__head">
          <Brand />
          <button className="icon-button sidebar__close" onClick={() => setMenuOpen(false)} aria-label="Menüyü kapat"><X /></button>
        </div>
        <nav className="navigation" aria-label="Ana menü">
          <p className="navigation__label">OPERASYON MERKEZİ</p>
          {visibleNavigation.map(({ label, to, icon: Icon, ...item }) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={() => setMenuOpen(false)} className={({ isActive }) => `navigation__item ${isActive ? "is-active" : ""}`}>
              <Icon size={18} /><span>{label}</span>{"badge" in item && <span className="navigation__badge">{item.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__tenant">
          <span>AKTİF TENANT</span>
          <strong>{principal?.tenantName}</strong>
          <small>{principal?.tenantType === "PLATFORM" ? "Platform yöneticisi" : "Şirket tenantı"}</small>
        </div>
        <div className="sidebar__support"><span className="status-dot" /><div><strong>Sistemler aktif</strong><small>MongoDB · sağlıklı</small></div></div>
      </aside>
      {menuOpen && <button className="backdrop" onClick={() => setMenuOpen(false)} aria-label="Menüyü kapat" />}
      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Menüyü aç"><Menu /></button>
          <label className="search"><Search size={18} /><input aria-label="Platformda ara" placeholder="İş, firma, istasyon veya cihaz ara…" /><kbd>⌘ K</kbd></label>
          <div className="topbar__actions">
            <button className="icon-button help" aria-label="Yardım"><HelpCircle size={19} /></button>
            <button className="icon-button notification" aria-label="Bildirimler"><Bell size={20} /><span /></button>
            <div className="profile"><span className="avatar">{principal?.name.split(" ").map(item => item[0]).join("").slice(0, 2)}</span><span className="profile__copy"><strong>{principal?.name}</strong><small>{principal?.tenantName}</small></span></div>
            <button className="icon-button logout-button" onClick={logout} aria-label="Oturumu kapat"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="main"><Outlet /></main>
      </div>
    </div>
  );
}
