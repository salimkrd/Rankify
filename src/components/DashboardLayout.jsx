import { Outlet, NavLink, useNavigate } from "react-router-dom";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("rankify_user")) || { name: "User", email: "demo@rankify.app" };
  } catch {
    return { name: "User", email: "demo@rankify.app" };
  }
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const user = getUser();

  function logout() {
    localStorage.removeItem("rankify_is_logged_in");
    navigate("/");
  }

  const navItems = [
    ["Events", "/dashboard/events"],
    ["Templates", "/dashboard/program-templates"],
    ["Results", "/dashboard/program-results"],
    ["Teams", "/dashboard/teams"],
    ["Categories", "/dashboard/categories"],
  ];

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#F8FAFC]">
      <aside className="flex w-[250px] shrink-0 flex-col border-r bg-white">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#0D1B2A] font-bold text-[#FFC107]">R</div>
          <span className="text-xl font-bold text-[#0D1B2A]">Rankify</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map(([label, to]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-blue-50 text-[#2563EB]" : "text-slate-700 hover:bg-slate-50"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-4">
          <p className="truncate text-sm font-semibold text-[#0D1B2A]">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          <button className="mt-3 text-sm text-red-600" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
