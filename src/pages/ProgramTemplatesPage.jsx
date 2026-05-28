import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const TEMPLATES_KEY = "rankify_program_templates";

const fallbackEvents = [
  {
    id: "event_panangara",
    name: "SSF PANANGARA UNIT SAHITYOLSAV",
    organizer: "Panangara Unit",
    date: "May 25",
    location: "Panangara",
    created: "5/24/2026",
  },
  {
    id: "event_cherikallu",
    name: "SSF CHERIKALLU UNIT SAHITYOLSAV",
    organizer: "Cherikallu Unit",
    date: "May 22",
    location: "Nambram",
    created: "5/22/2026",
  },
];

function makePreview(seed, background, accent = "#26752C") {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="820" viewBox="0 0 640 820">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${background}" />
          <stop offset="1" stop-color="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="640" height="820" fill="url(#g)" />
      <circle cx="520" cy="540" r="170" fill="${accent}" opacity=".18" />
      <circle cx="540" cy="590" r="110" fill="${accent}" opacity=".22" />
      <rect x="80" y="90" width="160" height="26" rx="6" fill="#111827" opacity=".9" />
      <rect x="80" y="132" width="240" height="18" rx="4" fill="#111827" opacity=".75" />
      <text x="80" y="230" font-family="Arial" font-size="30" font-weight="700" fill="#111827">Result No: ${seed}</text>
      <text x="80" y="285" font-family="Arial" font-size="34" font-weight="700" fill="#111827">General</text>
      <text x="80" y="332" font-family="Arial" font-size="32" font-weight="700" fill="#111827">Elocution English Kids</text>
      <g font-family="Arial" fill="#111827">
        <text x="88" y="455" font-size="24" font-weight="700">1  Muhammed Saeed</text>
        <text x="118" y="485" font-size="18" font-style="italic">Vadi Badr</text>
        <text x="88" y="540" font-size="24" font-weight="700">2  Jabbar Ibraheem</text>
        <text x="118" y="570" font-size="18" font-style="italic">Isfahan</text>
        <text x="88" y="625" font-size="24" font-weight="700">3  Ali bin Muhammed</text>
        <text x="118" y="655" font-size="18" font-style="italic">Vadi Quba</text>
      </g>
      <text x="80" y="760" font-family="Arial" font-size="28" font-weight="700" fill="${accent}">Sahityolsav</text>
    </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const PUBLIC_TEMPLATES = [
  {
    id: "public_template_1",
    name: "Sahityolsav Poster Template 1",
    previewImage: makePreview("21", "#111827", "#FFC107"),
  },
  {
    id: "public_template_2",
    name: "Sahityolsav Poster Template 2",
    previewImage: makePreview("22", "#F8FAFC", "#26752C"),
  },
  {
    id: "public_template_3",
    name: "Sahityolsav Poster Template 3",
    previewImage: makePreview("23", "#FDE68A", "#B91C1C"),
  },
  {
    id: "public_template_4",
    name: "Sahityolsav Poster Template 4",
    previewImage: makePreview("23", "#F87171", "#0D1B2A"),
  },
];

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function getStoredEvents() {
  const storedEvents = safeJsonParse(localStorage.getItem(EVENTS_KEY), []);

  if (Array.isArray(storedEvents) && storedEvents.length > 0) {
    return storedEvents;
  }

  localStorage.setItem(EVENTS_KEY, JSON.stringify(fallbackEvents));
  return fallbackEvents;
}

function getActiveEventId(events) {
  const storedActiveId = localStorage.getItem(ACTIVE_EVENT_KEY);
  const isValid = events.some((event) => event.id === storedActiveId);

  if (isValid) return storedActiveId;

  const firstEventId = events[0]?.id || "";

  if (firstEventId) {
    localStorage.setItem(ACTIVE_EVENT_KEY, firstEventId);
  } else {
    localStorage.removeItem(ACTIVE_EVENT_KEY);
  }

  return firstEventId;
}

function getTemplatesByEvent() {
  const stored = safeJsonParse(localStorage.getItem(TEMPLATES_KEY), {});

  if (Array.isArray(stored)) {
    return stored.reduce((grouped, template) => {
      if (!template?.eventId) return grouped;
      grouped[template.eventId] = [...(grouped[template.eventId] || []), template];
      return grouped;
    }, {});
  }

  return stored && typeof stored === "object" ? stored : {};
}

function getCurrentDate() {
  return new Date().toLocaleDateString("en-US");
}

export default function ProgramTemplatesPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [templatesByEvent, setTemplatesByEvent] = useState({});
  const [publicModalOpen, setPublicModalOpen] = useState(false);

  useEffect(() => {
    function syncTemplates() {
      const storedEvents = getStoredEvents();
      const validActiveId = getActiveEventId(storedEvents);
      const storedTemplates = getTemplatesByEvent();

      setEvents(storedEvents);
      setActiveEventId(validActiveId);
      setTemplatesByEvent(storedTemplates);
    }

    syncTemplates();

    window.addEventListener("storage", syncTemplates);
    window.addEventListener("rankify-data-changed", syncTemplates);
    window.addEventListener("rankify-active-event-changed", syncTemplates);

    return () => {
      window.removeEventListener("storage", syncTemplates);
      window.removeEventListener("rankify-data-changed", syncTemplates);
      window.removeEventListener("rankify-active-event-changed", syncTemplates);
    };
  }, []);

  const visibleTemplates = useMemo(
    () => (activeEventId ? templatesByEvent[activeEventId] || [] : []),
    [activeEventId, templatesByEvent]
  );

  const activeEvent = useMemo(
    () => events.find((event) => event.id === activeEventId) || null,
    [activeEventId, events]
  );

  function persistTemplates(nextTemplatesByEvent) {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(nextTemplatesByEvent));
    setTemplatesByEvent(nextTemplatesByEvent);
    window.dispatchEvent(new Event("rankify-data-changed"));
  }

  function getActiveTemplates() {
    return activeEventId ? templatesByEvent[activeEventId] || [] : [];
  }

  function handleCreateTemplate() {
    navigate("/dashboard/program-templates/new");
  }

  function handleUsePublicTemplate(publicTemplate) {
    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }

    const template = {
      id: `template_${Date.now()}`,
      eventId: activeEventId,
      name: `${publicTemplate.name} (from Public)`,
      previewImage: publicTemplate.previewImage,
      createdAt: getCurrentDate(),
      updatedAt: getCurrentDate(),
      source: "public",
      type: "program",
    };

    persistTemplates({
      ...templatesByEvent,
      [activeEventId]: [...getActiveTemplates(), template],
    });
    setPublicModalOpen(false);
  }

  function handleDuplicateTemplate(template) {
    const duplicatedTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      eventId: activeEventId,
      name: `${template.name} Copy`,
      createdAt: getCurrentDate(),
      updatedAt: getCurrentDate(),
    };

    persistTemplates({
      ...templatesByEvent,
      [activeEventId]: [...getActiveTemplates(), duplicatedTemplate],
    });
  }

  function handleDeleteTemplate(templateId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this template?"
    );
    if (!confirmed || !activeEventId) return;

    persistTemplates({
      ...templatesByEvent,
      [activeEventId]: getActiveTemplates().filter(
        (template) => template.id !== templateId
      ),
    });
  }

  return (
    <div className="px-6 py-6">
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0D1B2A]">
              Poster Templates
            </h1>
            <p className="mt-1 text-gray-600">
              Design and manage reusable poster templates
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleCreateTemplate}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#26752C] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1f6425]"
            >
              <span className="text-lg leading-none">+</span>
              Create New Template
            </button>
            <button
              type="button"
              onClick={() => setPublicModalOpen(true)}
              className="inline-flex h-10 items-center justify-center rounded-md bg-[#26752C] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1f6425]"
            >
              Explore Public Templates
            </button>
          </div>
        </div>

        {visibleTemplates.length === 0 ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-lg text-6xl text-gray-500">
              ▧
            </div>
            <h2 className="text-xl font-medium text-gray-600">
              No templates found.
            </h2>
            <p className="mt-4 text-gray-600">
              Get started by creating your first poster template
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
            {visibleTemplates.map((template) => (
              <div
                key={template.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex h-[340px] items-center justify-center bg-gray-100 p-6">
                  {template.previewImage ? (
                    <img
                      src={template.previewImage}
                      alt={template.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl text-gray-400">
                      ▧
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h2 className="line-clamp-2 min-h-[56px] text-xl font-bold text-[#0D1B2A]">
                    {template.name}
                  </h2>

                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleDuplicateTemplate(template)}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold hover:bg-gray-50"
                    >
                      ▣ Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/dashboard/program-templates/${template.id}/edit`)
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold hover:bg-gray-50"
                    >
                      ✎ Edit
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
        )}

        {activeEvent && (
          <p className="sr-only">Current event: {activeEvent.name}</p>
        )}
      </div>

      {publicModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[80vh] w-full max-w-[600px] overflow-hidden rounded-xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setPublicModalOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md border border-[#26752C] text-2xl leading-none text-gray-600 hover:bg-[#E8F3EA]"
              aria-label="Close modal"
            >
              ×
            </button>

            <h2 className="text-xl font-bold text-[#0D1B2A]">
              Explore Public Templates
            </h2>

            <div className="mt-5 max-h-[66vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {PUBLIC_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="flex h-[270px] items-center justify-center bg-gray-100 p-2">
                      <img
                        src={template.previewImage}
                        alt={template.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="truncate text-lg font-bold text-[#0D1B2A]">
                        {template.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleUsePublicTemplate(template)}
                        className="mt-4 h-9 w-full rounded-md bg-[#26752C] text-sm font-bold text-white hover:bg-[#1f6425]"
                      >
                        USE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
