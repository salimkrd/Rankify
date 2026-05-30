import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, FileText, Image, Key, Tags, Trophy, Users } from "lucide-react";
import { getUserStorageKey } from "../utils/storage.js";

const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
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

function getStoredArray(key) {
  const storedValue = safeJsonParse(localStorage.getItem(getUserStorageKey(key)), []);
  return Array.isArray(storedValue) ? storedValue : [];
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

function loadDashboardData() {
  const events = getStoredArray(EVENTS_KEY);
  const activeEventId = localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY)) || "";
  const activeEvent = events.find((event) => event.id === activeEventId) || null;

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

function StatCard({ card }) {
  const Icon = card.icon;

  return (
    <article className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-8 flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold text-[#0D1B2A]">{card.title}</h2>
        <Icon size={18} className="text-slate-500" />
      </div>

      <div className={card.textCount ? "text-2xl font-bold text-[#0D1B2A]" : "text-3xl font-bold text-[#0D1B2A]"}>
        {card.count}
      </div>
      <p className="mt-1 text-sm text-slate-500">{card.description}</p>
      <Link to={card.linkTo} className="mt-4 inline-block text-sm font-semibold text-[#2563EB] hover:text-[#0D1B2A]">
        {card.linkText}
      </Link>
    </article>
  );
}

export default function DashboardHome() {
  const [dashboardData, setDashboardData] = useState(() => loadDashboardData());

  useEffect(() => {
    function syncDashboardData() {
      setDashboardData(loadDashboardData());
    }

    window.addEventListener("storage", syncDashboardData);
    window.addEventListener("rankify-active-event-changed", syncDashboardData);
    window.addEventListener("rankify-data-changed", syncDashboardData);
    window.addEventListener("rankify-events-changed", syncDashboardData);

    return () => {
      window.removeEventListener("storage", syncDashboardData);
      window.removeEventListener("rankify-active-event-changed", syncDashboardData);
      window.removeEventListener("rankify-data-changed", syncDashboardData);
      window.removeEventListener("rankify-events-changed", syncDashboardData);
    };
  }, []);

  const cards = useMemo(
    () =>
      baseCards.map((card) => ({
        ...card,
        count: card.countKey ? String(dashboardData.counts[card.countKey] || 0) : card.count,
      })),
    [dashboardData.counts]
  );

  return (
    <section className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0D1B2A]">Welcome, Salim karakkad!</h1>
        <h2 className="mt-4 text-2xl font-bold text-[#0D1B2A]">
          Current Event:{" "}
          <span className="text-[#2563EB]">{dashboardData.activeEventName}</span>
        </h2>
        <p className="mt-2 text-base text-slate-600">Overview for the selected event.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.title} card={card} />
        ))}
      </div>
    </section>
  );
}
