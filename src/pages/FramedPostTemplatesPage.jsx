import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserStorageKey } from "../utils/storage.js";

const STORAGE_KEY = "rankify_framed_post_templates";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function normalizeTemplates(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    return Object.values(raw).flat();
  }
  return [];
}

function getActiveEventId() {
  return localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY)) || "";
}

function getAllTemplates() {
  return normalizeTemplates(safeJsonParse(localStorage.getItem(getUserStorageKey(STORAGE_KEY)), []));
}

function getEventTemplates(activeEventId) {
  if (!activeEventId) return [];
  return getAllTemplates().filter(
    (template) => String(template.eventId) === String(activeEventId)
  );
}

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US");
}

export default function FramedPostTemplatesPage() {
  const navigate = useNavigate();
  const [activeEventId, setActiveEventId] = useState(getActiveEventId());
  const [templates, setTemplates] = useState(getEventTemplates(activeEventId));

  useEffect(() => {
    function syncTemplates() {
      const eventId = getActiveEventId();
      setActiveEventId(eventId);
      setTemplates(getEventTemplates(eventId));
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
  }, []);

  const hasTemplates = templates.length > 0;

  function persistTemplatesRaw(value) {
    localStorage.setItem(getUserStorageKey(STORAGE_KEY), JSON.stringify(value));
    window.dispatchEvent(new Event("rankify-data-changed"));
  }

  function handleDeleteTemplate(templateId) {
    const confirmed = window.confirm("Are you sure you want to delete this framed post template?");
    if (!confirmed) return;

    const raw = safeJsonParse(localStorage.getItem(getUserStorageKey(STORAGE_KEY)), []);
    // array shape
    if (Array.isArray(raw)) {
      const filtered = raw.filter(
        (t) => !(String(t.id) === String(templateId) && String(t.eventId) === String(activeEventId))
      );
      persistTemplatesRaw(filtered);
      setTemplates(getEventTemplates(activeEventId));
      return;
    }

    // object/grouped shape
    if (raw && typeof raw === "object") {
      const copy = { ...raw };
      const key = activeEventId || "default";
      const list = Array.isArray(copy[key]) ? copy[key].filter((t) => String(t.id) !== String(templateId)) : [];
      if (list.length) copy[key] = list;
      else delete copy[key];
      persistTemplatesRaw(copy);
      setTemplates(getEventTemplates(activeEventId));
      return;
    }

    // fallback: nothing to do
    setTemplates(getEventTemplates(activeEventId));
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] px-6 py-6 text-[#0D1B2A] max-sm:px-4">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-bold">Framed Post Templates</h1>
          <p className="mt-2 text-sm text-gray-600">Manage templates for the current active event.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/dashboard/framed-posts/new")}
          className="inline-flex items-center justify-center rounded-md bg-[#26752C] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f6425]"
        >
          + Create New
        </button>
      </div>

      <div className="space-y-4">
        {hasTemplates ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {templates.map((template) => (
              <div key={template.id} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-semibold text-[#0D1B2A]">{template.name || "Untitled Template"}</h2>
                    <p className="mt-2 text-sm text-gray-500">
                      Created: {formatDate(template.createdAt || template.updatedAt || new Date().toISOString())}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-3 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/framed-posts/${template.id}/edit`) }
                      className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#0D1B2A] hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      ▥ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[52vh] items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white p-10 shadow-sm">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF5EA] text-2xl text-[#26752C]">⌘</div>
              <h2 className="text-2xl font-semibold text-[#0D1B2A]">No Framed Post Templates Yet</h2>
              <p className="mt-2 text-sm text-gray-500">Start by creating your first framed post template.</p>
              <button
                type="button"
                onClick={() => navigate("/dashboard/framed-posts/new")}
                className="mt-6 inline-flex items-center justify-center rounded-md bg-[#26752C] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1f6425]"
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
