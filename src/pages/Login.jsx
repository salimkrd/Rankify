import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoDark from "../assets/logo/rankify-logo-dark.svg";
import logoLight from "../assets/logo/rankify-logo-light.svg";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const isLoggedIn = localStorage.getItem("rankify_is_logged_in") === "true";

  useEffect(() => {
    if (!isLoggedIn) {
      document.documentElement.classList.remove("dark");
      document.documentElement.dataset.theme = "light";
    }
  }, [isLoggedIn]);

  function handleLogin(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.");
      return;
    }

    const stored = localStorage.getItem("rankify_user");
    let user = stored ? JSON.parse(stored) : null;

    if (!user) {
      const namePart = email.split("@")[0] || "User";
      const name = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      user = { name, email };
      localStorage.setItem("rankify_user", JSON.stringify(user));
    }

    localStorage.setItem("rankify_is_logged_in", "true");
    navigate("/dashboard");
  }

  return (
    <div className={`${!isLoggedIn ? "force-light-page " : ""}flex min-h-screen items-center justify-center overflow-x-hidden bg-[var(--app-bg)] px-4 py-8 text-[var(--app-text)]`}>
      <div className="w-full max-w-md min-w-0">
        <div className="flex justify-center mb-6">
          <Link to="/" className="flex items-center justify-center">
            <img
              src={logoLight}
              alt="Rankify"
              className="h-11 w-auto object-contain dark:hidden"
            />
            <img
              src={logoDark}
              alt="Rankify"
              className="hidden h-11 w-auto object-contain dark:block"
            />
          </Link>
        </div>

        <form onSubmit={handleLogin} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm max-sm:p-5">
          <h1 className="text-2xl font-bold text-[var(--app-heading)]">Welcome back</h1>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Sign in to your account to continue</p>

          {error && <div className="mt-4 text-sm text-red-600 dark:text-red-300">{error}</div>}

          <label className="mt-6 block text-sm text-[var(--app-text)]">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-input-bg)] px-3 py-2 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
            placeholder="you@company.com"
          />

          <label className="mt-3 block text-sm text-[var(--app-text)]">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-input-bg)] px-3 py-2 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
            placeholder="Your password"
            type="password"
          />

          <button
            type="submit"
            className="mt-6 w-full rounded-lg bg-[var(--app-primary)] px-4 py-2 font-semibold text-white transition-colors hover:opacity-90"
          >
            Sign In
          </button>

          <p className="mt-4 text-sm text-[var(--app-muted)]">
            Don’t have an account? <Link to="/register" className="font-medium text-[var(--app-primary)]">Sign up here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
