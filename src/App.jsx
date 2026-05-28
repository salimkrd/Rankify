import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import DashboardHome from "./pages/DashboardHome.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import TeamsPage from "./pages/TeamsPage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import ProgramTemplatesPage from "./pages/ProgramTemplatesPage.jsx";
import ProgramResultsPage from "./pages/ProgramResultsPage.jsx";
import TemplateEditorPage from "./pages/TemplateEditorPage.jsx";
import TeamStatusTemplatesPage from "./pages/TeamStatusTemplatesPage.jsx";
import TeamStatusTemplateEditorPage from "./pages/TeamStatusTemplateEditorPage.jsx";
import { COMMON_GOOGLE_FONTS_URL } from "./constants/fontFamilies.js";

if (typeof document !== "undefined" && !document.querySelector('link[data-rankify-fonts="true"]')) {
  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = COMMON_GOOGLE_FONTS_URL;
  fontLink.dataset.rankifyFonts = "true";
  document.head.appendChild(fontLink);
}

function ProtectedRoute({ children }) {
  return children;
}

function PlaceholderPage({ title }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#0D1B2A]">{title}</h1>
      <p className="mt-2 text-gray-600">This page is ready to be connected.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="integrations" element={<PlaceholderPage title="Integrations" />} />
        <Route path="public-page" element={<PlaceholderPage title="Public Page" />} />
        <Route path="images" element={<PlaceholderPage title="Images" />} />
        <Route path="program-templates" element={<ProgramTemplatesPage />} />
        <Route path="program-templates/new" element={<TemplateEditorPage />} />
        <Route path="program-templates/:templateId/edit" element={<TemplateEditorPage />} />
        <Route path="program-results" element={<ProgramResultsPage />} />
        <Route path="team-status-templates" element={<TeamStatusTemplatesPage />} />
        <Route path="team-status-templates/new" element={<TeamStatusTemplateEditorPage />} />
        <Route path="team-status-templates/:templateId/edit" element={<TeamStatusTemplateEditorPage />} />
        <Route path="team-status/templates" element={<Navigate to="/dashboard/team-status-templates" replace />} />
        <Route path="team-status-results" element={<PlaceholderPage title="Team Status Results" />} />
        <Route path="framed-templates" element={<PlaceholderPage title="Framed Templates" />} />
        <Route path="framed-posts" element={<PlaceholderPage title="Framed Posts" />} />
        <Route path="certificate-templates" element={<PlaceholderPage title="Certificate Templates" />} />
        <Route path="certificate-results" element={<PlaceholderPage title="Certificate Results" />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
