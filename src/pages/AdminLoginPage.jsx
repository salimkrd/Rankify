import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { getCurrentAdminUser, signInAdmin } from "../services/adminAuthService.js";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentAdminUser()
      .then((admin) => {
        if (!active) return;
        setIsAdmin(Boolean(admin));
        setChecking(false);
      })
      .catch(() => {
        if (!active) return;
        setIsAdmin(false);
        setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInAdmin(email.trim(), password);
      const destination = location.state?.from?.pathname || "/admin/dashboard";
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="app-page flex min-h-screen items-center justify-center px-4">
        <div className="app-card rounded-lg border px-6 py-5 text-sm font-semibold shadow-sm">Checking admin session...</div>
      </div>
    );
  }

  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;

  return (
    <div className="app-page flex min-h-screen items-center justify-center overflow-x-hidden px-4 py-8 text-[var(--app-text)]">
      <form onSubmit={handleSubmit} className="app-card w-full max-w-[420px] rounded-xl border p-6 shadow-sm max-sm:p-5">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--app-sidebar-active-bg)] text-[var(--app-sidebar-active-text)]">
          <ShieldCheck size={26} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <h1 className="app-heading text-2xl font-bold">Rankify Admin</h1>
        <p className="app-muted mt-1 text-sm">Sign in with a Supabase admin account.</p>

        {error ? (
          <div className="mt-5 rounded-md border border-[var(--app-danger)] bg-[var(--app-danger-bg-soft)] px-3 py-2 text-sm text-[var(--app-danger)]">
            {error}
          </div>
        ) : null}

        <label className="mt-6 block text-sm font-semibold text-[var(--app-text)]">Email</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="app-input mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
        />

        <label className="mt-3 block text-sm font-semibold text-[var(--app-text)]">Password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="app-input mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-[var(--app-primary)] px-4 py-2 font-semibold text-[var(--app-primary-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

