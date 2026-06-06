import React, { useEffect, useMemo, useState } from "react";
import { Edit, MoreVertical, Plus, Trash2, X } from "lucide-react";
import NoActiveEventState from "../components/NoActiveEventState.jsx";
import { getEvents } from "../services/eventsService.js";
import { resolveActiveEventFromEvents } from "../services/activeEventService.js";
import { DASHBOARD_CACHE_EVENT } from "../services/dashboardCache.js";
import { createTeam, deleteTeam, getTeamsByEvent, updateTeam } from "../services/teamsService.js";

export default function TeamsPage() {
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [teamsByEvent, setTeamsByEvent] = useState({});
  const [openMenuId, setOpenMenuId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function syncFromSupabase(options = {}) {
      setLoading(true);
      setError("");
      try {
        const storedEvents = await getEvents(options);
        const { activeEventId: validActiveId } = resolveActiveEventFromEvents(storedEvents);
        const eventTeams = validActiveId ? await getTeamsByEvent(validActiveId, options) : [];

        setEvents(storedEvents);
        setActiveEventId(validActiveId);
        setTeamsByEvent(validActiveId ? { [validActiveId]: eventTeams } : {});
      } catch (loadError) {
        setError(loadError.message || "Unable to load teams.");
      } finally {
        setLoading(false);
      }
    }

    syncFromSupabase();
    const syncFromCache = () => syncFromSupabase({ background: false });

    window.addEventListener("focus", syncFromSupabase);
    window.addEventListener("storage", syncFromSupabase);
    window.addEventListener("rankify-active-event-changed", syncFromSupabase);
    window.addEventListener(DASHBOARD_CACHE_EVENT, syncFromCache);

    return () => {
      window.removeEventListener("focus", syncFromSupabase);
      window.removeEventListener("storage", syncFromSupabase);
      window.removeEventListener(
        "rankify-active-event-changed",
        syncFromSupabase
      );
      window.removeEventListener(DASHBOARD_CACHE_EVENT, syncFromCache);
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

  function setTeamsForActiveEvent(nextTeams) {
    if (!activeEventId) return;
    setTeamsByEvent((current) => ({ ...current, [activeEventId]: nextTeams }));
    window.dispatchEvent(new Event("rankify-data-changed"));
  }

  function openCreateModal() {
    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }

    setEditingTeam(null);
    setTeamName("");
    setModalOpen(true);
    setOpenMenuId("");
  }

  function openEditModal(team) {
    setEditingTeam(team);
    setTeamName(team.name || "");
    setModalOpen(true);
    setOpenMenuId("");
  }

  function closeModal() {
    setModalOpen(false);
    setEditingTeam(null);
    setTeamName("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!teamName.trim()) {
      alert("Team name is required");
      return;
    }

    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }

    const currentTeams = teamsByEvent[activeEventId] || [];

    if (editingTeam) {
      try {
        const updatedTeam = await updateTeam(editingTeam.id, { name: teamName.trim() });
        const updatedTeams = currentTeams.map((team) =>
          team.id === editingTeam.id ? updatedTeam : team
        );
        setTeamsForActiveEvent(updatedTeams);
        closeModal();
      } catch (saveError) {
        setError(saveError.message || "Unable to update team.");
      }
      return;
    }

    try {
      const newTeam = await createTeam(activeEventId, { name: teamName.trim() });
      setTeamsForActiveEvent([newTeam, ...currentTeams]);
      closeModal();
    } catch (saveError) {
      setError(saveError.message || "Unable to create team.");
    }
  }

  async function handleDeleteTeam(teamId) {
    if (!activeEventId) return;

    const confirmed = window.confirm("Are you sure you want to delete this team?");
    if (!confirmed) return;

    try {
      await deleteTeam(teamId);
      const currentTeams = teamsByEvent[activeEventId] || [];
      const updatedTeams = currentTeams.filter((team) => team.id !== teamId);
      setTeamsForActiveEvent(updatedTeams);
      setOpenMenuId("");
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete team.");
    }
  }

  return (
    <div className="app-page overflow-x-hidden px-6 py-6 max-sm:px-4">
      <div className="max-w-[1080px] space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="app-heading text-2xl font-bold tracking-tight">
              Manage Teams
            </h1>
            <p className="app-muted mt-1">
              View, create, edit, and delete teams for event:{" "}
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
            Create New Team
          </button>
        </div>

        {error && (
          <div className="app-card rounded-lg border border-[var(--app-danger)] p-4 text-sm text-[var(--app-danger)]">
            {error}
          </div>
        )}

        {!activeEventId && <NoActiveEventState />}

        {activeEventId && loading && visibleTeams.length === 0 ? (
          <div className="app-card rounded-xl border p-8 text-center">
            <p className="app-muted text-sm font-semibold">Loading teams...</p>
          </div>
        ) : activeEventId && <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {visibleTeams.map((team) => (
            <div
              key={team.id}
              className="app-card relative flex min-h-[140px] flex-col rounded-xl border p-6 shadow-sm"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenMenuId((current) => (current === team.id ? "" : team.id))
                }
                className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none text-[var(--app-heading)] hover:bg-[var(--app-surface-elevated)]"
                aria-label="Team actions"
              >
                <MoreVertical size={18} strokeWidth={1.9} aria-hidden="true" />
              </button>

              {openMenuId === team.id && (
                <div className="app-dropdown absolute right-6 top-14 z-50 w-[150px] rounded-md border py-2 shadow-lg">
                  <p className="app-heading px-4 pb-2 text-sm font-semibold">
                    Actions
                  </p>
                  <button
                    type="button"
                    onClick={() => openEditModal(team)}
                    className="app-text block w-full px-4 py-3 text-left text-sm hover:bg-[var(--app-sidebar-active-bg)] hover:text-[var(--app-sidebar-active-text)]"
                  >
                    <Edit className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTeam(team.id)}
                    className="block w-full border-t border-[var(--app-border)] px-4 py-3 text-left text-sm text-[var(--app-danger)] hover:bg-[var(--app-danger-bg-soft)]"
                  >
                    <Trash2 className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              )}

              <div className="pr-10">
                <h2 className="app-heading text-lg font-bold">{team.name}</h2>
                <p className="app-muted mt-1 text-sm">
                  Created: {team.created}
                </p>
              </div>
            </div>
          ))}
        </div>}
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
              {editingTeam ? "Edit Team" : "Create New Team"}
            </h2>
            <p className="app-muted mt-1 max-w-[360px] text-sm">
              {editingTeam
                ? "Make changes to your team here. Click save when you're done."
                : "Create a new team to organize your status updates."}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-4 max-sm:grid-cols-1 max-sm:gap-2">
                <label className="app-heading min-w-0 text-sm font-medium leading-tight">
                  Team
                  <br />
                  Name
                </label>
                <input
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="e.g., Alpha Team"
                  autoFocus
                  className="app-input h-10 w-full max-w-full rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="app-success-btn h-10 rounded-md px-4 text-sm font-semibold hover:opacity-90"
                >
                  {editingTeam ? "Update Team" : "Create Team"}
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
