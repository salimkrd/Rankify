import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  function handleSignup(e) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password.trim() || !confirm.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const user = { name, email };
    localStorage.setItem("rankify_user", JSON.stringify(user));
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

        <form onSubmit={handleSignup} className="rounded-xl bg-white p-6 shadow-sm max-sm:p-5">
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Create account</h1>
          <p className="mt-1 text-sm text-gray-500">Sign up to start creating result posters</p>

          {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

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
            className="mt-6 w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 transition-colors"
          >
            Create Account
          </button>

          <p className="mt-4 text-sm text-gray-600">
            Already have an account? <Link to="/login" className="text-green-600 font-medium">Sign in here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
