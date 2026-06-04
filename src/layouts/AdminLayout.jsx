import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, ScrollText } from "lucide-react";
import { signOutAdmin } from "../services/adminAuthService.js";

const navItems = [
  { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Public Templates", to: "/admin/public-templates", icon: ScrollText },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOutAdmin();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="app-page min-h-screen overflow-x-hidden">
      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-[260px] border-r lg:flex lg:flex-col">
        <Link to="/admin/dashboard" className="app-border flex h-[76px] items-center border-b px-5">
          <div>
            <p className="app-muted text-xs font-bold uppercase tracking-wide">Rankify</p>
            <h1 className="app-heading text-xl font-extrabold">Admin</h1>
          </div>
        </Link>
        <nav className="flex-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `mb-1 flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-[var(--app-sidebar-active-bg)] text-[var(--app-sidebar-active-text)]"
                      : "app-muted hover:bg-[var(--app-sidebar-active-bg)] hover:text-[var(--app-sidebar-active-text)]"
                  }`
                }
              >
                <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-[var(--app-border)] p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="app-muted flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold hover:bg-[var(--app-sidebar-active-bg)] hover:text-[var(--app-sidebar-active-text)]"
          >
            <LogOut size={18} strokeWidth={1.9} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <header className="app-header sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-3 border-b px-4 lg:hidden">
        <div>
          <p className="app-muted text-xs font-bold uppercase tracking-wide">Rankify</p>
          <h1 className="app-heading text-lg font-extrabold">Admin</h1>
        </div>
        <button type="button" onClick={handleSignOut} className="app-card rounded-md border px-3 py-2 text-sm font-semibold">
          Sign out
        </button>
      </header>

      <main className="min-h-screen overflow-x-hidden lg:ml-[260px]">
        <Outlet />
      </main>
    </div>
  );
}

