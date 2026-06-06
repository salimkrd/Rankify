import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, FileText, Image, Key, Tags, Trophy, Users } from "lucide-react";
import { getUserStorageKey } from "../utils/storage.js";
import { useActiveEvent } from "../contexts/ActiveEventContext.jsx";

const TEAMS_KEY = "rankify_teams";
const CATEGORIES_KEY = "rankify_categories";
const PROGRAM_TEMPLATES_KEY = "rankify_program_templates";
const PROGRAM_RESULTS_KEY = "rankify_program_results";

const baseCards = [
  {
    title: "Program Templates",
    countKey: "programTemplates",
    description: "Total program poster templates",
    linkText: "View Templates",
    linkTo: "/dashboard/program-templates",
    icon: FileText,
  },
  {
    title: "Program Results",
    countKey: "programResults",
    description: "Total program poster results",
    linkText: "View Results",
    linkTo: "/dashboard/program-results",
    icon: BarChart3,
  },
  {
    title: "API Access",
    count: "External Apps",
    description: "Create event API keys for result ingestion and poster generation",
    linkText: "Open Integrations",
    linkTo: "/dashboard/integrations",
    icon: Key,
    textCount: true,
  },
  {
    title: "Team Status Templates",
    countKey: "teamStatusTemplates",
    description: "Total team status poster templates",
    linkText: "View Team Templates",
    linkTo: "/dashboard/team-status-templates",
    icon: Trophy,
  },
  {
    title: "Team Status Results",
    countKey: "teamStatusResults",
    description: "Total team status results",
    linkText: "View Team Results",
    linkTo: "/dashboard/team-status-results",
    icon: BarChart3,
  },
  {
    title: "Framed Post Templates",
    countKey: "framedPostTemplates",
    description: "Total framed post templates",
    linkText: "View Framed Templates",
    linkTo: "/dashboard/framed-templates",
    icon: Image,
  },
  {
    title: "Teams",
    countKey: "teams",
    description: "Total teams for the event",
    linkText: "View Teams",
    linkTo: "/dashboard/teams",
    icon: Users,
  },
  {
    title: "Categories",
    countKey: "categories",
    description: "Total categories for the event",
    linkText: "View Categories",
    linkTo: "/dashboard/categories",
    icon: Tags,
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

function countItemsForEvent(key, activeEventId) {
  if (!activeEventId) return 0;

  const storedValue = safeJsonParse(localStorage.getItem(getUserStorageKey(key)), []);

  if (Array.isArray(storedValue)) {
    return storedValue.filter((item) => item?.eventId === activeEventId).length;
  }

  if (storedValue && typeof storedValue === "object") {
    const eventItems = storedValue[activeEventId];
    return Array.isArray(eventItems) ? eventItems.length : 0;
  }

  return 0;
}

function emptyDashboardData() {
  return {
    activeEventName: "No active event",
    counts: {
      programTemplates: 0,
      programResults: 0,
      teamStatusTemplates: 0,
      teamStatusResults: 0,
      framedPostTemplates: 0,
      teams: 0,
      categories: 0,
    },
  };
}

function loadDashboardData(activeEvent) {
  const activeEventId = activeEvent?.id || "";

  return {
    activeEventName: activeEvent?.name || "No active event",
    counts: {
      programTemplates: countItemsForEvent(PROGRAM_TEMPLATES_KEY, activeEventId),
      programResults: countItemsForEvent(PROGRAM_RESULTS_KEY, activeEventId),
      teamStatusTemplates: countItemsForEvent("rankify_team_status_templates", activeEventId),
      teamStatusResults: countItemsForEvent("rankify_team_status_results", activeEventId),
      framedPostTemplates: countItemsForEvent("rankify_framed_post_templates", activeEventId),
      teams: countItemsForEvent(TEAMS_KEY, activeEventId),
      categories: countItemsForEvent(CATEGORIES_KEY, activeEventId),
    },
  };
}

function getStoredUserName() {
  const stored = safeJsonParse(localStorage.getItem("rankify_user"), null);
  if (stored && typeof stored === "object") {
    return (
      String(stored.name || stored.fullName || stored.username || stored.email || "User")
        .trim() || "User"
    );
  }
  return "User";
}

function StatCard({ card }) {
  const Icon = card.icon;

  return (
    <article className="app-card min-w-0 rounded-xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md max-sm:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <h2 className="app-heading min-w-0 break-words text-base font-semibold max-sm:text-xl">{card.title}</h2>
        <Icon size={18} className="text-[var(--app-muted)]" />
      </div>

      <div className={card.textCount ? "app-heading text-2xl font-bold" : "app-heading text-3xl font-bold"}>
        {card.count}
      </div>
      <p className="app-muted mt-1 break-words text-sm max-sm:text-base">{card.description}</p>
      <Link to={card.linkTo} className="mt-4 inline-block text-sm font-semibold text-[var(--app-primary)] hover:text-[var(--app-heading)] max-sm:text-lg">
        {card.linkText}
      </Link>
    </article>
  );
}

export default function DashboardHome() {
  const { activeEvent, loading: activeEventLoading } = useActiveEvent();
  const [dashboardData, setDashboardData] = useState(() => emptyDashboardData());
  const [userName, setUserName] = useState(() => getStoredUserName());

  useEffect(() => {
    async function syncDashboardData() {
      try {
        if (activeEventLoading) return;
        setDashboardData(loadDashboardData(activeEvent));
      } catch (error) {
        console.error("Unable to load dashboard overview.", error);
        setDashboardData(emptyDashboardData());
      }
    }

    function syncUserName() {
      setUserName(getStoredUserName());
    }

    syncDashboardData();

    window.addEventListener("storage", syncDashboardData);
    window.addEventListener("storage", syncUserName);
    window.addEventListener("rankify-active-event-changed", syncDashboardData);
    window.addEventListener("rankify-data-changed", syncDashboardData);
    window.addEventListener("rankify-events-changed", syncDashboardData);

    const refreshInterval = window.setInterval(() => {
      syncDashboardData();
      syncUserName();
    }, 1000);

    return () => {
      window.removeEventListener("storage", syncDashboardData);
      window.removeEventListener("storage", syncUserName);
      window.removeEventListener("rankify-active-event-changed", syncDashboardData);
      window.removeEventListener("rankify-data-changed", syncDashboardData);
      window.removeEventListener("rankify-events-changed", syncDashboardData);
      window.clearInterval(refreshInterval);
    };
  }, [activeEvent, activeEventLoading]);

  const cards = useMemo(
    () =>
      baseCards.map((card) => ({
        ...card,
        count: card.countKey ? String(dashboardData.counts[card.countKey] || 0) : card.count,
      })),
    [dashboardData.counts]
  );

  return (
    <section className="app-page min-h-screen overflow-x-hidden p-6 max-sm:px-5 max-sm:py-7">
      <div className="mb-8">
        <h1 className="app-heading break-words text-2xl font-bold max-sm:text-[30px] max-sm:leading-tight">Welcome, {userName}!</h1>
        <h2 className="app-heading mt-4 break-words text-2xl font-bold max-sm:text-[28px] max-sm:leading-tight">
          Current Event:{" "}
          <span className="text-[var(--app-primary)]">{dashboardData.activeEventName}</span>
        </h2>
        <p className="app-muted mt-4 text-base max-sm:text-xl">Overview for the selected event.</p>
      </div>

      <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.title} card={card} />
        ))}
      </div>
    </section>
  );
}
