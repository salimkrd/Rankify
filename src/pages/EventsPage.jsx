import React, { useEffect, useMemo, useState } from "react";
import { Copy, Edit, MoreVertical, Plug, Plus, Trash2, X } from "lucide-react";
import {
  clearStoredActiveEventId,
  resolveActiveEventFromEvents,
  setStoredActiveEventId,
} from "../services/activeEventService.js";
import { createEvent, deleteEvent, getEvents, updateEvent } from "../services/eventsService.js";

const emptyForm = {
  name: "",
  organizer: "",
  date: "",
  location: "",
  logoName: "",
};

function notifyEventsChanged() {
  window.dispatchEvent(new Event("rankify-events-changed"));
  window.dispatchEvent(new Event("rankify-data-changed"));
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function syncEventsAndActiveEvent() {
      setLoading(true);
      setError("");
      try {
        const stored = await getEvents();
        setEvents(stored);
        setActiveEventId(resolveActiveEventFromEvents(stored).activeEventId);
      } catch (loadError) {
        setError(loadError.message || "Unable to load events.");
      } finally {
        setLoading(false);
      }
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

  async function handleSubmitEvent(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Event name is required");
      return;
    }

    if (editingEvent) {
      try {
        const updated = await updateEvent(editingEvent.id, {
          name: form.name.trim(),
          organizer: form.organizer.trim(),
          date: form.date.trim(),
          location: form.location.trim(),
        });
        setEvents((current) => current.map((item) => (item.id === editingEvent.id ? updated : item)));
        notifyEventsChanged();
        closeModal();
      } catch (saveError) {
        setError(saveError.message || "Unable to update event.");
      }
      return;
    }

    try {
      const newEvent = await createEvent({
        name: form.name.trim(),
        organizer: form.organizer.trim(),
        date: form.date.trim(),
        location: form.location.trim(),
      });
      setEvents((current) => [newEvent, ...current]);
      notifyEventsChanged();

      if (!activeEventId) {
        setStoredActiveEventId(newEvent.id);
        setActiveEventId(newEvent.id);
        window.dispatchEvent(new Event("rankify-active-event-changed"));
      }

      closeModal();
    } catch (saveError) {
      setError(saveError.message || "Unable to create event.");
    }
  }

  function handleSelectEvent(eventId) {
    setStoredActiveEventId(eventId);
    setActiveEventId(eventId);
    setOpenMenuId("");
    window.dispatchEvent(new Event("rankify-active-event-changed"));
  }

  async function handleDeleteEvent(eventId) {
    const confirmed = window.confirm("Are you sure you want to delete this event?");
    if (!confirmed) return;

    try {
      await deleteEvent(eventId);
      const updatedEvents = events.filter((event) => event.id !== eventId);
      setEvents(updatedEvents);
      notifyEventsChanged();

      if (activeEventId === eventId) {
        clearStoredActiveEventId();
        setActiveEventId("");
        window.dispatchEvent(new Event("rankify-active-event-changed"));
      }

      setOpenMenuId("");
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete event.");
    }
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
    <div className="app-page overflow-x-hidden px-6 py-6 max-sm:px-4">
      <div className="max-w-[1080px] space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="app-heading text-2xl font-bold tracking-tight">
              Manage Events
            </h1>
            <p className="app-muted mt-1">
              View, create, edit, and delete your events
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="app-success-btn inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold shadow-sm hover:opacity-90"
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
            className="app-input h-10 w-[430px] max-w-full rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
          />
          <button
            type="button"
            className="app-card h-10 rounded-md border px-5 text-sm font-medium shadow-sm"
          >
            All ({filteredEvents.length})
          </button>
        </div>

        {error && (
          <div className="app-card rounded-lg border border-[var(--app-danger)] p-4 text-sm text-[var(--app-danger)]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="app-card rounded-xl border p-8 text-center">
            <p className="app-muted text-sm font-semibold">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="app-card rounded-xl border border-dashed p-8 text-center">
            <p className="app-heading text-lg font-semibold">
              {events.length === 0 ? "No events yet" : "No events found"}
            </p>
            <p className="app-muted mt-2 text-sm">
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
                className="app-card relative flex min-h-[230px] flex-col rounded-xl border p-6 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenuId((current) =>
                      current === event.id ? "" : event.id
                    )
                  }
                  className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none text-[var(--app-heading)] hover:bg-[var(--app-surface-elevated)]"
                  aria-label="Event actions"
                >
                  <MoreVertical size={18} strokeWidth={1.9} aria-hidden="true" />
                </button>

                {openMenuId === event.id && (
                  <div className="app-dropdown absolute right-6 top-14 z-50 w-[230px] rounded-md border py-2 shadow-lg">
                    <p className="app-heading px-4 pb-2 text-sm font-semibold">
                      Actions
                    </p>
                    <button
                      type="button"
                      onClick={() => openEditModal(event)}
                      className="app-text block w-full px-4 py-2 text-left text-sm hover:bg-[var(--app-sidebar-active-bg)] hover:text-[var(--app-sidebar-active-text)]"
                    >
                      <Edit className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleIntegrations}
                      className="app-text block w-full px-4 py-2 text-left text-sm hover:bg-[var(--app-surface-elevated)]"
                    >
                      <Plug className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                      Integrations
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(event.id)}
                      className="app-text block w-full px-4 py-2 text-left text-sm hover:bg-[var(--app-surface-elevated)]"
                    >
                      <Copy className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                      Copy Results Page URL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(event.id)}
                      className="block w-full border-t border-[var(--app-border)] px-4 py-2 text-left text-sm text-[var(--app-danger)] hover:bg-[var(--app-danger-bg-soft)]"
                    >
                      <Trash2 className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                )}

                <div className="pr-10">
                  {isActive && (
                    <span className="app-badge mb-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold">
                      Active
                    </span>
                  )}
                  <h2 className="app-heading truncate text-lg font-bold uppercase">
                    {event.name}
                  </h2>
                </div>

                <div className="app-muted mt-3 space-y-2 text-sm">
                  <p>Organizer: {event.organizer}</p>
                  <p>Date: {event.date}</p>
                  <p>Location: {event.location}</p>
                  <p className="pt-2 text-xs">Created: {event.created}</p>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
                  <button
                    type="button"
                    onClick={handleIntegrations}
                    className="app-card h-10 flex-1 rounded-md border text-sm font-semibold hover:bg-[var(--app-surface-elevated)]"
                  >
                    Integrations
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectEvent(event.id)}
                    className="app-card h-10 flex-1 rounded-md border text-sm font-semibold hover:bg-[var(--app-surface-elevated)]"
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
          <div className="app-modal relative w-full max-w-[520px] rounded-xl p-6 shadow-2xl max-sm:max-w-[calc(100vw-24px)] max-sm:p-5">
            <button
              type="button"
              onClick={closeModal}
              className="app-muted absolute right-4 top-4 text-2xl leading-none hover:text-[var(--app-heading)]"
              aria-label="Close modal"
            >
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>

            <h2 className="app-heading text-xl font-bold">
              {editingEvent ? "Edit Event" : "Create New Event"}
            </h2>
            <p className="app-muted mt-1 text-sm">
              {editingEvent
                ? "Make changes to your event."
                : "Create a new event to get started."}
            </p>

            <form onSubmit={handleSubmitEvent} className="mt-8 space-y-4">
              <div className="grid grid-cols-[110px_1fr] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="app-heading text-sm font-medium">
                  Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  autoFocus
                  className="app-input h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                />
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="app-heading text-sm font-medium">
                  Organizer
                </label>
                <input
                  name="organizer"
                  value={form.organizer}
                  onChange={handleFormChange}
                  className="app-input h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                />
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="app-heading text-sm font-medium">
                  Date(s)
                </label>
                <input
                  name="date"
                  value={form.date}
                  onChange={handleFormChange}
                  className="app-input h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                />
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="app-heading text-sm font-medium">
                  Location
                </label>
                <input
                  name="location"
                  value={form.location}
                  onChange={handleFormChange}
                  className="app-input h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                />
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="app-heading text-sm font-medium">
                  Event Logo
                </label>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="app-text block w-full text-sm"
                  />
                  <p className="app-muted mt-1 text-xs">
                    {form.logoName || "No logo selected."}
                  </p>
                  <p className="app-muted text-xs">Max file size: 2 MB</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="app-card h-10 rounded-md border px-4 text-sm font-medium hover:bg-[var(--app-surface-elevated)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="app-success-btn h-10 rounded-md px-4 text-sm font-semibold hover:opacity-90"
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
