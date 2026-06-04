import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus, ScrollText } from "lucide-react";
import { getAllPublicTemplates } from "../services/publicTemplatesService.js";

export default function AdminDashboardPage() {
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getAllPublicTemplates()
      .then(setTemplates)
      .catch((loadError) => setError(loadError.message || "Unable to load admin data."));
  }, []);

  const publishedCount = templates.filter((template) => template.isPublished).length;

  return (
    <section className="app-page min-h-screen overflow-x-hidden px-6 py-8 max-sm:px-4">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="app-heading text-3xl font-extrabold">Admin Dashboard</h1>
            <p className="app-muted mt-2 text-base">Manage Rankify public templates for Explore Public Templates.</p>
          </div>
          <Link to="/admin/public-templates/new" className="app-success-btn inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-5 text-sm font-bold shadow-sm">
            <Plus size={18} strokeWidth={1.9} aria-hidden="true" />
            New Public Template
          </Link>
        </div>

        {error ? <div className="mb-6 rounded-md border border-[var(--app-danger)] bg-[var(--app-danger-bg-soft)] px-4 py-3 text-sm text-[var(--app-danger)]">{error}</div> : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="app-card rounded-lg border p-5 shadow-sm">
            <ScrollText className="text-[var(--app-muted)]" size={24} strokeWidth={1.9} aria-hidden="true" />
            <p className="app-muted mt-4 text-sm font-semibold">Total Templates</p>
            <h2 className="app-heading mt-1 text-3xl font-extrabold">{templates.length}</h2>
          </div>
          <div className="app-card rounded-lg border p-5 shadow-sm">
            <FileText className="text-[var(--app-muted)]" size={24} strokeWidth={1.9} aria-hidden="true" />
            <p className="app-muted mt-4 text-sm font-semibold">Published</p>
            <h2 className="app-heading mt-1 text-3xl font-extrabold">{publishedCount}</h2>
          </div>
          <div className="app-card rounded-lg border p-5 shadow-sm">
            <FileText className="text-[var(--app-muted)]" size={24} strokeWidth={1.9} aria-hidden="true" />
            <p className="app-muted mt-4 text-sm font-semibold">Drafts</p>
            <h2 className="app-heading mt-1 text-3xl font-extrabold">{templates.length - publishedCount}</h2>
          </div>
        </div>
      </div>
    </section>
  );
}

