import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Clock,
  Globe,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Activity,
  Bell,
  Check,
} from "lucide-react";
import { request } from "../lib/request";
import type { Notification } from "../types/api";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/articles", icon: FileText, label: "Articles" },
  { to: "/sessions", icon: Clock, label: "Reading Sessions" },
  { to: "/websites", icon: Globe, label: "Websites" },
];

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  async function loadNotifications() {
    try {
      setNotifications(await request<Notification[]>("/notifications"));
    } catch {}
  }

  async function markRead(notification: Notification) {
    if (notification.isRead) return;

    try {
      const updated = await request<Notification>(`/notifications/${notification.id}/read`, {
        method: "PATCH",
      });
      setNotifications((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch {}
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function handleLogout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } finally {
      navigate("/");
    }
  }

  return (
    <div className="flex h-full" style={{ background: "var(--background)" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 border-r transition-all duration-200"
        style={{
          width: collapsed ? 56 : 220,
          borderColor: "var(--border)",
          background: "var(--card)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-3.5 h-12 border-b flex-shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center"
            style={{ background: "var(--primary)" }}
          >
            <Activity size={13} color="white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-[13px] tracking-tight truncate" style={{ color: "var(--foreground)" }}>
              NewsTracker
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto scroll-hidden">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 mx-1.5 my-0.5 px-2.5 py-2 rounded text-[13px] transition-colors cursor-pointer ${
                  isActive ? "bg-[#1d2d3e] text-[#60a5fa]" : "hover:bg-[#1c1c1f] text-[#a1a1aa] hover:text-[#f4f4f5]"
                }`
              }
            >
              <Icon size={15} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2 w-full px-3.5 py-3 text-[12px] transition-colors hover:bg-[#1c1c1f]"
            style={{ color: "var(--muted-foreground)" }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            {!collapsed && <span>Collapse sidebar</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header
          className="flex items-center justify-between h-12 px-5 border-b flex-shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-[14px] font-semibold" style={{ color: "var(--foreground)" }}>
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => {
                  const open = !notificationOpen;
                  setNotificationOpen(open);
                  if (open) loadNotifications();
                }}
                className="relative flex items-center justify-center w-8 h-8 rounded transition-colors hover:bg-[#1c1c1f]"
                style={{ color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
              >
                <Bell size={14} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] flex items-center justify-center" style={{ background: "#ef4444", color: "white" }}>{unreadCount}</span>}
              </button>
              {notificationOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-80 rounded border shadow-lg z-50" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
                  <div className="px-3 py-2.5 border-b text-[12px] font-semibold" style={{ borderColor: "var(--border)" }}>Notifications</div>
                  <div className="max-h-80 overflow-auto">
                    {notifications.length === 0 ? (
                      <p className="px-3 py-5 text-center text-[11px]" style={{ color: "var(--muted-foreground)" }}>No notifications</p>
                    ) : notifications.map((notification) => (
                      <div key={notification.id} className="flex gap-2 px-3 py-3 border-b last:border-b-0" style={{ borderColor: "var(--border)", background: notification.isRead ? "transparent" : "#181b20" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] leading-5">{notification.message}</p>
                          <p className="font-mono text-[9px] mt-1" style={{ color: "var(--muted-foreground)" }}>{new Date(notification.createdAt).toLocaleString("en-GB")}</p>
                        </div>
                        {!notification.isRead && (
                          <button onClick={() => markRead(notification)} title="Mark as read" className="self-start p-1 rounded hover:bg-[#252529]" style={{ color: "#4ade80" }}><Check size={12} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Date label */}
            <span className="font-mono text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              {new Date().toLocaleDateString("en-GB")}
            </span>
            {/* Admin menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[12px] transition-colors hover:bg-[#1c1c1f]"
                style={{ color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
              >
                <User size={13} />
                <span>Admin</span>
              </button>
              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 rounded border shadow-lg z-50 min-w-[140px]"
                  style={{ background: "var(--card)", borderColor: "var(--border)" }}
                >
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-[12px] transition-colors hover:bg-[#1c1c1f]"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    <LogOut size={12} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto scroll-hidden p-5">{children}</main>
      </div>
    </div>
  );
}
