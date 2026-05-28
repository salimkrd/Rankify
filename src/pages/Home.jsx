import React from "react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[#0D1B2A]">Rankify</h1>
        <p className="mt-4 text-gray-600">Event Result Poster Maker</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/login" className="rounded-lg border px-4 py-2">Login</Link>
          <Link to="/dashboard" className="rounded-lg bg-[#2563EB] px-4 py-2 text-white">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
