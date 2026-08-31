import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

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
import AdminARRemindersPage from "./pages/admin/AdminARRemindersPage";
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
import { LanguageProvider } from "./components/LanguageContext";

function HomeIntroOverlay() {
  const location = useLocation();
  const [visible, setVisible] = useState(location.pathname === "/");

  useEffect(() => {
    const showTimer = window.setTimeout(() => setVisible(location.pathname === "/"), 0);
    const hideTimer = location.pathname === "/" ? window.setTimeout(() => setVisible(false), 3600) : undefined;

    return () => {
      window.clearTimeout(showTimer);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {location.pathname === "/" && visible && (
        <motion.div
          key="home-intro-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.85, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#0d1726]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.22),transparent_34%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,182,212,0.09),transparent_42%,rgba(59,130,246,0.09))]" />
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 18, filter: "blur(16px)" }}
            animate={{ scale: 1, opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="relative mx-6 flex flex-col items-center gap-5 rounded-[34px] border border-cyan-200/18 bg-white/[0.035] px-8 py-8 text-center shadow-[0_0_110px_rgba(34,211,238,0.20)] backdrop-blur-xl md:flex-row md:gap-8 md:px-12"
          >
            <motion.div
              initial={{ rotate: -4, scale: 0.88 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              className="select-none font-serif text-6xl font-black leading-none tracking-[-0.06em] text-white drop-shadow-[0_0_40px_rgba(34,211,238,0.34)] md:text-7xl"
            >
              FACS<span className="text-cyan-300">.</span>
            </motion.div>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 72, opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.55, ease: "easeOut" }}
              className="hidden w-px bg-cyan-200/25 md:block"
            />
            <motion.div
              initial={{ x: -18, opacity: 0, filter: "blur(8px)" }}
              animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.9, delay: 0.9, ease: "easeOut" }}
              className="text-3xl font-bold tracking-[-1px] text-white md:text-5xl"
            >
              Your Trusted <span className="text-cyan-300">Partner</span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
        <Route path="/admin/ar/reminders" element={<ProtectedAdminRoute><AdminARRemindersPage /></ProtectedAdminRoute>} />
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
        <HomeIntroOverlay />
        <AnimatedRoutes />
      </LanguageProvider>
    </BrowserRouter>
  );
}
