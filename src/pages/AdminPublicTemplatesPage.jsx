import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Edit, Plus, Trash2 } from "lucide-react";
import {
  deletePublicTemplate,
  getAllPublicTemplates,
  publishPublicTemplate,
} from "../services/publicTemplatesService.js";

const typeLabels = {
  program_template: "Program Template",
  team_status_template: "Team Status Template",
  framed_post_template: "Framed Post Template",
  certificate_template: "Certificate Template",
};

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US");
}

export default function AdminPublicTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  async function loadTemplates() {
    setLoading(true);
    setError("");
    try {
      setTemplates(await getAllPublicTemplates());
    } catch (loadError) {
      setError(loadError.message || "Unable to load public templates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesSearch = !query || [template.displayTitle || template.name, template.type, template.description].join(" ").toLowerCase().includes(query);
      const matchesType = type === "all" || template.type === type;
      const matchesStatus =
        status === "all" ||
        (status === "published" && template.isPublished) ||
        (status === "draft" && !template.isPublished);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [search, status, templates, type]);

  async function handlePublish(template) {
    setBusyId(template.id);
    setError("");
    try {
      const updated = await publishPublicTemplate(template.id, !template.isPublished);
      setTemplates((current) => current.map((item) => (item.id === template.id ? updated : item)));
    } catch (publishError) {
      setError(publishError.message || "Unable to update publish status.");
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete(template) {
    const confirmed = window.confirm(`Delete "${template.displayTitle || template.name}"?`);
    if (!confirmed) return;

    setBusyId(template.id);
    setError("");
    try {
      await deletePublicTemplate(template.id);
      setTemplates((current) => current.filter((item) => item.id !== template.id));
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete public template.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="app-page min-h-screen overflow-x-hidden px-6 py-8 max-sm:px-4">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="app-heading text-3xl font-extrabold">Public Templates</h1>
            <p className="app-muted mt-2 text-base">Add, edit, delete, and publish templates for public discovery.</p>
          </div>
          <Link to="/admin/public-templates/new" className="app-success-btn inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-5 text-sm font-bold shadow-sm">
            <Plus size={18} strokeWidth={1.9} aria-hidden="true" />
            New Template
          </Link>
        </div>

        {error ? <div className="mb-6 rounded-md border border-[var(--app-danger)] bg-[var(--app-danger-bg-soft)] px-4 py-3 text-sm text-[var(--app-danger)]">{error}</div> : null}

        <div className="app-card mb-6 grid gap-3 rounded-lg border p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_220px_180px]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search templates..."
            className="app-input h-11 rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
          />
          <select value={type} onChange={(event) => setType(event.target.value)} className="app-input h-11 rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]">
            <option value="all">All Types</option>
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="app-input h-11 rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]">
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="app-card overflow-hidden rounded-lg border shadow-sm">
          <div className="grid min-w-[860px] grid-cols-[minmax(220px,1.4fr)_180px_130px_140px_280px] border-b border-[var(--app-border)] bg-[var(--app-surface-elevated)] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--app-muted)]">
            <span>Title</span>
            <span>Type</span>
            <span>Status</span>
            <span>Created</span>
            <span>Actions</span>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-sm font-semibold text-[var(--app-muted)]">Loading templates...</div>
            ) : filteredTemplates.length ? (
              filteredTemplates.map((template) => (
                <div key={template.id} className="grid min-w-[860px] grid-cols-[minmax(220px,1.4fr)_180px_130px_140px_280px] items-center gap-0 border-b border-[var(--app-border)] px-4 py-4 last:border-b-0">
                  <div className="min-w-0">
                    <h2 className="app-heading truncate text-base font-bold">{template.displayTitle || template.name}</h2>
                    <p className="app-muted mt-1 truncate text-sm">{template.description || "No description"}</p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--app-text)]">{typeLabels[template.type] || template.type}</span>
                  <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-bold ${template.isPublished ? "bg-[var(--app-success)] text-[var(--app-success-text)]" : "bg-[var(--app-sidebar-active-bg)] text-[var(--app-sidebar-active-text)]"}`}>
                    {template.isPublished ? "Published" : "Draft"}
                  </span>
                  <span className="text-sm text-[var(--app-muted)]">{formatDate(template.createdAt || template.created_at)}</span>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/admin/public-templates/${template.id}/edit`} className="app-card inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold hover:bg-[var(--app-surface-elevated)]">
                      <Edit size={15} strokeWidth={1.9} aria-hidden="true" />
                      Edit
                    </Link>
                    <button type="button" disabled={busyId === template.id} onClick={() => handlePublish(template)} className="app-card h-9 rounded-md border px-3 text-sm font-semibold hover:bg-[var(--app-surface-elevated)] disabled:opacity-60">
                      {template.isPublished ? "Unpublish" : "Publish"}
                    </button>
                    <button type="button" disabled={busyId === template.id} onClick={() => handleDelete(template)} className="h-9 rounded-md px-3 text-sm font-semibold text-[var(--app-danger)] hover:bg-[var(--app-danger-bg-soft)] disabled:opacity-60">
                      <Trash2 className="mr-1 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center">
                <h2 className="app-heading text-xl font-extrabold">No public templates found</h2>
                <p className="app-muted mt-2 text-sm">Create a public template to make it available for publishing.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
