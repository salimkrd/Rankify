import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authRequest, hashPassword, saveUserSession } from "../utils/auth.js";
import logoDark from "../assets/logo/rankify-logo-dark.svg";
import logoLight from "../assets/logo/rankify-logo-light.svg";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isLoggedIn = localStorage.getItem("rankify_is_logged_in") === "true";

  useEffect(() => {
    if (!isLoggedIn) {
      document.documentElement.classList.remove("dark");
      document.documentElement.dataset.theme = "light";
    }
  }, [isLoggedIn]);

  async function handleRegister(event) {
    event.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password.trim() || !confirm.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const passwordHash = await hashPassword(password);
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password: passwordHash,
        passwordHash,
      };

      const result = await authRequest("register", payload);

      if (!result.success) {
        setError(result.message || "Email already registered");
        setLoading(false);
        return;
      }

      const user = {
        name: result.user?.name || name.trim(),
        email: result.user?.email || email.trim(),
      };

      saveUserSession(user);
      navigate("/dashboard");
    } catch (error_) {
      setError(error_.message || "Unable to register right now. Please try again.");
      setLoading(false);
    }
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

        <form onSubmit={handleRegister} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm max-sm:p-5">
          <h1 className="text-2xl font-bold text-[var(--app-heading)]">Create account</h1>
          <p className="mt-1 text-sm text-[var(--app-muted)]">Sign up to start creating result posters</p>

          {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

          <label className="mt-6 block text-sm text-[var(--app-text)]">Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-input-bg)] px-3 py-2 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
            placeholder="Your full name"
          />

          <label className="mt-3 block text-sm text-[var(--app-text)]">Email</label>
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
            placeholder="Create a password"
            type="password"
          />

          <label className="mt-3 block text-sm text-[var(--app-text)]">Confirm Password</label>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-input-bg)] px-3 py-2 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
            placeholder="Confirm password"
            type="password"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-[var(--app-primary)] px-4 py-2 font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="mt-4 text-sm text-[var(--app-muted)]">
            Already have an account? <Link to="/login" className="font-medium text-[var(--app-primary)]">Sign in here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
