import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ServicesPage from "./pages/ServicesPage";
import ServiceDetailPage from "./pages/ServiceDetailPage";
import IndustriesPage from "./pages/IndustriesPage";
import IndustryDetailPage from "./pages/IndustryDetailPage";
import InsightsPage from "./pages/InsightsPage";
import InsightDetailPage from "./pages/InsightDetailPage";
import LegalCalendarPage from "./pages/LegalCalendarPage";
import ToolsPage from "./pages/ToolsPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminPostsPage from "./pages/admin/AdminPostsPage";
import AdminPostEditorPage from "./pages/admin/AdminPostEditorPage";
import AdminJobsPage from "./pages/admin/AdminJobsPage";
import AdminJobEditorPage from "./pages/admin/AdminJobEditorPage";
import AdminApplicationsPage from "./pages/admin/AdminApplicationsPage";
import AdminInquiriesPage from "./pages/admin/AdminInquiriesPage";
import AdminFormEmailPage from "./pages/admin/AdminFormEmailPage";
import AdminEmailPage from "./pages/admin/AdminEmailPage";
import AdminLegalCalendarPage from "./pages/admin/AdminLegalCalendarPage";
import AdminLegalDashboardPage from "./pages/admin/AdminLegalDashboardPage";
import AdminLegalCalendarEditorPage from "./pages/admin/AdminLegalCalendarEditorPage";
import AdminLegalSourcesPage from "./pages/admin/AdminLegalSourcesPage";
import AdminARPage from "./pages/admin/AdminARPage";
import AdminARCustomersPage from "./pages/admin/AdminARCustomersPage";
import ProtectedAdminRoute from "./components/admin/ProtectedAdminRoute";
import CareersPage from "./pages/CareersPage";
import CareerDetailPage from "./pages/CareerDetailPage";
import ApplicationPage from "./pages/ApplicationPage";
import ContactPage from "./pages/ContactPage";
import LegalPage from "./pages/LegalPage";
import TeamMemberDetailPage from "./pages/TeamMemberDetailPage";
import ScrollToTop from "./components/ScrollToTop";
import PageTransition from "./components/PageTransition";
import MouseGlow from "./components/MouseGlow";
import CinematicIntro from "./components/CinematicIntro";
import { LanguageProvider } from "./components/LanguageContext";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
        <Route path="/about/team/:slug" element={<PageTransition><TeamMemberDetailPage /></PageTransition>} />
        <Route path="/services" element={<PageTransition><ServicesPage /></PageTransition>} />
        <Route path="/services/:slug" element={<ServiceDetailPage />} />
        <Route path="/industries" element={<PageTransition><IndustriesPage /></PageTransition>} />
        <Route path="/industries/:slug" element={<IndustryDetailPage />} />
        <Route path="/insights" element={<PageTransition><InsightsPage /></PageTransition>} />
        <Route path="/insights/:slug" element={<PageTransition><InsightDetailPage /></PageTransition>} />
        <Route path="/legal-calendar" element={<PageTransition><LegalCalendarPage /></PageTransition>} />
        <Route path="/tools" element={<PageTransition><ToolsPage /></PageTransition>} />
        <Route path="/tools/:slug" element={<PageTransition><ToolsPage /></PageTransition>} />
        <Route path="/admin" element={<Navigate to="/admin/posts" replace />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/posts" element={<ProtectedAdminRoute><AdminPostsPage /></ProtectedAdminRoute>} />
        <Route path="/admin/posts/new" element={<ProtectedAdminRoute><AdminPostEditorPage /></ProtectedAdminRoute>} />
        <Route path="/admin/posts/:id/edit" element={<ProtectedAdminRoute><AdminPostEditorPage /></ProtectedAdminRoute>} />
        <Route path="/admin/jobs" element={<ProtectedAdminRoute><AdminJobsPage /></ProtectedAdminRoute>} />
        <Route path="/admin/jobs/new" element={<ProtectedAdminRoute><AdminJobEditorPage /></ProtectedAdminRoute>} />
        <Route path="/admin/jobs/:id/edit" element={<ProtectedAdminRoute><AdminJobEditorPage /></ProtectedAdminRoute>} />
        <Route path="/admin/applications" element={<ProtectedAdminRoute><AdminApplicationsPage /></ProtectedAdminRoute>} />
        <Route path="/admin/inquiries" element={<ProtectedAdminRoute><AdminInquiriesPage /></ProtectedAdminRoute>} />
        <Route path="/admin/form-email" element={<ProtectedAdminRoute><AdminFormEmailPage /></ProtectedAdminRoute>} />
        <Route path="/admin/email" element={<ProtectedAdminRoute><AdminEmailPage /></ProtectedAdminRoute>} />
        <Route path="/admin/legal-dashboard" element={<ProtectedAdminRoute><AdminLegalDashboardPage /></ProtectedAdminRoute>} />
        <Route path="/admin/legal-calendar" element={<ProtectedAdminRoute><AdminLegalCalendarPage /></ProtectedAdminRoute>} />
        <Route path="/admin/legal-calendar/new" element={<ProtectedAdminRoute><AdminLegalCalendarEditorPage /></ProtectedAdminRoute>} />
        <Route path="/admin/legal-calendar/:id/edit" element={<ProtectedAdminRoute><AdminLegalCalendarEditorPage /></ProtectedAdminRoute>} />
        <Route path="/admin/legal-sources" element={<ProtectedAdminRoute><AdminLegalSourcesPage /></ProtectedAdminRoute>} />
        <Route path="/admin/ar" element={<ProtectedAdminRoute><AdminARPage /></ProtectedAdminRoute>} />
        <Route path="/admin/ar/customers" element={<ProtectedAdminRoute><AdminARCustomersPage /></ProtectedAdminRoute>} />
        <Route path="/careers" element={<PageTransition><CareersPage /></PageTransition>} />
        <Route path="/careers/apply" element={<PageTransition><ApplicationPage /></PageTransition>} />
        <Route path="/careers/:slug" element={<PageTransition><CareerDetailPage /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
        <Route path="/privacy" element={<LegalPage type="privacy" />} />
        <Route path="/terms" element={<LegalPage type="terms" />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ScrollToTop />
        <MouseGlow />
        <CinematicIntro />
        <AnimatedRoutes />
      </LanguageProvider>
    </BrowserRouter>
  );
}
