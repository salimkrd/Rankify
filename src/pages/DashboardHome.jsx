import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, FileText, Image, Key, Tags, Trophy, Users } from "lucide-react";
import { useActiveEvent } from "../contexts/ActiveEventContext.jsx";
import { getSidebarCounts } from "../services/sidebarCountsService.js";
import { DASHBOARD_CACHE_EVENT } from "../services/dashboardCache.js";

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

function StatCard({ card, error }) {
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
      {error && (
        <p className="mt-1 text-sm text-[var(--app-danger)]" role="alert">
          Unable to load this count: {error.message || "Please try again."}
        </p>
      )}
      <p className="app-muted mt-1 break-words text-sm max-sm:text-base">{card.description}</p>
      <Link to={card.linkTo} className="mt-4 inline-block text-sm font-semibold text-[var(--app-primary)] hover:text-[var(--app-heading)] max-sm:text-lg">
        {card.linkText}
      </Link>
    </article>
  );
}

export default function DashboardHome() {
  const { activeEvent, loading: activeEventLoading } = useActiveEvent();
  const activeEventId = activeEvent?.id ? String(activeEvent.id) : "";
  const [dashboardState, setDashboardState] = useState({
    eventId: "",
    loading: true,
    counts: {},
    errors: {},
    loadError: null,
  });
  const [userName, setUserName] = useState(() => getStoredUserName());

  useEffect(() => {
    let cancelled = false;
    let requestNumber = 0;

    if (activeEventLoading) {
      setDashboardState({
        eventId: activeEventId,
        loading: true,
        counts: {},
        errors: {},
        loadError: null,
      });
      return () => {
        cancelled = true;
      };
    }

    if (!activeEventId) {
      setDashboardState({
        eventId: "",
        loading: false,
        counts: {},
        errors: {},
        loadError: null,
      });
      return () => {
        cancelled = true;
      };
    }

    async function syncDashboardData() {
      const currentRequest = ++requestNumber;
      setDashboardState((current) => ({
        eventId: activeEventId,
        loading: true,
        counts: current.eventId === activeEventId ? current.counts : {},
        errors: current.eventId === activeEventId ? current.errors : {},
        loadError: null,
      }));

      try {
        const result = await getSidebarCounts(activeEventId);
        if (cancelled || currentRequest !== requestNumber) return;
        const { errors = {}, ...counts } = result;
        setDashboardState({ eventId: activeEventId, loading: false, counts, errors, loadError: null });
      } catch (error) {
        console.error("Unable to load dashboard counts.", error);
        if (cancelled || currentRequest !== requestNumber) return;
        setDashboardState({
          eventId: activeEventId,
          loading: false,
          counts: {},
          errors: {},
          loadError: error,
        });
      }
    }

    function handleCountRefresh(event) {
      const changedEventId = event?.detail?.eventId;
      if (changedEventId && String(changedEventId) !== activeEventId) return;
      syncDashboardData();
    }

    function syncUserName() {
      setUserName(getStoredUserName());
    }

    syncDashboardData();
    window.addEventListener("storage", handleCountRefresh);
    window.addEventListener("storage", syncUserName);
    window.addEventListener("rankify-active-event-changed", handleCountRefresh);
    window.addEventListener("rankify-data-changed", handleCountRefresh);
    window.addEventListener("rankify-events-changed", handleCountRefresh);
    window.addEventListener(DASHBOARD_CACHE_EVENT, handleCountRefresh);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", handleCountRefresh);
      window.removeEventListener("storage", syncUserName);
      window.removeEventListener("rankify-active-event-changed", handleCountRefresh);
      window.removeEventListener("rankify-data-changed", handleCountRefresh);
      window.removeEventListener("rankify-events-changed", handleCountRefresh);
      window.removeEventListener(DASHBOARD_CACHE_EVENT, handleCountRefresh);
    };
  }, [activeEventId, activeEventLoading]);

  const isCurrentEventData = dashboardState.eventId === activeEventId;
  const countsLoading =
    activeEventLoading ||
    (Boolean(activeEventId) && (!isCurrentEventData || dashboardState.loading));
  const visibleErrors = isCurrentEventData ? dashboardState.errors : {};
  const loadError = isCurrentEventData ? dashboardState.loadError : null;
  const cards = useMemo(
    () =>
      baseCards.map((card) => ({
        ...card,
        count: !card.countKey
          ? card.count
          : !activeEventId
            ? "—"
            : countsLoading
              ? "..."
              : visibleErrors[card.countKey]
                ? "Unavailable"
                : typeof dashboardState.counts[card.countKey] === "number"
                  ? String(dashboardState.counts[card.countKey])
                  : "Unavailable",
      })),
    [activeEventId, countsLoading, dashboardState.counts, visibleErrors]
  );

  return (
    <section className="app-page min-h-screen overflow-x-hidden p-6 max-sm:px-5 max-sm:py-7">
      <div className="mb-8">
        <h1 className="app-heading break-words text-2xl font-bold max-sm:text-[30px] max-sm:leading-tight">Welcome, {userName}!</h1>
        <h2 className="app-heading mt-4 break-words text-2xl font-bold max-sm:text-[28px] max-sm:leading-tight">
          Current Event:{" "}
          <span className="text-[var(--app-primary)]">
            {activeEventLoading ? "Loading event..." : activeEvent?.name || "No active event"}
          </span>
        </h2>
        <p className="app-muted mt-4 text-base max-sm:text-xl">Overview for the selected event.</p>
        {loadError && (
          <p className="mt-3 text-sm text-[var(--app-danger)]" role="alert">
            Dashboard counts could not be loaded: {loadError.message || "Please try again."}
          </p>
        )}
        {Object.keys(visibleErrors).length > 0 && (
          <p className="mt-3 text-sm text-[var(--app-danger)]" role="alert">
            Some counts could not be loaded. Failed counts are marked unavailable below.
          </p>
        )}
      </div>

      <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.title} card={card} error={visibleErrors[card.countKey]} />
        ))}
      </div>
    </section>
  );
}
