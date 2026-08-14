import { Bell, Languages, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { navigation } from "../app/navigation";
import { usePreferences } from "../app/PreferencesContext";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../lib/api";
import { Brand } from "../shared/components/Brand";

interface JobNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  jobId: string;
  jobNumber: string;
  createdAt: string;
  readAt: string | null;
}

interface NotificationList { items: JobNotification[]; unreadCount: number }

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("bakimnerde_sidebar") === "collapsed");
  const [jobCount, setJobCount] = useState(0);
  const [notifications, setNotifications] = useState<JobNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const knownNotificationIds = useRef<Set<string> | null>(null);
  const { principal, logout } = useAuth();
  const { language, locale, setLanguage, setTheme, t, theme } = usePreferences();
  const navigate = useNavigate();
  const loadLiveState = useCallback(async () => {
    const [summary, notificationResult] = await Promise.all([
      apiRequest<{ active: number }>("/jobs-summary"),
      apiRequest<NotificationList>("/notifications-list"),
    ]);
    setJobCount(summary.active);
    setNotifications(notificationResult.items);
    setUnreadCount(notificationResult.unreadCount);
    const unread = notificationResult.items.filter((item) => !item.readAt);
    if (knownNotificationIds.current === null) {
      knownNotificationIds.current = new Set(notificationResult.items.map((item) => item.id));
      return;
    }
    for (const item of unread) {
      if (knownNotificationIds.current.has(item.id)) continue;
      knownNotificationIds.current.add(item.id);
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(item.title, { body: item.body, tag: item.id });
      }
    }
  }, []);
  useEffect(() => {
    void loadLiveState().catch(() => undefined);
    const timer = window.setInterval(() => void loadLiveState().catch(() => undefined), 3_000);
    return () => window.clearInterval(timer);
  }, [loadLiveState]);
  const commonPaths = ["/dashboard", "/jobs", "/wallet", ...(principal?.role.endsWith("_ADMIN") ? ["/users"] : [])];
  const visibleNavigation = principal?.tenantType === "PLATFORM" ? navigation : navigation.filter((item) => [
    ...commonPaths,
    ...(principal?.tenantType === "CPO" ? ["/assets"] : []),
  ].includes(item.to));

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem("bakimnerde_sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  async function toggleNotifications() {
    setNotificationsOpen((value) => !value);
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  }

  async function readNotification(item: JobNotification) {
    if (!item.readAt) {
      await apiRequest("/notifications-read", { method: "POST", body: JSON.stringify({ id: item.id }) });
      setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
      setUnreadCount((current) => Math.max(0, current - 1));
    }
    setNotificationsOpen(false);
    navigate("/jobs");
  }
  function searchPlatform(event: FormEvent) {
    event.preventDefault();
    const search = globalQuery.trim();
    if (search) navigate(`/jobs?search=${encodeURIComponent(search)}`);
  }
  return (
    <div className={`app-shell ${sidebarCollapsed ? "app-shell--collapsed" : ""}`}>
      <aside id="app-sidebar" className={`sidebar ${menuOpen ? "sidebar--open" : ""} ${sidebarCollapsed ? "sidebar--collapsed" : ""}`}>
        <div className="sidebar__head">
          <Brand />
          <button className="icon-button sidebar__collapse" onClick={toggleSidebar} aria-controls="app-sidebar" aria-expanded={!sidebarCollapsed} aria-label={t(sidebarCollapsed ? "Menüyü genişlet" : "Menüyü daralt")}>{sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</button>
          <button className="icon-button sidebar__close" onClick={() => setMenuOpen(false)} aria-label={t("Menüyü kapat")}><X /></button>
        </div>
        <nav className="navigation" aria-label={t("Ana menü")}>
          <p className="navigation__label">{t("OPERASYON MERKEZİ")}</p>
          {visibleNavigation.map(({ label, to, icon: Icon, ...item }) => (
            <NavLink title={sidebarCollapsed ? t(label) : undefined} key={to} to={to} end={to === "/dashboard"} onClick={() => setMenuOpen(false)} className={({ isActive }) => `navigation__item ${isActive ? "is-active" : ""}`}>
              <Icon size={18} /><span>{t(label)}</span>{"badge" in item && <span className="navigation__badge">{jobCount}</span>}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="sidebar-profile" aria-label={t("Sidebar profilini aç")} title={sidebarCollapsed ? principal?.name : undefined} onClick={() => { setMenuOpen(false); navigate("/account"); }}>
          <span className="avatar">{principal?.name.split(" ").map(item => item[0]).join("").slice(0, 2)}</span>
          <span className="sidebar-profile__copy"><small>{t("Profil")}</small><strong>{principal?.name}</strong><span>{principal?.tenantName}</span></span>
        </button>
      </aside>
      {menuOpen && <button className="backdrop" onClick={() => setMenuOpen(false)} aria-label={t("Menüyü kapat")} />}
      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-controls="app-sidebar" aria-expanded={menuOpen} aria-label={t("Menüyü aç")}><Menu /></button>
          <form className="search" role="search" onSubmit={searchPlatform}>
            <button className="search__submit" aria-label={t("Ara")}><Search size={18} /></button>
            <input type="search" aria-label={t("Platformda ara")} value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder={t("İş, firma, istasyon veya cihaz ara…")} />
          </form>
          <div className="topbar__actions">
            <button className="icon-button preference-button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={t(theme === "light" ? "Koyu temaya geç" : "Açık temaya geç")}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>
            <button className="icon-button preference-button language-button" onClick={() => setLanguage(language === "tr" ? "en" : "tr")} aria-label={t(language === "tr" ? "Dili İngilizce yap" : "Dili Türkçe yap")}><Languages size={18} /><span>{language.toLocaleUpperCase("en-US")}</span></button>
            <div className="notification-wrap">
              <button className={`icon-button notification ${unreadCount > 0 ? "has-unread" : ""}`} aria-label={`${t("Bildirimler")}${unreadCount ? `, ${unreadCount} ${t("okunmamış")}` : ""}`} onClick={() => void toggleNotifications()}><Bell size={20} />{unreadCount > 0 && <span>{unreadCount > 99 ? "99+" : unreadCount}</span>}</button>
              {notificationsOpen && <section className="notification-panel">
                <div><b>{t("Bildirimler")}</b><small>{unreadCount} {t("okunmamış")}</small></div>
                {notifications.length === 0 && <p>{t("Yeni bildiriminiz yok.")}</p>}
                {notifications.map((item) => <button className={item.readAt ? "" : "is-unread"} key={item.id} onClick={() => void readNotification(item)}><strong>{item.title}</strong><span>{item.body}</span><time>{new Date(item.createdAt).toLocaleString(locale)}</time></button>)}
              </section>}
            </div>
            <button type="button" className="profile" onClick={() => navigate("/account")} aria-label={t("Hesap yönetimine git")}><span className="avatar">{principal?.name.split(" ").map(item => item[0]).join("").slice(0, 2)}</span><span className="profile__copy"><strong>{principal?.name}</strong><small>{principal?.tenantName}</small></span></button>
            <button className="icon-button logout-button" onClick={logout} aria-label={t("Oturumu kapat")}><LogOut size={18} /></button>
          </div>
        </header>
        <main className="main"><Outlet /></main>
      </div>
    </div>
  );
}
