import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";
import { getInitials } from "../utils/auth.js";

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value || "") || fallback;
  } catch {
    return fallback;
  }
}

function getStoredUser() {
  const user = safeJsonParse(localStorage.getItem("rankify_user"), null);
  return user && typeof user === "object" ? user : { name: "User", email: "" };
}

export default function DashboardLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    const syncUser = () => setUser(getStoredUser());
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  return (
    <div className="app-page min-h-screen overflow-x-hidden">
      <header className="app-header sticky top-0 z-30 flex h-[76px] items-center justify-between border-b px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="app-heading flex h-11 w-11 items-center justify-center rounded-md text-3xl hover:bg-[var(--app-sidebar-active-bg)]"
          aria-label="Open sidebar"
        >
          <Menu size={26} strokeWidth={2} aria-hidden="true" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--app-primary)] text-base font-bold text-[var(--app-primary-text)]">
            P
          </div>
          <div className="app-heading text-xl font-extrabold">PosterGen</div>
        </div>
        <div className="app-badge flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold">
          {getInitials(user)}
        </div>
      </header>

      <Sidebar />

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close sidebar overlay"
            className="absolute inset-0 bg-black/45"
            onClick={() => setDrawerOpen(false)}
          />
          <Sidebar mobile onClose={() => setDrawerOpen(false)} onNavigate={() => setDrawerOpen(false)} />
        </div>
      )}

      <main className="app-page min-h-screen overflow-x-hidden lg:ml-[260px]">
        <Outlet />
      </main>
    </div>
  );
}
