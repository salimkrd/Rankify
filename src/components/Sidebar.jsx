import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const TEAMS_KEY = "rankify_teams";
const CATEGORIES_KEY = "rankify_categories";
const PROGRAM_TEMPLATES_KEY = "rankify_program_templates";

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

const sections = [
  {
    label: "EVENT",
    links: [
      { label: "Dashboard", to: "/dashboard", icon: "▥", end: true },
      { label: "Events", to: "/dashboard/events", icon: "▣", countKey: "events" },
      { label: "Integrations", to: "/dashboard/integrations", icon: "⌁" },
      { label: "Public Page", to: "/dashboard/public-page", icon: "◎" },
      { label: "Images", to: "/dashboard/images", icon: "▧" },
    ],
  },
  {
    label: "PROGRAM POSTERS",
    links: [
      {
        label: "Templates",
        to: "/dashboard/program-templates",
        icon: "▤",
        countKey: "programTemplates",
      },
      { label: "Results", to: "/dashboard/program-results", icon: "▥" },
    ],
  },
  {
    label: "TEAM STATUS",
    links: [
      { label: "Templates", to: "/dashboard/team-status/templates", icon: "♕" },
      { label: "Results", to: "/dashboard/team-status/results", icon: "↗" },
    ],
  },
  {
    label: "FRAMED POSTS",
    links: [
      { label: "Templates", to: "/dashboard/framed-posts/templates", icon: "#" },
      { label: "My Posts", to: "/dashboard/framed-posts/my-posts", icon: "▱" },
    ],
  },
  {
    label: "CERTIFICATES",
    links: [
      { label: "Templates", to: "/dashboard/certificates/templates", icon: "▤" },
      { label: "Results", to: "/dashboard/certificates/results", icon: "⌾" },
    ],
  },
  {
    label: "DATA",
    links: [
      { label: "Teams", to: "/dashboard/teams", icon: "♙", countKey: "teams" },
      { label: "Categories", to: "/dashboard/categories", icon: "▰", countKey: "categories" },
    ],
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

function getEventsCount() {
  const storedEvents = safeJsonParse(localStorage.getItem(EVENTS_KEY), []);

  if (Array.isArray(storedEvents)) {
    return storedEvents.length;
  }

  return 0;
}

function getValidActiveEventId(events) {
  const storedActiveId = localStorage.getItem(ACTIVE_EVENT_KEY);
  const isValid = events.some((event) => event.id === storedActiveId);

  if (isValid) {
    return storedActiveId;
  }

  const firstEventId = events[0]?.id || "";

  if (firstEventId) {
    localStorage.setItem(ACTIVE_EVENT_KEY, firstEventId);
  } else {
    localStorage.removeItem(ACTIVE_EVENT_KEY);
  }

  return firstEventId;
}

function getGroupedCount(storageKey, activeEventId) {
  if (!activeEventId) return 0;

  const storedData = safeJsonParse(localStorage.getItem(storageKey), {});

  if (Array.isArray(storedData)) {
    return storedData.filter((item) => item?.eventId === activeEventId).length;
  }

  const activeItems = storedData?.[activeEventId];
  return Array.isArray(activeItems) ? activeItems.length : 0;
}

function SidebarLink({ link, counts }) {
  const count =
    link.countKey && Object.prototype.hasOwnProperty.call(counts, link.countKey)
      ? counts[link.countKey]
      : link.count;

  return (
    <NavLink
      to={link.to}
      end={link.end}
      className={({ isActive }) =>
        [
          "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
          isActive
            ? "bg-[#E8F3EA] text-[#26752C]"
            : "text-gray-700 hover:bg-gray-100 hover:text-[#0D1B2A]",
        ].join(" ")
      }
    >
      <span className="w-4 shrink-0 text-center text-base leading-none">
        {link.icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{link.label}</span>
      {typeof count === "number" && (
        <span className="rounded-md bg-[#DCEFD9] px-2 py-0.5 text-xs font-bold text-[#26752C]">
          {count}
        </span>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [counts, setCounts] = useState({
    events: 0,
    teams: 0,
    categories: 0,
    programTemplates: 0,
  });

  useEffect(() => {
    function syncActiveEvent() {
      const storedEvents = getStoredEvents();
      const validActiveEventId = getValidActiveEventId(storedEvents);

      setEvents(storedEvents);
      setActiveEventId(validActiveEventId);
      setCounts({
        events: getEventsCount(),
        teams: getGroupedCount(TEAMS_KEY, validActiveEventId),
        categories: getGroupedCount(CATEGORIES_KEY, validActiveEventId),
        programTemplates: getGroupedCount(
          PROGRAM_TEMPLATES_KEY,
          validActiveEventId
        ),
      });
    }

    syncActiveEvent();

    window.addEventListener("storage", syncActiveEvent);
    window.addEventListener("rankify-active-event-changed", syncActiveEvent);
    window.addEventListener("rankify-data-changed", syncActiveEvent);
    window.addEventListener("rankify-events-changed", syncActiveEvent);

    const refreshInterval = window.setInterval(syncActiveEvent, 1000);

    return () => {
      window.removeEventListener("storage", syncActiveEvent);
      window.removeEventListener("rankify-active-event-changed", syncActiveEvent);
      window.removeEventListener("rankify-data-changed", syncActiveEvent);
      window.removeEventListener("rankify-events-changed", syncActiveEvent);
      window.clearInterval(refreshInterval);
    };
  }, []);

  function handleActiveEventChange(event) {
    const nextEventId = event.target.value;

    localStorage.setItem(ACTIVE_EVENT_KEY, nextEventId);
    setActiveEventId(nextEventId);
    window.dispatchEvent(new Event("rankify-active-event-changed"));
  }

  return (
    <aside className="fixed bottom-0 left-0 top-0 z-40 flex w-[260px] flex-col border-r border-gray-200 bg-white">
      <div className="flex h-[62px] shrink-0 items-center gap-3 border-b border-gray-200 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#26752C] text-sm font-bold text-white">
          P
        </div>
        <div className="text-lg font-bold text-[#0D1B2A]">PosterGen</div>
      </div>

      <div className="shrink-0 border-b border-gray-100 px-3 py-4">
        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
          Active Event
        </p>
        <select
          value={activeEventId}
          onChange={handleActiveEventChange}
          className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-[#0D1B2A] shadow-sm outline-none focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.label} className="mb-6">
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
              {section.label}
            </p>
            <nav className="space-y-1">
              {section.links.map((link) => (
                <SidebarLink key={link.to} link={link} counts={counts} />
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-gray-200 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DCEFD9] text-sm font-bold text-[#26752C]">
            SK
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#0D1B2A]">
              Salim karakkad
            </p>
            <p className="truncate text-xs text-gray-500">salimkrd66@gmail...</p>
          </div>
          <button
            type="button"
            onClick={() => alert("Logout coming soon")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-[#0D1B2A]"
            aria-label="Logout"
          >
            ↪
          </button>
        </div>
      </div>
    </aside>
  );
}
