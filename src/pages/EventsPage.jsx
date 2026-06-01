import React, { useEffect, useMemo, useState } from "react";
import { Copy, Edit, MoreVertical, Plug, Plus, Trash2, X } from "lucide-react";
import {
  getUserStorageItem,
  setUserStorageItem,
  removeUserStorageItem,
} from "../utils/storage.js";

const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";

const demoEvents = [
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

const emptyForm = {
  name: "",
  organizer: "",
  date: "",
  location: "",
  logoName: "",
};

function readStoredEvents() {
  try {
    const raw = getUserStorageItem(EVENTS_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasInvalidTestEvents(events) {
  return events.some(
    (event) =>
      !event ||
      !event.name ||
      !event.organizer ||
      !event.date ||
      !event.location
  );
}

function getValidActiveEventId(events) {
  const storedActiveId = getUserStorageItem(ACTIVE_EVENT_KEY);
  const isValid = storedActiveId && events.some((event) => event.id === storedActiveId);

  if (isValid) {
    return storedActiveId;
  }

  removeUserStorageItem(ACTIVE_EVENT_KEY);
  return "";
}

function getToday() {
  return new Date().toLocaleDateString("en-US");
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    function syncEventsAndActiveEvent() {
      const stored = readStoredEvents();
      setEvents(stored);
      setActiveEventId(getValidActiveEventId(stored));
    }

    syncEventsAndActiveEvent();

    window.addEventListener("storage", syncEventsAndActiveEvent);
    window.addEventListener("rankify-active-event-changed", syncEventsAndActiveEvent);

    return () => {
      window.removeEventListener("storage", syncEventsAndActiveEvent);
      window.removeEventListener(
        "rankify-active-event-changed",
        syncEventsAndActiveEvent
      );
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return events;

    return events.filter((event) =>
      [event.name, event.organizer, event.location].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [events, search]);

  function persistEvents(nextEvents) {
    setUserStorageItem(EVENTS_KEY, JSON.stringify(nextEvents));
    setEvents(nextEvents);
  }

  function openCreateModal() {
    setEditingEvent(null);
    setForm(emptyForm);
    setModalOpen(true);
    setOpenMenuId("");
  }

  function openEditModal(event) {
    setEditingEvent(event);
    setForm({
      name: event.name || "",
      organizer: event.organizer || "",
      date: event.date || "",
      location: event.location || "",
      logoName: event.logoName || "",
    });
    setModalOpen(true);
    setOpenMenuId("");
  }

  function closeModal() {
    setModalOpen(false);
    setEditingEvent(null);
    setForm(emptyForm);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleLogoChange(event) {
    const file = event.target.files?.[0];
    setForm((current) => ({ ...current, logoName: file?.name || "" }));
  }

  function handleSubmitEvent(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Event name is required");
      return;
    }

    if (editingEvent) {
      const updatedEvents = events.map((item) =>
        item.id === editingEvent.id
          ? {
              ...item,
              name: form.name.trim(),
              organizer: form.organizer.trim(),
              date: form.date.trim(),
              location: form.location.trim(),
              logoName: form.logoName,
            }
          : item
      );

      persistEvents(updatedEvents);
      closeModal();
      return;
    }

    const newEvent = {
      id: `event_${Date.now()}`,
      name: form.name.trim(),
      organizer: form.organizer.trim(),
      date: form.date.trim(),
      location: form.location.trim(),
      logoName: form.logoName,
      created: getToday(),
    };

    const updatedEvents = [...events, newEvent];
    persistEvents(updatedEvents);

    if (!activeEventId) {
      setUserStorageItem(ACTIVE_EVENT_KEY, newEvent.id);
      setActiveEventId(newEvent.id);
      window.dispatchEvent(new Event("rankify-active-event-changed"));
    }

    closeModal();
  }

  function handleSelectEvent(eventId) {
    setUserStorageItem(ACTIVE_EVENT_KEY, eventId);
    setActiveEventId(eventId);
    setOpenMenuId("");
    window.dispatchEvent(new Event("rankify-active-event-changed"));
  }

  function handleDeleteEvent(eventId) {
    const confirmed = window.confirm("Are you sure you want to delete this event?");
    if (!confirmed) return;

    const updatedEvents = events.filter((event) => event.id !== eventId);
    persistEvents(updatedEvents);

    if (activeEventId === eventId) {
      const nextActiveId = updatedEvents[0]?.id || "";
      if (nextActiveId) {
        setUserStorageItem(ACTIVE_EVENT_KEY, nextActiveId);
      } else {
        removeUserStorageItem(ACTIVE_EVENT_KEY);
      }
      setActiveEventId(nextActiveId);
      window.dispatchEvent(new Event("rankify-active-event-changed"));
    }

    setOpenMenuId("");
  }

  function handleCopyUrl(eventId) {
    const url = `${window.location.origin}/public/results/${eventId}`;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    }

    alert("Results Page URL copied");
    setOpenMenuId("");
  }

  function handleIntegrations() {
    alert("Integrations page coming soon");
    setOpenMenuId("");
  }

  return (
    <div className="overflow-x-hidden px-6 py-6 max-sm:px-4">
      <div className="max-w-[1080px] space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0D1B2A]">
              Manage Events
            </h1>
            <p className="mt-1 text-gray-600">
              View, create, edit, and delete your events
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#26752C] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1f6425]"
          >
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            Create New Event
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search events..."
            className="h-10 w-[430px] max-w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
          />
          <button
            type="button"
            className="h-10 rounded-md border border-gray-300 bg-white px-5 text-sm font-medium text-[#0D1B2A] shadow-sm"
          >
            All ({filteredEvents.length})
          </button>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
            <p className="text-lg font-semibold text-[#0D1B2A]">
              {events.length === 0 ? "No events yet" : "No events found"}
            </p>
            <p className="mt-2 text-sm">
              {events.length === 0
                ? "Create a new event to get started."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {filteredEvents.map((event) => {
            const isActive = event.id === activeEventId;

            return (
              <div
                key={event.id}
                className="relative flex min-h-[230px] flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenuId((current) =>
                      current === event.id ? "" : event.id
                    )
                  }
                  className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none text-[#0D1B2A] hover:bg-gray-100"
                  aria-label="Event actions"
                >
                  <MoreVertical size={18} strokeWidth={1.9} aria-hidden="true" />
                </button>

                {openMenuId === event.id && (
                  <div className="absolute right-6 top-14 z-50 w-[230px] rounded-md border border-gray-200 bg-white py-2 shadow-lg">
                    <p className="px-4 pb-2 text-sm font-semibold text-[#0D1B2A]">
                      Actions
                    </p>
                    <button
                      type="button"
                      onClick={() => openEditModal(event)}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-[#E8F3EA] hover:text-[#26752C]"
                    >
                      <Edit className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleIntegrations}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Plug className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                      Integrations
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(event.id)}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                      Copy Results Page URL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(event.id)}
                      className="block w-full border-t border-gray-100 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                )}

                <div className="pr-10">
                  {isActive && (
                    <span className="mb-2 inline-flex rounded-full bg-[#E8F3EA] px-3 py-1 text-xs font-semibold text-[#26752C]">
                      Active
                    </span>
                  )}
                  <h2 className="truncate text-lg font-bold uppercase text-[#0D1B2A]">
                    {event.name}
                  </h2>
                </div>

                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <p>Organizer: {event.organizer}</p>
                  <p>Date: {event.date}</p>
                  <p>Location: {event.location}</p>
                  <p className="pt-2 text-xs">Created: {event.created}</p>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
                  <button
                    type="button"
                    onClick={handleIntegrations}
                    className="h-10 flex-1 rounded-md border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50"
                  >
                    Integrations
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectEvent(event.id)}
                    className="h-10 flex-1 rounded-md border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50"
                  >
                    Select Event
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="relative w-full max-w-[520px] rounded-xl bg-white p-6 shadow-2xl max-sm:max-w-[calc(100vw-24px)] max-sm:p-5">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 text-2xl leading-none text-gray-500 hover:text-gray-900"
              aria-label="Close modal"
            >
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>

            <h2 className="text-xl font-bold text-[#0D1B2A]">
              {editingEvent ? "Edit Event" : "Create New Event"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {editingEvent
                ? "Make changes to your event."
                : "Create a new event to get started."}
            </p>

            <form onSubmit={handleSubmitEvent} className="mt-8 space-y-4">
              <div className="grid grid-cols-[110px_1fr] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="text-sm font-medium text-[#0D1B2A]">
                  Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  autoFocus
                  className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="text-sm font-medium text-[#0D1B2A]">
                  Organizer
                </label>
                <input
                  name="organizer"
                  value={form.organizer}
                  onChange={handleFormChange}
                  className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="text-sm font-medium text-[#0D1B2A]">
                  Date(s)
                </label>
                <input
                  name="date"
                  value={form.date}
                  onChange={handleFormChange}
                  className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="text-sm font-medium text-[#0D1B2A]">
                  Location
                </label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleFormChange}
                  className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="text-sm font-medium text-[#0D1B2A]">
                  Event Logo
                </label>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-gray-600"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {form.logoName || "No logo selected."}
                  </p>
                  <p className="text-xs text-gray-500">Max file size: 2 MB</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-10 rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-md bg-[#26752C] px-4 text-sm font-semibold text-white hover:bg-[#1f6425]"
                >
                  {editingEvent ? "Update Event" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
