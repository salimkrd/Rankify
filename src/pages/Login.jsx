import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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
    <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md min-w-0">
        <div className="flex justify-center mb-6">
          <Link to="/" className="flex items-center gap-2">
            <Trophy className="h-8 w-8 text-green-600" />
            <span className="text-xl font-bold text-gray-900">PosterGen</span>
          </Link>
        </div>

        <form onSubmit={handleLogin} className="rounded-xl bg-white p-6 shadow-sm max-sm:p-5">
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account to continue</p>

          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

          <label className="mt-6 block text-sm text-gray-700">Email</label>
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
            placeholder="Your password"
            type="password"
          />

          <button
            type="submit"
            className="mt-6 w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 transition-colors"
          >
            Sign In
          </button>

          <p className="mt-4 text-sm text-gray-600">
            Don’t have an account? <Link to="/register" className="text-green-600 font-medium">Sign up here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
