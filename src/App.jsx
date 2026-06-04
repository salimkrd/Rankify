import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import DashboardHome from "./pages/DashboardHome.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import TeamsPage from "./pages/TeamsPage.jsx";
import ParticipantsPage from "./pages/ParticipantsPage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import ProgramTemplatesPage from "./pages/ProgramTemplatesPage.jsx";
import ProgramResultsPage from "./pages/ProgramResultsPage.jsx";
import TemplateEditorPage from "./pages/TemplateEditorPage.jsx";
import TeamStatusTemplatesPage from "./pages/TeamStatusTemplatesPage.jsx";
import TeamStatusTemplateEditorPage from "./pages/TeamStatusTemplateEditorPage.jsx";
import TeamStatusResultsPage from "./pages/TeamStatusResultsPage.jsx";
import FramedPostTemplatesPage from "./pages/FramedPostTemplatesPage.jsx";
import FramedPostTemplateEditorPage from "./pages/FramedPostTemplateEditorPage.jsx";
import FramedPostsPage from "./pages/FramedPostsPage.jsx";
import CertificateTemplatesPage from "./pages/CertificateTemplatesPage.jsx";
import CertificateTemplateEditorPage from "./pages/CertificateTemplateEditorPage.jsx";
import CertificateResultsPage from "./pages/CertificateResultsPage.jsx";
import AdminLoginPage from "./pages/AdminLoginPage.jsx";
import AdminDashboardPage from "./pages/AdminDashboardPage.jsx";
import AdminPublicTemplatesPage from "./pages/AdminPublicTemplatesPage.jsx";
import AdminPublicTemplateEditorPage from "./pages/AdminPublicTemplateEditorPage.jsx";
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
    <div className="app-page p-6">
      <h1 className="app-heading text-2xl font-bold">{title}</h1>
      <p className="app-muted mt-2">This page is ready to be connected.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/signup" element={<Navigate to="/register" replace />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="public-templates" element={<AdminPublicTemplatesPage />} />
        <Route path="public-templates/new" element={<AdminPublicTemplateEditorPage />} />
        <Route path="public-templates/:id/edit" element={<AdminPublicTemplateEditorPage />} />
      </Route>

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
        <Route path="team-status-results" element={<TeamStatusResultsPage />} />
        <Route path="framed-templates" element={<PlaceholderPage title="Framed Templates" />} />
        <Route path="framed-posts" element={<FramedPostTemplatesPage />} />
        <Route path="framed-posts/new" element={<FramedPostTemplateEditorPage />} />
        <Route path="framed-posts/:templateId/edit" element={<FramedPostTemplateEditorPage />} />
        <Route path="framed-posts/my-posts" element={<FramedPostsPage />} />
        <Route path="certificate-templates" element={<CertificateTemplatesPage />} />
        <Route path="certificate-templates/new" element={<CertificateTemplateEditorPage />} />
        <Route path="certificate-templates/:templateId/edit" element={<CertificateTemplateEditorPage />} />
        <Route path="certificate-templates/edit/:templateId" element={<CertificateTemplateEditorPage />} />
        <Route path="certificates/templates" element={<Navigate to="/dashboard/certificate-templates" replace />} />
        <Route path="certificate-results" element={<CertificateResultsPage />} />
        <Route path="certificates/results" element={<Navigate to="/dashboard/certificate-results" replace />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="participants" element={<ParticipantsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
