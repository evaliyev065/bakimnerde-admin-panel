import { Bell, ChevronDown, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { navigation } from "../app/navigation";
import { Brand } from "../shared/components/Brand";

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__head"><Brand /><button className="icon-button sidebar__close" onClick={() => setMenuOpen(false)} aria-label="Menüyü kapat"><X /></button></div>
        <nav className="navigation" aria-label="Ana menü">
          <p className="navigation__label">OPERASYON</p>
          {navigation.map(({ label, to, icon: Icon, ...item }) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={() => setMenuOpen(false)} className={({ isActive }) => `navigation__item ${isActive ? "is-active" : ""}`}>
              <Icon size={19} /><span>{label}</span>{"badge" in item && <span className="navigation__badge">{item.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__support">
          <span className="status-dot" />
          <div><strong>Sistemler aktif</strong><small>Son kontrol 1 dk önce</small></div>
        </div>
      </aside>
      {menuOpen && <button className="backdrop" onClick={() => setMenuOpen(false)} aria-label="Menüyü kapat" />}
      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Menüyü aç"><Menu /></button>
          <label className="search"><Search size={18} /><input aria-label="Platformda ara" placeholder="İş emri, istasyon veya kuruluş ara…" /><kbd>⌘ K</kbd></label>
          <div className="topbar__actions">
            <button className="icon-button notification" aria-label="Bildirimler"><Bell size={20} /><span /></button>
            <button className="profile"><span className="avatar">EA</span><span className="profile__copy"><strong>Elif Arslan</strong><small>Sistem Yöneticisi</small></span><ChevronDown size={16} /></button>
          </div>
        </header>
        <main className="main"><Outlet /></main>
      </div>
    </div>
  );
}
