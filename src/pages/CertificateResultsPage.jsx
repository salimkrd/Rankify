import React, { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileSearch, Trash2 } from "lucide-react";
import { getUserStorageKey } from "../utils/storage.js";
import NoActiveEventState from "../components/NoActiveEventState.jsx";

const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const STORAGE_KEY = "rankify_certificate_results";

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([eventId, items]) =>
      Array.isArray(items) ? items.map((item) => ({ ...item, eventId: item.eventId || eventId })) : []
    );
  }
  return [];
}

function readEvents() {
  return asArray(safeJsonParse(localStorage.getItem(getUserStorageKey(EVENTS_KEY)), []));
}

function readResults() {
  const baseResults = asArray(safeJsonParse(localStorage.getItem(STORAGE_KEY), []));
  if (baseResults.length > 0) return baseResults;
  return asArray(safeJsonParse(localStorage.getItem(getUserStorageKey(STORAGE_KEY)), []));
}

function getActiveEvent(events) {
  const activeEventId = localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY)) || "";
  if (!activeEventId) return null;
  return events.find((event) => String(event.id) === String(activeEventId)) || null;
}

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US");
}

export default function CertificateResultsPage() {
  const [activeEvent, setActiveEvent] = useState(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    function load() {
      const events = readEvents();
      setActiveEvent(getActiveEvent(events));
      setResults(readResults());
    }

    load();
    window.addEventListener("storage", load);
    window.addEventListener("rankify-active-event-changed", load);
    window.addEventListener("rankify-data-changed", load);
    window.addEventListener("rankify-events-changed", load);

    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("rankify-active-event-changed", load);
      window.removeEventListener("rankify-data-changed", load);
      window.removeEventListener("rankify-events-changed", load);
    };
  }, []);

  const eventResults = useMemo(
    () => (activeEvent?.id ? results.filter((result) => String(result.eventId) === String(activeEvent.id)) : []),
    [activeEvent?.id, results]
  );

  function handleDelete(resultId) {
    const confirmed = window.confirm("Delete this certificate result?");
    if (!confirmed) return;
    const nextResults = results.filter(
      (result) => !(String(result.id) === String(resultId) && String(result.eventId) === String(activeEvent?.id))
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextResults));
    setResults(nextResults);
    window.dispatchEvent(new Event("rankify-data-changed"));
  }

  return (
    <section className="app-page min-h-screen w-full overflow-x-hidden px-6 py-9 max-sm:px-4">
      <div className="w-full max-w-full">
        <h1 className="app-heading break-words text-[30px] font-extrabold leading-tight max-sm:text-2xl">Certificate Results</h1>
        <p className="app-muted mt-4 break-words text-2xl leading-snug max-sm:text-lg">
          {activeEvent?.name
            ? `View generated certificates for ${activeEvent.name}`
            : "View generated certificates"}
        </p>

        {!activeEvent?.id ? (
          <NoActiveEventState />
        ) : eventResults.length === 0 ? (
          <div className="app-surface mt-12 flex min-h-[220px] w-full items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] px-6 text-center max-sm:px-4">
            <div>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-surface-elevated)] text-[var(--app-muted)]">
                <FileSearch size={38} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <h2 className="app-heading text-2xl font-extrabold leading-tight max-sm:text-xl">No Certificates Found</h2>
              <p className="app-text mt-3 text-xl max-sm:text-base">
                No certificates have been generated for this event yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid max-w-full grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
            {eventResults.map((result) => (
              <article key={result.id} className="app-card min-w-0 overflow-hidden rounded-xl border shadow-sm">
                <div className="flex h-44 items-center justify-center bg-[var(--app-surface-elevated)]">
                  {result.previewImage || result.image ? (
                    <img src={result.previewImage || result.image} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="app-muted text-sm font-semibold">Certificate Preview</span>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="app-heading truncate text-lg font-bold">
                    {result.candidateName || result.name || "Unnamed Candidate"}
                  </h2>
                  <p className="app-text mt-1 truncate text-sm">{result.programName || "Untitled Program"}</p>
                  <p className="app-muted mt-2 text-sm">
                    {[result.position, result.team, result.category].filter(Boolean).join(" / ") || "No result details"}
                  </p>
                  <p className="app-muted mt-3 text-xs">Created: {formatDate(result.createdAt)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className="app-card rounded-md border px-3 py-2 text-sm font-semibold hover:bg-[var(--app-surface-elevated)]">
                      <Eye className="mr-2 inline-block align-[-2px]" size={16} strokeWidth={1.9} aria-hidden="true" />
                      View
                    </button>
                    <button type="button" className="app-card rounded-md border px-3 py-2 text-sm font-semibold hover:bg-[var(--app-surface-elevated)]">
                      <Download className="mr-2 inline-block align-[-2px]" size={16} strokeWidth={1.9} aria-hidden="true" />
                      Download
                    </button>
                    <button type="button" onClick={() => handleDelete(result.id)} className="rounded-md px-3 py-2 text-sm font-semibold text-[var(--app-danger)] hover:bg-[var(--app-danger-bg-soft)]">
                      <Trash2 className="mr-2 inline-block align-[-2px]" size={16} strokeWidth={1.9} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
