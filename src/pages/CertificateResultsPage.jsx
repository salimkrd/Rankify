import React, { useEffect, useMemo, useState } from "react";
import { getUserStorageKey } from "../utils/storage.js";

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
    <section className="min-h-screen w-full overflow-x-hidden bg-[#F8FAFC] px-6 py-9 text-[#020817]">
      <div className="w-full max-w-full">
        <h1 className="text-[30px] font-extrabold leading-tight text-[#020817]">Certificate Results</h1>
        <p className="mt-4 text-2xl leading-snug text-[#4B5563]">
          {activeEvent?.name
            ? `View generated certificates for ${activeEvent.name}`
            : "View generated certificates"}
        </p>

        {eventResults.length === 0 ? (
          <div className="mt-12 flex min-h-[220px] w-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-[#F8FAFC] px-6 text-center">
            <div>
              <h2 className="text-2xl font-extrabold leading-tight text-[#020817]">No Certificates Found</h2>
              <p className="mt-3 text-xl text-[#020817]">
                No certificates have been generated for this event yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid max-w-full grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
            {eventResults.map((result) => (
              <article key={result.id} className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex h-44 items-center justify-center bg-gray-100">
                  {result.previewImage || result.image ? (
                    <img src={result.previewImage || result.image} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-sm font-semibold text-gray-500">Certificate Preview</span>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="truncate text-lg font-bold text-[#0D1B2A]">
                    {result.candidateName || result.name || "Unnamed Candidate"}
                  </h2>
                  <p className="mt-1 truncate text-sm text-gray-600">{result.programName || "Untitled Program"}</p>
                  <p className="mt-2 text-sm text-gray-500">
                    {[result.position, result.team, result.category].filter(Boolean).join(" / ") || "No result details"}
                  </p>
                  <p className="mt-3 text-xs text-gray-400">Created: {formatDate(result.createdAt)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-[#0D1B2A] hover:bg-gray-50">
                      View
                    </button>
                    <button type="button" className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-[#0D1B2A] hover:bg-gray-50">
                      Download
                    </button>
                    <button type="button" onClick={() => handleDelete(result.id)} className="rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
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
