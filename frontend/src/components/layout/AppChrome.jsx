import React, { useState, useEffect } from "react";
import Badge from "../ui/Badge.jsx";
import DropdownMenu from "../ui/DropdownMenu.jsx";
import Icon from "../ui/Icons.jsx";

const roleDescriptions = {
  ADMIN: "Full Admin Access",
  STAFF: "Operations Manager",
  CUSTOMER: "Client Dashboard",
};

const iconMapping = {
  dashboard: "dashboard",
  products: "products",
  orders: "orders",
  customers: "customers",
  reports: "reports",
  settings: "settings",
  profile: "profile",
};

export default function AppChrome({
  navigation = [],
  activeView,
  onNavigate,
  currentUser,
  role,
  searchValue = "",
  searchPlaceholder = "Search SKU, products, orders...",
  onSearchChange,
  notifications = [],
  onNotificationRead,
  onNotificationClearAll,
  onAssistantTrigger,
  onCommandPaletteTrigger,
  onProfile,
  onLogout,
  children,
}) {
  // Theme logic state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  // Mobile menu drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  // Notification center popup open state
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="app-shell" style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)" }}>
      {/* Sidebar Navigation Panel (Desktop) */}
      <aside className="sidebar desktop-sidebar" style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", padding: "24px 20px 20px" }}>
        
        {/* Brand Block Logo */}
        <div className="brand-block" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <div className="brand-mark" style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            color: "#fff",
            fontFamily: "Space Grotesk, sans-serif",
            fontWeight: "700",
            fontSize: "20px",
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 8px 20px var(--accent-soft)"
          }}>
            SF
          </div>
          <div>
            <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "18px", color: "var(--text)", margin: 0, letterSpacing: "-0.01em" }}>StockFlow</h1>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>Operations Console</p>
          </div>
        </div>

        {/* Primary Sidebar Nav */}
        <nav className="sidebar-nav" aria-label="Primary navigation" style={{ display: "grid", gap: "6px" }}>
          {navigation.map((item) => {
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={["nav-item", isActive ? "nav-item--active" : ""].filter(Boolean).join(" ")}
                onClick={() => {
                  onNavigate(item.key);
                  setMobileMenuOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: isActive ? "1px solid var(--border-strong)" : "1px solid transparent",
                  background: isActive ? "var(--surface-soft)" : "transparent",
                  color: "var(--text)",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon
                    name={iconMapping[item.key] || "dashboard"}
                    className="w-5 h-5"
                    style={{
                      color: isActive ? "var(--accent)" : "var(--muted)",
                      opacity: isActive ? 1 : 0.7,
                      transition: "color 0.2s"
                    }}
                  />
                  <span style={{ fontWeight: isActive ? "700" : "500", fontSize: "14px" }}>{item.label}</span>
                </div>
                {item.badge ? (
                  <Badge tone={item.badgeTone || "neutral"} style={{ fontSize: "10px", padding: "2px 6px" }}>
                    {item.badge}
                  </Badge>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer User & Role Info */}
        <div className="sidebar-footer" style={{ marginTop: "auto", paddingTop: "18px", borderTop: "1px solid var(--border)", display: "grid", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #e6e0d6, #be673b)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: "700",
              fontSize: "14px",
              boxShadow: "var(--shadow-soft)"
            }}>
              {(currentUser?.full_name || currentUser?.username || "U")[0].toUpperCase()}
            </div>
            <div className="sidebar-user" style={{ display: "grid", gap: "2px" }}>
              <strong style={{ fontSize: "13px", color: "var(--text)", fontWeight: "700" }}>
                {currentUser?.full_name || currentUser?.username}
              </strong>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {currentUser?.email}
              </span>
            </div>
          </div>
          <Badge
            tone={role === "ADMIN" ? "success" : role === "STAFF" ? "warning" : "neutral"}
            style={{
              justifyContent: "center",
              fontWeight: "700",
              fontSize: "11px",
              padding: "6px",
              borderRadius: "8px"
            }}
          >
            {roleDescriptions[role] || role}
          </Badge>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
            zIndex: 999,
          }}
        />
      )}

      {/* Mobile Sidebar Navigation Drawer */}
      <aside 
        className="sidebar mobile-sidebar" 
        style={{ 
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          width: "280px",
          background: "var(--surface)", 
          borderRight: "1px solid var(--border)", 
          display: "flex", 
          flexDirection: "column", 
          padding: "24px 20px 20px",
          zIndex: 1000,
          transform: mobileMenuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <div className="brand-block" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="brand-mark" style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
              color: "#fff",
              fontFamily: "Space Grotesk, sans-serif",
              fontWeight: "700",
              fontSize: "20px",
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 8px 20px var(--accent-soft)"
            }}>
              SF
            </div>
            <div>
              <h1 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "18px", color: "var(--text)", margin: 0, letterSpacing: "-0.01em" }}>StockFlow</h1>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>Operations Console</p>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} style={{ padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", cursor: "pointer" }}>
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Mobile navigation" style={{ display: "grid", gap: "6px" }}>
          {navigation.map((item) => {
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={["nav-item", isActive ? "nav-item--active" : ""].filter(Boolean).join(" ")}
                onClick={() => {
                  onNavigate(item.key);
                  setMobileMenuOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: isActive ? "1px solid var(--border-strong)" : "1px solid transparent",
                  background: isActive ? "var(--surface-soft)" : "transparent",
                  color: "var(--text)",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon
                    name={iconMapping[item.key] || "dashboard"}
                    className="w-5 h-5"
                    style={{
                      color: isActive ? "var(--accent)" : "var(--muted)",
                      opacity: isActive ? 1 : 0.7,
                      transition: "color 0.2s"
                    }}
                  />
                  <span style={{ fontWeight: isActive ? "700" : "500", fontSize: "14px" }}>{item.label}</span>
                </div>
                {item.badge ? (
                  <Badge tone={item.badgeTone || "neutral"} style={{ fontSize: "10px", padding: "2px 6px" }}>
                    {item.badge}
                  </Badge>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={{ marginTop: "auto", paddingTop: "18px", borderTop: "1px solid var(--border)", display: "grid", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #e6e0d6, #be673b)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: "700",
              fontSize: "14px",
              boxShadow: "var(--shadow-soft)"
            }}>
              {(currentUser?.full_name || currentUser?.username || "U")[0].toUpperCase()}
            </div>
            <div className="sidebar-user" style={{ display: "grid", gap: "2px" }}>
              <strong style={{ fontSize: "13px", color: "var(--text)", fontWeight: "700" }}>
                {currentUser?.full_name || currentUser?.username}
              </strong>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                {currentUser?.email}
              </span>
            </div>
          </div>
          <Badge
            tone={role === "ADMIN" ? "success" : role === "STAFF" ? "warning" : "neutral"}
            style={{
              justifyContent: "center",
              fontWeight: "700",
              fontSize: "11px",
              padding: "6px",
              borderRadius: "8px"
            }}
          >
            {roleDescriptions[role] || role}
          </Badge>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="chrome-main" style={{ display: "grid", gridTemplateRows: "auto 1fr" }}>
        
        {/* Top bar header */}
        <header className="topbar" style={{ background: "var(--topbar-bg)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", gap: "12px" }}>
          
          {/* Hamburger Menu on Mobile */}
          <button 
            className="mobile-menu-trigger" 
            onClick={() => setMobileMenuOpen(true)}
            style={{
              display: "none",
              padding: "10px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              cursor: "pointer",
            }}
          >
            <Icon name="menu" className="w-5 h-5" />
          </button>

          {/* Global High Polish Search Input */}
          <div className="topbar-search-wrap" style={{ flex: 1, maxWidth: "420px", position: "relative" }}>
            <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--muted)" }}>
              <Icon name="search" className="w-5 h-5" />
            </div>
            <input
              className="ui-input topbar-search-input"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              onClick={onCommandPaletteTrigger}
              placeholder={searchPlaceholder}
              style={{ paddingLeft: "42px", paddingRight: "64px", height: "42px", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", width: "100%", cursor: "pointer" }}
            />
            <div 
              onClick={onCommandPaletteTrigger}
              style={{ 
                position: "absolute", 
                right: "10px", 
                top: "50%", 
                transform: "translateY(-50%)", 
                pointerEvents: "auto", 
                color: "var(--muted)", 
                fontSize: "11px", 
                fontWeight: "700", 
                background: "var(--surface-soft)", 
                padding: "2px 6px", 
                borderRadius: "6px", 
                border: "1px solid var(--border-strong)",
                cursor: "pointer",
                userSelect: "none"
              }}
            >
              Ctrl+K
            </div>
          </div>

          {/* User Controls, Dark Mode Switcher & Alert Notifications */}
          <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            
            {/* Smooth Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="ui-button ui-button--secondary"
              style={{
                width: "42px",
                height: "42px",
                minHeight: "42px",
                padding: 0,
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                boxShadow: "var(--shadow-soft)"
              }}
              title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
            >
              <Icon name={theme === "light" ? "moon" : "sun"} className="w-5 h-5" style={{ color: "var(--accent)" }} />
            </button>

            {/* Operations Assistant Trigger */}
            <button
              onClick={onAssistantTrigger}
              className="ui-button ui-button--secondary assistant-button"
              style={{
                height: "42px",
                minHeight: "42px",
                padding: "0 14px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "var(--shadow-soft)",
              }}
              title="Open Operations Assistant"
            >
              <Icon name="sparkles" className="w-5 h-5" style={{ color: "var(--accent)" }} />
              <span className="assistant-text" style={{ fontSize: "13px", fontWeight: "700", color: "var(--text)" }}>Assistant</span>
            </button>

            {/* Notification Drawer Trigger */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowNotifications(prev => !prev)}
                className="topbar-notification"
                style={{
                  height: "42px",
                  minHeight: "42px",
                  padding: "0 14px",
                  borderRadius: "12px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-soft)",
                  position: "relative"
                }}
              >
                <Icon name="bell" className="w-5 h-5" style={{ color: "var(--text)" }} />
                <span className="alerts-text" style={{ fontSize: "13px", fontWeight: "700", color: "var(--text)" }}>Alerts</span>
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "var(--danger)",
                    border: "2px solid var(--surface)",
                    boxShadow: "0 0 8px var(--danger)"
                  }} />
                )}
              </button>

              {/* High-Fidelity Glassmorphic Notification Dropdown Popup */}
              {showNotifications && (
                <div
                  className="dropdown-menu dropdown-menu--right"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "320px",
                    background: "var(--surface)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "16px",
                    boxShadow: "var(--shadow)",
                    padding: "12px",
                    zIndex: 100,
                    display: "grid",
                    gap: "8px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                    <strong style={{ fontSize: "14px", color: "var(--text)" }}>Operational Alerts</strong>
                    {notifications.filter(n => !n.is_read).length > 0 && (
                      <span style={{ fontSize: "11px", color: "#fff", background: "var(--danger)", padding: "2px 6px", borderRadius: "999px", fontWeight: "700" }}>
                        {notifications.filter(n => !n.is_read).length} new
                      </span>
                    )}
                  </div>
                  <div style={{ display: "grid", gap: "6px", maxHeight: "240px", overflowY: "auto", paddingRight: "4px" }}>
                    {notifications.length > 0 ? (
                      notifications.map((notif, idx) => {
                        const isRead = notif.is_read;
                        return (
                          <div
                            key={notif.id || idx}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "10px",
                              background: "var(--surface-soft)",
                              borderLeft: `4px solid ${notif.severity === "low_stock" ? "var(--warning)" : "var(--accent)"}`,
                              opacity: isRead ? 0.6 : 1,
                              fontSize: "12px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: "8px"
                            }}
                          >
                            <div style={{ display: "grid", gap: "2px", flex: 1 }}>
                              <strong style={{ color: "var(--text)" }}>{notif.message || notif.label}</strong>
                              <span style={{ color: "var(--muted)", fontSize: "11px" }}>
                                {notif.severity ? `Type: ${notif.severity}` : notif.description}
                              </span>
                            </div>
                            {!isRead && onNotificationRead && (
                              <button 
                                onClick={() => onNotificationRead(notif.id)}
                                style={{ 
                                  background: "transparent", 
                                  color: "var(--muted)", 
                                  fontSize: "13px", 
                                  fontWeight: "700", 
                                  cursor: "pointer", 
                                  padding: "0 4px",
                                  border: "none"
                                }}
                                title="Mark as read"
                              >
                                ✓
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", display: "grid", gap: "8px", justifyItems: "center" }}>
                        <Icon name="check" className="w-8 h-8" style={{ color: "var(--success)" }} />
                        <span style={{ fontSize: "12px", fontWeight: "600" }}>System healthy. All clear!</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    {notifications.length > 0 && onNotificationClearAll && (
                      <button
                        onClick={onNotificationClearAll}
                        className="ui-button ui-button--secondary ui-button--sm"
                        style={{ flex: 1, fontSize: "11px", fontWeight: "700", border: "1px solid var(--border)", cursor: "pointer", padding: "6px" }}
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="ui-button ui-button--ghost ui-button--sm"
                      style={{ flex: 1, fontSize: "11px", fontWeight: "700", border: "1px solid var(--border)" }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions / Log Out Dropdown */}
            <DropdownMenu
              trigger={currentUser?.username || "Account"}
              items={[
                { label: "View Profile", description: "Your details & settings", onSelect: onProfile },
                { label: "Logout", description: "End current session", tone: "danger", onSelect: onLogout },
              ]}
              triggerStyle={{
                height: "42px",
                minHeight: "42px",
                padding: "0 16px",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                fontWeight: "700",
                fontSize: "13px",
                boxShadow: "var(--shadow-soft)",
                cursor: "pointer"
              }}
            />
          </div>
        </header>

        {/* Dynamic Workspace Container */}
        <main className="workspace" style={{ background: "var(--bg)", minHeight: "100%", padding: "28px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
