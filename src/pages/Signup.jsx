import React from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();

  function handleSignup() {
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
        <h1 className="text-2xl font-bold text-[#0D1B2A]">Create account</h1>
        <p className="mt-1 text-sm text-gray-500">Sign up to Rankify</p>
        <input className="mt-6 w-full rounded-lg border px-3 py-2" placeholder="Name" />
        <input className="mt-3 w-full rounded-lg border px-3 py-2" placeholder="Email" />
        <input className="mt-3 w-full rounded-lg border px-3 py-2" placeholder="Password" type="password" />
        <button onClick={handleSignup} className="mt-5 w-full rounded-lg bg-[#2563EB] py-2 font-semibold text-white">
          Create Account
        </button>
        <p className="mt-4 text-sm">
          Already have an account? <Link to="/login" className="text-[#2563EB]">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
