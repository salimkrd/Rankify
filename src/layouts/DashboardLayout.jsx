import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";
import { ActiveEventProvider } from "../contexts/ActiveEventContext.jsx";
import { getInitials } from "../utils/auth.js";
import logoDark from "../assets/logo/rankify-logo-dark.svg";
import logoLight from "../assets/logo/rankify-logo-light.svg";

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
    <ActiveEventProvider>
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
        <div className="flex min-w-0 items-center justify-center">
          <img
            src={logoLight}
            alt="Rankify"
            className="h-9 w-auto object-contain dark:hidden"
          />
          <img
            src={logoDark}
            alt="Rankify"
            className="hidden h-9 w-auto object-contain dark:block"
          />
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
    </ActiveEventProvider>
  );
}
