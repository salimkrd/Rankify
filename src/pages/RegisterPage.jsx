import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { authRequest, hashPassword, saveUserSession } from "../utils/auth.js";

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link to="/" className="flex items-center gap-2">
            <Trophy className="h-8 w-8 text-green-600" />
            <span className="text-xl font-bold text-gray-900">PosterGen</span>
          </Link>
        </div>

        <form onSubmit={handleRegister} className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Create account</h1>
          <p className="mt-1 text-sm text-gray-500">Sign up to start creating result posters</p>

          {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <label className="mt-6 block text-sm text-gray-700">Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Your full name"
          />

          <label className="mt-3 block text-sm text-gray-700">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="you@company.com"
          />

          <label className="mt-3 block text-sm text-gray-700">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Create a password"
            type="password"
          />

          <label className="mt-3 block text-sm text-gray-700">Confirm Password</label>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Confirm password"
            type="password"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="mt-4 text-sm text-gray-600">
            Already have an account? <Link to="/login" className="text-green-600 font-medium">Sign in here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
