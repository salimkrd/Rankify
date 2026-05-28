import React from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  function handleLogin() {
    localStorage.setItem("rankify_is_logged_in", "true");
    localStorage.setItem("rankify_user", JSON.stringify({
      name: "Salim karakkad",
      email: "salimkrd66@gmail.com"
    }));
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#0D1B2A]">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in to Rankify</p>
        <input className="mt-6 w-full rounded-lg border px-3 py-2" placeholder="Email" />
        <input className="mt-3 w-full rounded-lg border px-3 py-2" placeholder="Password" type="password" />
        <button onClick={handleLogin} className="mt-5 w-full rounded-lg bg-[#2563EB] py-2 font-semibold text-white">
          Sign In
        </button>
        <p className="mt-4 text-sm">
          Don’t have an account? <Link to="/signup" className="text-[#2563EB]">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
