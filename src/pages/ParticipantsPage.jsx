import React, { useEffect, useMemo, useState } from "react";
import { Edit, MoreVertical, Plus, Trash2, X } from "lucide-react";
import NoActiveEventState from "../components/NoActiveEventState.jsx";
import { getEvents } from "../services/eventsService.js";
import { resolveActiveEventFromEvents } from "../services/activeEventService.js";
import { getTeamsByEvent } from "../services/teamsService.js";
import { getCategoriesByEvent } from "../services/categoriesService.js";
import {
  createParticipant,
  deleteParticipant,
  getParticipantsByEvent,
  updateParticipant,
} from "../services/participantsService.js";

export default function ParticipantsPage() {
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [teamsByEvent, setTeamsByEvent] = useState({});
  const [categoriesByEvent, setCategoriesByEvent] = useState({});
  const [participantsByEvent, setParticipantsByEvent] = useState({});
  const [openMenuId, setOpenMenuId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [participantName, setParticipantName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function syncFromSupabase() {
    setLoading(true);
    setError("");
    try {
      const storedEvents = await getEvents();
      const { activeEventId: validActiveId } = resolveActiveEventFromEvents(storedEvents);
      const [eventTeams, eventCategories, eventParticipants] = validActiveId
        ? await Promise.all([
            getTeamsByEvent(validActiveId),
            getCategoriesByEvent(validActiveId),
            getParticipantsByEvent(validActiveId),
          ])
        : [[], [], []];

      setEvents(storedEvents);
      setActiveEventId(validActiveId);
      setTeamsByEvent(validActiveId ? { [validActiveId]: eventTeams } : {});
      setCategoriesByEvent(validActiveId ? { [validActiveId]: eventCategories } : {});
      setParticipantsByEvent(validActiveId ? { [validActiveId]: eventParticipants } : {});
    } catch (loadError) {
      setError(loadError.message || "Unable to load participants.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    syncFromSupabase();

    window.addEventListener("focus", syncFromSupabase);
    window.addEventListener("storage", syncFromSupabase);
    window.addEventListener("rankify-active-event-changed", syncFromSupabase);
    window.addEventListener("rankify-data-changed", syncFromSupabase);
    return () => {
      window.removeEventListener("focus", syncFromSupabase);
      window.removeEventListener("storage", syncFromSupabase);
      window.removeEventListener("rankify-active-event-changed", syncFromSupabase);
      window.removeEventListener("rankify-data-changed", syncFromSupabase);
    };
  }, []);

  const activeEvent = useMemo(
    () => events.find((event) => event.id === activeEventId) || null,
    [activeEventId, events]
  );

  const visibleTeams = useMemo(
    () => (activeEventId ? teamsByEvent[activeEventId] || [] : []),
    [activeEventId, teamsByEvent]
  );

  const visibleCategories = useMemo(
    () => (activeEventId ? categoriesByEvent[activeEventId] || [] : []),
    [activeEventId, categoriesByEvent]
  );

  const visibleParticipants = useMemo(
    () => (activeEventId ? participantsByEvent[activeEventId] || [] : []),
    [activeEventId, participantsByEvent]
  );

  function setParticipantsForActiveEvent(nextParticipants) {
    if (!activeEventId) return;
    setParticipantsByEvent((current) => ({ ...current, [activeEventId]: nextParticipants }));
    window.dispatchEvent(new Event("rankify-data-changed"));
  }

  function openCreateModal() {
    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }

    setEditingParticipant(null);
    setParticipantName("");
    setTeamId(visibleTeams[0]?.id || "");
    setCategoryId(visibleCategories[0]?.id || "");
    setModalOpen(true);
    setOpenMenuId("");
  }

  function openEditModal(participant) {
    setEditingParticipant(participant);
    setParticipantName(participant.name || "");
    setTeamId(participant.teamId || "");
    setCategoryId(participant.categoryId || "");
    setModalOpen(true);
    setOpenMenuId("");
  }

  function closeModal() {
    setModalOpen(false);
    setEditingParticipant(null);
    setParticipantName("");
    setTeamId("");
    setCategoryId("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!participantName.trim()) {
      alert("Participant name is required");
      return;
    }

    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }

    if (!teamId) {
      alert("Team is required");
      return;
    }

    if (!categoryId) {
      alert("Category is required");
      return;
    }

    const selectedTeam = visibleTeams.find((team) => team.id === teamId);
    const selectedCategory = visibleCategories.find((category) => category.id === categoryId);

    if (!selectedTeam) {
      alert("Please select a valid team.");
      return;
    }

    if (!selectedCategory) {
      alert("Please select a valid category.");
      return;
    }

    const currentParticipants = participantsByEvent[activeEventId] || [];
    const payload = {
      name: participantName.trim(),
      teamId: selectedTeam.id,
      teamName: selectedTeam.name,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
    };

    try {
      if (editingParticipant) {
        const updatedParticipant = await updateParticipant(editingParticipant.id, payload);
        setParticipantsForActiveEvent(
          currentParticipants.map((participant) =>
            participant.id === editingParticipant.id ? updatedParticipant : participant
          )
        );
      } else {
        const newParticipant = await createParticipant(activeEventId, payload);
        setParticipantsForActiveEvent([newParticipant, ...currentParticipants]);
      }
      closeModal();
    } catch (saveError) {
      setError(saveError.message || "Unable to save participant.");
    }
  }

  async function handleDeleteParticipant(participantId) {
    if (!activeEventId) return;

    const confirmed = window.confirm("Are you sure you want to delete this participant?");
    if (!confirmed) return;

    try {
      await deleteParticipant(participantId);
      const currentParticipants = participantsByEvent[activeEventId] || [];
      setParticipantsForActiveEvent(currentParticipants.filter((participant) => participant.id !== participantId));
      setOpenMenuId("");
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete participant.");
    }
  }

  return (
    <div className="app-page overflow-x-hidden px-6 py-6 max-sm:px-4">
      <div className="max-w-[1080px] space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="app-heading text-2xl font-bold tracking-tight">
              Manage Participants
            </h1>
            <p className="app-muted mt-1">
              View, create, edit, and delete participants for event:{" "}
              <span className="font-semibold">
                {activeEvent?.name || "No active event"}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={!activeEventId}
            className="app-success-btn inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold shadow-sm hover:opacity-90"
          >
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            Add Participant
          </button>
        </div>

        {error && (
          <div className="app-card rounded-lg border border-[var(--app-danger)] p-4 text-sm text-[var(--app-danger)]">
            {error}
          </div>
        )}

        {!activeEventId ? (
          <NoActiveEventState />
        ) : loading ? (
          <div className="app-card rounded-xl border p-8 text-center">
            <p className="app-muted text-sm font-semibold">Loading participants...</p>
          </div>
        ) : visibleParticipants.length === 0 ? (
          <div className="app-card rounded-xl border p-6 shadow-sm">
            <h2 className="app-heading text-lg font-bold">
              No participants found.
            </h2>
            <p className="app-muted mt-1 text-sm">
              Add your first participant to this event.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {visibleParticipants.map((participant) => (
              <div
                key={participant.id}
                className="app-card relative flex min-h-[140px] flex-col rounded-xl border p-6 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenuId((current) =>
                      current === participant.id ? "" : participant.id
                    )
                  }
                  className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none text-[var(--app-heading)] hover:bg-[var(--app-surface-elevated)]"
                  aria-label="Participant actions"
                >
                  <MoreVertical size={18} strokeWidth={1.9} aria-hidden="true" />
                </button>

                {openMenuId === participant.id && (
                  <div className="app-dropdown absolute right-6 top-14 z-50 w-[150px] rounded-md border py-2 shadow-lg">
                    <p className="app-heading px-4 pb-2 text-sm font-semibold">
                      Actions
                    </p>
                    <button
                      type="button"
                      onClick={() => openEditModal(participant)}
                      className="app-text block w-full px-4 py-3 text-left text-sm hover:bg-[var(--app-sidebar-active-bg)] hover:text-[var(--app-sidebar-active-text)]"
                    >
                      <Edit className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteParticipant(participant.id)}
                      className="block w-full border-t border-[var(--app-border)] px-4 py-3 text-left text-sm text-[var(--app-danger)] hover:bg-[var(--app-danger-bg-soft)]"
                    >
                      <Trash2 className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                )}

                <div className="pr-10">
                  <h2 className="app-heading text-lg font-bold">
                    {participant.name}
                  </h2>
                  <p className="app-muted mt-1 text-sm">
                    Team: {participant.teamName || "No team"}
                  </p>
                  <p className="app-muted mt-1 text-sm">
                    Category: {participant.categoryName || "No category"}
                  </p>
                  <p className="app-muted mt-1 text-sm">
                    Created: {participant.createdAt}
                  </p>
                </div>
              </div>
            ))}
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
              {editingParticipant ? "Edit Participant" : "Add Participant"}
            </h2>
            <p className="app-muted mt-1 max-w-[360px] text-sm">
              {editingParticipant
                ? "Make changes to your participant here. Click save when you're done."
                : "Add a participant and assign them to a team and category."}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="app-heading min-w-0 text-sm font-medium leading-tight">
                  Participant
                  <br />
                  Name
                </label>
                <input
                  value={participantName}
                  onChange={(event) => setParticipantName(event.target.value)}
                  placeholder="e.g., Ahmed"
                  autoFocus
                  required
                  className="app-input h-10 w-full max-w-full rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                />
              </div>

              <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="app-heading min-w-0 text-sm font-medium leading-tight">
                  Team
                </label>
                <select
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value)}
                  required
                  disabled={visibleTeams.length === 0}
                  className="app-select h-10 w-full max-w-full rounded-md border px-3 text-sm shadow-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="" disabled>
                    Select team
                  </option>
                  {visibleTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              {visibleTeams.length === 0 && (
                <p className="app-muted text-sm">
                  Create a team first before adding participants.
                </p>
              )}

              <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="app-heading min-w-0 text-sm font-medium leading-tight">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  required
                  disabled={visibleCategories.length === 0}
                  className="app-select h-10 w-full max-w-full rounded-md border px-3 text-sm shadow-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {visibleCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {visibleCategories.length === 0 && (
                <p className="app-muted text-sm">
                  Create a category first before adding participants.
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={visibleTeams.length === 0 || visibleCategories.length === 0}
                  className="app-success-btn h-10 rounded-md px-4 text-sm font-semibold hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editingParticipant ? "Update Participant" : "Add Participant"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="app-card h-10 rounded-md border px-4 text-sm font-medium hover:bg-[var(--app-surface-elevated)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

