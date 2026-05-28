import React from "react";
import { Link } from "react-router-dom";
import { BarChart3, FileText, Image, Key, Tags, Trophy, Users } from "lucide-react";

const cards = [
  {
    title: "Program Templates",
    count: "5",
    description: "Total program poster templates",
    linkText: "View Templates",
    linkTo: "/dashboard/program-templates",
    icon: FileText,
  },
  {
    title: "Program Results",
    count: "1",
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
    count: "2",
    description: "Total team status poster templates",
    linkText: "View Team Templates",
    linkTo: "/dashboard/team-status-templates",
    icon: Trophy,
  },
  {
    title: "Team Status Results",
    count: "0",
    description: "Total team status results",
    linkText: "View Team Results",
    linkTo: "/dashboard/team-status-results",
    icon: BarChart3,
  },
  {
    title: "Framed Post Templates",
    count: "1",
    description: "Total framed post templates",
    linkText: "View Framed Templates",
    linkTo: "/dashboard/framed-templates",
    icon: Image,
  },
  {
    title: "Teams",
    count: "2",
    description: "Total teams for the event",
    linkText: "View Teams",
    linkTo: "/dashboard/teams",
    icon: Users,
  },
  {
    title: "Categories",
    count: "7",
    description: "Total categories for the event",
    linkText: "View Categories",
    linkTo: "/dashboard/categories",
    icon: Tags,
  },
];

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
  return (
    <section className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0D1B2A]">Welcome, Salim karakkad!</h1>
        <h2 className="mt-4 text-2xl font-bold text-[#0D1B2A]">
          Current Event:{" "}
          <span className="text-[#2563EB]">SSF PANANGARA UNIT SAHITYOLSAV</span>
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
