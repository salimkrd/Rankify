import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentAdminUser } from "../services/adminAuthService.js";

export default function AdminRoute({ children }) {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, admin: null });

  useEffect(() => {
    let active = true;

    async function loadAdmin() {
      try {
        const admin = await getCurrentAdminUser();
        if (active) setState({ loading: false, admin });
      } catch (error) {
        console.error("Unable to verify admin access.", error);
        if (active) setState({ loading: false, admin: null });
      }
    }

    loadAdmin();
    return () => {
      active = false;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="app-page flex min-h-screen items-center justify-center px-4 text-[var(--app-text)]">
        <div className="app-card rounded-lg border px-6 py-5 text-sm font-semibold shadow-sm">
          Checking admin access...
        </div>
      </div>
    );
  }

  if (!state.admin) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return children;
}

