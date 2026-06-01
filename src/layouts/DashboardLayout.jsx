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
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC]">
      <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-md text-3xl text-[#0D1B2A] hover:bg-gray-100"
          aria-label="Open sidebar"
        >
          <Menu size={26} strokeWidth={2} aria-hidden="true" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#26752C] text-base font-bold text-white">
            P
          </div>
          <div className="text-xl font-extrabold text-[#0D1B2A]">PosterGen</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#DCEFD9] text-sm font-bold text-[#26752C]">
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

      <main className="min-h-screen overflow-x-hidden bg-[#F8FAFC] lg:ml-[260px]">
        <Outlet />
      </main>
    </div>
  );
}
