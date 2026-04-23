import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RedirectIfAuth } from "@/components/RedirectIfAuth";
import { AppLayout } from "@/components/AppLayout";
import { AdminLayout } from "@/components/AdminLayout";

import Index from "./pages/Index";
import Connexion from "./pages/Connexion";
import Inscription from "./pages/Inscription";
import Onboarding from "./pages/Onboarding";
import VerifierEmail from "./pages/VerifierEmail";
import ResetPassword from "./pages/ResetPassword";
import Tarifs from "./pages/Tarifs";
import Dashboard from "./pages/Dashboard";
import Module from "./pages/Module";
import Quizz from "./pages/Quizz";
import Simulateur from "./pages/Simulateur";
import SimulateurFrais from "./pages/SimulateurFrais";
import FicheMetier from "./pages/FicheMetier";
import Profil from "./pages/Profil";
import MesModules from "./pages/MesModules";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import AdminUsers from "./pages/AdminUsers";
import AdminModules from "./pages/AdminModules";
import AdminStats from "./pages/AdminStats";
import AdminQuiz from "./pages/AdminQuiz";
import AdminContenus from "./pages/AdminContenus";
import AdminModuleContenus from "./pages/AdminModuleContenus";
import AdminModuleQuiz from "./pages/AdminModuleQuiz";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import AdminEmails from "./pages/AdminEmails";
import AdminSettings from "./pages/AdminSettings";
import AuthCallback from "./pages/AuthCallback";
import CommentCaMarche from "./pages/CommentCaMarche";
import PaiementSucces from "./pages/PaiementSucces";
import NotFound from "./pages/NotFound";
import Cgv from "./pages/legal/Cgv";
import Cgu from "./pages/legal/Cgu";
import Confidentialite from "./pages/legal/Confidentialite";
import MentionsLegales from "./pages/legal/MentionsLegales";
import LegalDisclaimer from "./pages/legal/Disclaimer";
import RenonciationRetractation from "./pages/legal/RenonciationRetractation";
import Remboursement from "./pages/legal/Remboursement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/connexion" element={<RedirectIfAuth><Connexion /></RedirectIfAuth>} />
            <Route path="/inscription" element={<RedirectIfAuth><Inscription /></RedirectIfAuth>} />
            <Route path="/verifier-email" element={<VerifierEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/tarifs" element={<Tarifs />} />
            <Route path="/comment-ca-marche" element={<CommentCaMarche />} />
            <Route path="/paiement-succes" element={<PaiementSucces />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Legal pages (public) */}
            <Route path="/cgv" element={<Cgv />} />
            <Route path="/cgu" element={<Cgu />} />
            <Route path="/confidentialite" element={<Confidentialite />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/disclaimer" element={<LegalDisclaimer />} />
            <Route path="/renonciation-retractation" element={<RenonciationRetractation />} />
            <Route path="/remboursement" element={<Remboursement />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

            {/* Protected routes with sidebar layout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/simulateur" element={<Simulateur />} />
              <Route path="/simulateur-de-frais" element={<SimulateurFrais />} />
              <Route path="/fiche-metier/:id" element={<FicheMetier />} />
              <Route path="/profil" element={<Profil />} />
              <Route path="/mes-modules" element={<MesModules />} />
            </Route>

            {/* Module has its own layout */}
            <Route path="/module/:id" element={<ProtectedRoute><Module /></ProtectedRoute>} />

            {/* Admin login (public) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Admin routes */}
            <Route element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/modules" element={<AdminModules />} />
              <Route path="/admin/modules/:id/contenus" element={<AdminModuleContenus />} />
              <Route path="/admin/modules/:id/quiz" element={<AdminModuleQuiz />} />
              <Route path="/admin/stats" element={<AdminStats />} />
              <Route path="/admin/quiz" element={<AdminQuiz />} />
              <Route path="/admin/contenus" element={<AdminContenus />} />
              <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
              <Route path="/admin/emails" element={<AdminEmails />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            {/* Quizz has its own layout */}
            <Route path="/quizz/:id" element={<ProtectedRoute><Quizz /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
