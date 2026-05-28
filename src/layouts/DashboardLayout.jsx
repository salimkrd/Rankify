import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">
      <Sidebar />
      <main className="ml-[260px] min-h-screen bg-[#F8FAFC] overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
