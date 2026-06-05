import React, { useEffect, useState } from "react";
import { NavLink, useLocation, Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  FolderOpen,
  Globe,
  Grid3X3,
  Image,
  Layers,
  LayoutDashboard,
  LogOut,
  Medal,
  Plug,
  ScrollText,
  TrendingUp,
  Trophy,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import { getUserStorageKey } from "../utils/storage.js";
import { getInitials, logoutWithSupabase } from "../utils/auth.js";
import { getEvents as getSupabaseEvents } from "../services/eventsService.js";
import { getTeamsByEvent } from "../services/teamsService.js";
import { getCategoriesByEvent } from "../services/categoriesService.js";
import { getParticipantsByEvent } from "../services/participantsService.js";
import {
  clearStoredActiveEventId,
  resolveActiveEventFromEvents,
  setStoredActiveEventId,
} from "../services/activeEventService.js";
import ThemeToggle from "./ThemeToggle.jsx";
import logoDark from "../assets/logo/rankify-logo-dark.svg";
import logoLight from "../assets/logo/rankify-logo-light.svg";

const PROGRAM_TEMPLATES_KEY = "rankify_program_templates";
const CERTIFICATE_TEMPLATES_KEY = "rankify_certificate_templates";
const CERTIFICATE_RESULTS_KEY = "rankify_certificate_results";

const sections = [
  {
    label: "EVENT",
    links: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, end: true },
      { label: "Events", to: "/dashboard/events", icon: CalendarDays, countKey: "events" },
      { label: "Integrations", to: "/dashboard/integrations", icon: Plug },
      { label: "Public Page", to: "/dashboard/public-page", icon: Globe },
      { label: "Images", to: "/dashboard/images", icon: Image },
    ],
  },
  {
    label: "PROGRAM POSTERS",
    links: [
      {
        label: "Templates",
        to: "/dashboard/program-templates",
        icon: ScrollText,
        countKey: "programTemplates",
      },
      { label: "Results", to: "/dashboard/program-results", icon: BarChart3 },
    ],
  },
  {
    label: "TEAM STATUS",
    links: [
      { label: "Templates", to: "/dashboard/team-status-templates", icon: Trophy, countKey: "teamStatusTemplates" },
      { label: "Results", to: "/dashboard/team-status-results", icon: TrendingUp, countKey: "teamStatusResults" },
    ],
  },
  {
    label: "FRAMED POSTS",
    links: [
      {
        label: "Templates",
        to: "/dashboard/framed-posts",
        icon: Grid3X3,
        activePrefix: "/dashboard/framed-posts",
        activeExcludePrefixes: ["/dashboard/framed-posts/my-posts"],
        countKey: "framedPostTemplates",
      },
      { label: "My Posts", to: "/dashboard/framed-posts/my-posts", icon: Layers },
    ],
  },
  {
    label: "CERTIFICATES",
    links: [
      {
        label: "Templates",
        to: "/dashboard/certificate-templates",
        icon: ScrollText,
        activePrefix: "/dashboard/certificate-templates",
        countKey: "certificateTemplates",
      },
      {
        label: "Results",
        to: "/dashboard/certificate-results",
        icon: Medal,
        activePrefix: "/dashboard/certificate-results",
        countKey: "certificateResults",
      },
    ],
  },
  {
    label: "DATA",
    links: [
      { label: "Teams", to: "/dashboard/teams", icon: Users, countKey: "teams" },
      { label: "Participants", to: "/dashboard/participants", icon: UserRoundPlus, countKey: "participants" },
      { label: "Categories", to: "/dashboard/categories", icon: FolderOpen, countKey: "categories" },
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

function getStoredUser() {
  const stored = safeJsonParse(localStorage.getItem("rankify_user"), null);
  if (stored && typeof stored === "object") {
    return {
      name: String(stored.name || "User").trim() || "User",
      email: String(stored.email || "").trim(),
    };
  }
  return { name: "User", email: "" };
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

function getCertificateTemplatesCount(activeEventId) {
  const baseCount = getGroupedCount(CERTIFICATE_TEMPLATES_KEY, activeEventId);
  if (baseCount > 0) return baseCount;

  return getGroupedCount(getUserStorageKey(CERTIFICATE_TEMPLATES_KEY), activeEventId);
}

function getCertificateResultsCount(activeEventId) {
  const baseCount = getGroupedCount(CERTIFICATE_RESULTS_KEY, activeEventId);
  if (baseCount > 0) return baseCount;

  return getGroupedCount(getUserStorageKey(CERTIFICATE_RESULTS_KEY), activeEventId);
}

function SidebarLink({ link, counts, onNavigate }) {
  const location = useLocation();
  const Icon = link.icon;
  const count =
    link.countKey && Object.prototype.hasOwnProperty.call(counts, link.countKey)
      ? counts[link.countKey]
      : link.count;

  const active = link.activePrefix
    ? location.pathname === link.to ||
      (location.pathname.startsWith(link.activePrefix) &&
        !link.activeExcludePrefixes?.some((prefix) =>
          location.pathname.startsWith(prefix)
        ))
    : false;

  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
          active || isActive
            ? "app-sidebar-active"
            : "app-muted hover:bg-[var(--app-sidebar-active-bg)] hover:text-[var(--app-sidebar-active-text)]",
        ].join(" ")
      }
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-current">
        <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 truncate">{link.label}</span>
      {typeof count === "number" && (
        <span className="app-badge rounded-md px-2 py-0.5 text-xs font-bold">
          {count}
        </span>
      )}
    </NavLink>
  );
}

export default function Sidebar({ mobile = false, onNavigate, onClose }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [user, setUser] = useState(getStoredUser());
  const [counts, setCounts] = useState({
    events: 0,
    teams: 0,
    participants: 0,
    categories: 0,
    programTemplates: 0,
    teamStatusTemplates: 0,
    teamStatusResults: 0,
    framedPostTemplates: 0,
    certificateTemplates: 0,
    certificateResults: 0,
  });

  useEffect(() => {
    async function syncActiveEvent() {
      let supabaseEvents = [];
      let teamsCount = 0;
      let participantsCount = 0;
      let categoriesCount = 0;

      try {
        supabaseEvents = await getSupabaseEvents();
      } catch (error) {
        console.error("Unable to load sidebar events.", error);
      }

      const { activeEventId: validActiveEventId } = resolveActiveEventFromEvents(supabaseEvents);

      if (validActiveEventId) {
        try {
          const [teams, participants, categories] = await Promise.all([
            getTeamsByEvent(validActiveEventId),
            getParticipantsByEvent(validActiveEventId),
            getCategoriesByEvent(validActiveEventId),
          ]);
          teamsCount = teams.length;
          participantsCount = participants.length;
          categoriesCount = categories.length;
        } catch (error) {
          console.error("Unable to load sidebar data counts.", error);
        }
      }

      setEvents(supabaseEvents);
      setActiveEventId(validActiveEventId);
      setCounts({
        events: supabaseEvents.length,
        teams: teamsCount,
        participants: participantsCount,
        categories: categoriesCount,
        programTemplates: getGroupedCount(
          getUserStorageKey(PROGRAM_TEMPLATES_KEY),
          validActiveEventId
        ),
        teamStatusTemplates: getGroupedCount(getUserStorageKey("rankify_team_status_templates"), validActiveEventId),
        teamStatusResults: getGroupedCount(getUserStorageKey("rankify_team_status_results"), validActiveEventId),
        framedPostTemplates: getGroupedCount(getUserStorageKey("rankify_framed_post_templates"), validActiveEventId),
        certificateTemplates: getCertificateTemplatesCount(validActiveEventId),
        certificateResults: getCertificateResultsCount(validActiveEventId),
        framedPosts: getGroupedCount(getUserStorageKey("rankify_framed_posts"), validActiveEventId),
      });
    }

    syncActiveEvent();
    setUser(getStoredUser());

    const syncUser = () => setUser(getStoredUser());

    window.addEventListener("storage", syncActiveEvent);
    window.addEventListener("storage", syncUser);
    window.addEventListener("rankify-active-event-changed", syncActiveEvent);
    window.addEventListener("rankify-data-changed", syncActiveEvent);
    window.addEventListener("rankify-events-changed", syncActiveEvent);

    const refreshInterval = window.setInterval(() => {
      syncActiveEvent();
      syncUser();
    }, 1000);

    return () => {
      window.removeEventListener("storage", syncActiveEvent);
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("rankify-active-event-changed", syncActiveEvent);
      window.removeEventListener("rankify-data-changed", syncActiveEvent);
      window.removeEventListener("rankify-events-changed", syncActiveEvent);
      window.clearInterval(refreshInterval);
    };
  }, []);

  function handleActiveEventChange(event) {
    const nextEventId = event.target.value;

    if (nextEventId) {
      setStoredActiveEventId(nextEventId);
    } else {
      clearStoredActiveEventId();
    }
    setActiveEventId(nextEventId);
    window.dispatchEvent(new Event("rankify-active-event-changed"));
  }

  async function handleLogout() {
    try {
      await logoutWithSupabase();
    } catch (error) {
      console.error("Unable to sign out from Supabase.", error);
    }
    setUser({ name: "User", email: "" });
    navigate("/login");
  }

  return (
    <aside
      className={[
        "app-sidebar bottom-0 left-0 top-0 z-40 flex w-[260px] flex-col border-r",
        mobile ? "fixed w-[min(330px,82vw)] shadow-2xl" : "fixed max-lg:hidden",
      ].join(" ")}
    >
      <Link
        to="/"
        onClick={onNavigate}
        className="app-border flex h-[62px] shrink-0 cursor-pointer items-center gap-3 border-b px-4 transition-colors hover:bg-[var(--app-sidebar-active-bg)]"
      >
        <span className="flex min-w-0 flex-1 items-center">
          <img
            src={logoLight}
            alt="Rankify"
            className="h-[38px] w-auto object-contain dark:hidden"
          />
          <img
            src={logoDark}
            alt="Rankify"
            className="hidden h-[38px] w-auto object-contain dark:block"
          />
        </span>
        {mobile && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose?.();
            }}
            className="app-muted ml-auto flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-[var(--app-sidebar-active-bg)] hover:text-[var(--app-sidebar-active-text)]"
            aria-label="Close sidebar"
          >
            <X size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </Link>

      <div className="app-border shrink-0 border-b px-3 py-4">
        <p className="app-muted mb-3 px-1 text-[11px] font-bold uppercase tracking-wide">
          Theme
        </p>
        <ThemeToggle />
      </div>
      <div className="app-border shrink-0 border-b px-3 py-4">
        <p className="app-muted mb-2 px-1 text-[11px] font-bold uppercase tracking-wide">
          Active Event
        </p>
        <select
          value={activeEventId}
          onChange={handleActiveEventChange}
          className="app-select h-10 w-full rounded-md border px-3 text-sm shadow-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
        >
          <option value="" disabled={events.length > 0}>
            {events.length === 0 ? "No active event" : "Select active event"}
          </option>
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
            <p className="app-muted mb-2 px-1 text-[11px] font-bold uppercase tracking-wide">
              {section.label}
            </p>
            <nav className="space-y-1">
              {section.links.map((link) => (
                <SidebarLink key={link.to} link={link} counts={counts} onNavigate={onNavigate} />
              ))}
            </nav>
          </div>
        ))}
      </div>

      <div className="app-border shrink-0 border-t p-3">
        <div className="flex items-center gap-3">
          <div className="app-badge flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
            {getInitials(user)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="app-heading truncate text-sm font-semibold">
              {user.name}
            </p>
            <p className="app-muted truncate text-xs">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="app-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--app-sidebar-active-bg)] hover:text-[var(--app-sidebar-active-text)]"
            aria-label="Logout"
          >
            <LogOut size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
