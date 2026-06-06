import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, Grid3X3, Plus, Trash2 } from "lucide-react";
import NoActiveEventState from "../components/NoActiveEventState.jsx";
import { useActiveEvent } from "../contexts/ActiveEventContext.jsx";
import {
  deleteFramedPostTemplate,
  listFramedPostTemplatesByEvent,
} from "../services/framedPostTemplatesService.js";

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US");
}

export default function FramedPostTemplatesPage() {
  const navigate = useNavigate();
  const { activeEventId, loading: activeEventLoading } = useActiveEvent();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function syncTemplates() {
      if (activeEventLoading) return;

      setLoading(true);
      setError("");
      try {
        const eventTemplates = activeEventId ? await listFramedPostTemplatesByEvent(activeEventId) : [];
        setTemplates(eventTemplates);
      } catch (loadError) {
        setError(loadError.message || "Unable to load templates.");
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    }

    syncTemplates();

    window.addEventListener("storage", syncTemplates);
    window.addEventListener("rankify-active-event-changed", syncTemplates);
    window.addEventListener("rankify-data-changed", syncTemplates);
    window.addEventListener("rankify-events-changed", syncTemplates);

    return () => {
      window.removeEventListener("storage", syncTemplates);
      window.removeEventListener("rankify-active-event-changed", syncTemplates);
      window.removeEventListener("rankify-data-changed", syncTemplates);
      window.removeEventListener("rankify-events-changed", syncTemplates);
    };
  }, [activeEventId, activeEventLoading]);

  const hasTemplates = templates.length > 0;
  const hasActiveEvent = Boolean(activeEventId);

  async function handleDeleteTemplate(templateId) {
    const confirmed = window.confirm("Are you sure you want to delete this framed post template?");
    if (!confirmed) return;

    try {
      await deleteFramedPostTemplate(templateId);
      setTemplates((current) => current.filter((template) => template.id !== templateId));
      window.dispatchEvent(new Event("rankify-data-changed"));
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete template.");
    }
  }

  return (
    <div className="app-page min-h-screen overflow-x-hidden px-6 py-6 max-sm:px-4">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="app-heading break-words text-3xl font-bold">Framed Post Templates</h1>
          <p className="app-muted mt-2 text-sm">Manage templates for the current active event.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!hasActiveEvent) {
              alert("Please select an active event first.");
              return;
            }
            navigate("/dashboard/framed-posts/new");
          }}
          disabled={!hasActiveEvent}
          className="app-success-btn inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition hover:opacity-90 sm:w-auto"
        >
          <Plus className="mr-2" size={18} strokeWidth={2} aria-hidden="true" />
          Create New
        </button>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="app-card rounded-lg border border-[var(--app-danger)] p-4 text-sm text-[var(--app-danger)]">
            {error}
          </div>
        )}
        {!hasActiveEvent && activeEventLoading ? (
          <div className="app-card rounded-xl border p-8 text-center">
            <p className="app-muted text-sm font-semibold">Loading templates...</p>
          </div>
        ) : !hasActiveEvent ? (
          <NoActiveEventState />
        ) : loading ? (
          <div className="app-card rounded-xl border p-8 text-center">
            <p className="app-muted text-sm font-semibold">Loading templates...</p>
          </div>
        ) : hasTemplates ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {templates.map((template) => (
              <div key={template.id} className="app-card min-w-0 rounded-2xl border p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="app-heading break-words text-xl font-semibold">{template.name || "Untitled Template"}</h2>
                    <p className="app-muted mt-2 text-sm">
                      Created: {formatDate(template.createdAt || template.updatedAt || new Date().toISOString())}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-3 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/framed-posts/${template.id}/edit`) }
                      className="app-card rounded-md border px-4 py-2 text-sm font-medium hover:bg-[var(--app-surface-elevated)]"
                    >
                      <Edit className="mr-2 inline-block align-[-2px]" size={16} strokeWidth={1.9} aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="app-danger-btn inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold hover:opacity-90"
                    >
                      <Trash2 size={16} strokeWidth={1.9} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="app-card flex min-h-[52vh] items-center justify-center rounded-3xl border border-dashed p-10 shadow-sm">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-sidebar-active-bg)] text-[var(--app-sidebar-active-text)]">
                <Grid3X3 size={38} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <h2 className="app-heading text-2xl font-semibold">No Framed Post Templates Yet</h2>
              <p className="app-muted mt-2 text-sm">Start by creating your first framed post template.</p>
              <button
                type="button"
                onClick={() => {
                  if (!hasActiveEvent) {
                    alert("Please select an active event first.");
                    return;
                  }
                  navigate("/dashboard/framed-posts/new");
                }}
                className="app-success-btn mt-6 inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-semibold shadow-sm hover:opacity-90"
              >
                Create New Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
