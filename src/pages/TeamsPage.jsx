import React, { useEffect, useMemo, useState } from "react";
import { Edit, MoreVertical, Plus, Trash2, X } from "lucide-react";
import { getUserStorageKey } from "../utils/storage.js";
import NoActiveEventState from "../components/NoActiveEventState.jsx";

const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const TEAMS_KEY = "rankify_teams";

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

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function getStoredEvents() {
  const storedEvents = safeJsonParse(localStorage.getItem(getUserStorageKey(EVENTS_KEY)), []);
  return Array.isArray(storedEvents) ? storedEvents : [];
}

function getStoredTeams() {
  const storedTeams = safeJsonParse(localStorage.getItem(getUserStorageKey(TEAMS_KEY)), {});
  return storedTeams && typeof storedTeams === "object" && !Array.isArray(storedTeams)
    ? storedTeams
    : {};
}

function getValidActiveEventId(events) {
  const storedActiveId = localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY));
  const storedActiveEvent = events.find((event) => event.id === storedActiveId);

  if (storedActiveEvent) {
    return storedActiveId;
  }

  localStorage.removeItem(getUserStorageKey(ACTIVE_EVENT_KEY));
  return "";
}

function getToday() {
  return new Date().toLocaleDateString("en-US");
}

export default function TeamsPage() {
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [teamsByEvent, setTeamsByEvent] = useState({});
  const [openMenuId, setOpenMenuId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamName, setTeamName] = useState("");

  useEffect(() => {
    function syncFromLocalStorage() {
      const storedEvents = getStoredEvents();
      const validActiveId = getValidActiveEventId(storedEvents);
      const storedTeams = getStoredTeams();

      setEvents(storedEvents);
      setActiveEventId(validActiveId);
      setTeamsByEvent(storedTeams);
    }

    syncFromLocalStorage();

    window.addEventListener("focus", syncFromLocalStorage);
    window.addEventListener("storage", syncFromLocalStorage);
    window.addEventListener("rankify-active-event-changed", syncFromLocalStorage);

    return () => {
      window.removeEventListener("focus", syncFromLocalStorage);
      window.removeEventListener("storage", syncFromLocalStorage);
      window.removeEventListener(
        "rankify-active-event-changed",
        syncFromLocalStorage
      );
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

  function persistTeamsForActiveEvent(nextTeams) {
    if (!activeEventId) return;

    const storedTeams = getStoredTeams();
    const updatedTeamsByEvent = {
      ...storedTeams,
      [activeEventId]: nextTeams,
    };

    localStorage.setItem(getUserStorageKey(TEAMS_KEY), JSON.stringify(updatedTeamsByEvent));
    setTeamsByEvent(updatedTeamsByEvent);
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

  function handleSubmit(event) {
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
      const updatedTeams = currentTeams.map((team) =>
        team.id === editingTeam.id ? { ...team, name: teamName.trim() } : team
      );

      persistTeamsForActiveEvent(updatedTeams);
      closeModal();
      return;
    }

    const newTeam = {
      id: `team_${Date.now()}`,
      name: teamName.trim(),
      created: getToday(),
    };

    persistTeamsForActiveEvent([...currentTeams, newTeam]);
    closeModal();
  }

  function handleDeleteTeam(teamId) {
    if (!activeEventId) return;

    const confirmed = window.confirm("Are you sure you want to delete this team?");
    if (!confirmed) return;

    const currentTeams = teamsByEvent[activeEventId] || [];
    const updatedTeams = currentTeams.filter((team) => team.id !== teamId);

    persistTeamsForActiveEvent(updatedTeams);
    setOpenMenuId("");
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

        {!activeEventId && <NoActiveEventState />}

        {activeEventId && <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
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
