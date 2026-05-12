import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AccessGuard } from "@/components/AccessGuard";
import { RedirectIfAuth } from "@/components/RedirectIfAuth";
import { AppLayout } from "@/components/AppLayout";
import { AdminLayout } from "@/components/AdminLayout";
import { ScrollToTop } from "@/components/ScrollToTop";

import Index from "./pages/Index";
import Connexion from "./pages/Connexion";
import Inscription from "./pages/Inscription";
import Onboarding from "./pages/Onboarding";
import VerifierEmail from "./pages/VerifierEmail";
import ResetPassword from "./pages/ResetPassword";
import MotDePasseOublie from "./pages/MotDePasseOublie";
import Tarifs from "./pages/Tarifs";
import Dashboard from "./pages/Dashboard";
import Module from "./pages/Module";
import Quizz from "./pages/Quizz";
import Simulateur from "./pages/Simulateur";
import SimulateurFrais from "./pages/SimulateurFrais";
import SimulateurFraisPro from "./pages/SimulateurFraisPro";
import MesSimulateurs from "./pages/MesSimulateurs";
import SimulateurPAS from "./pages/SimulateurPAS";
import SimulateurIRBareme from "./pages/SimulateurIRBareme";
import SimulateurQuotientFamilial from "./pages/SimulateurQuotientFamilial";
import SimulateurCreditsReductions from "./pages/SimulateurCreditsReductions";
import FicheMetier from "./pages/FicheMetier";
import Fiche from "./pages/Fiche";
import Profil from "./pages/Profil";
import OnboardingResultats from "./pages/OnboardingResultats";
import MesModules from "./pages/MesModules";
import FichesPersonnalisees from "./pages/FichesPersonnalisees";
import Recommandations from "./pages/Recommandations";
import PasseportFiscal from "./pages/PasseportFiscal";
import AdminRecommandations from "./pages/AdminRecommandations";
import AdminSimulateurs from "./pages/AdminSimulateurs";
import AdminSuggestions from "./pages/AdminSuggestions";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import AdminUsers from "./pages/AdminUsers";
import AdminModules from "./pages/AdminModules";
import AdminStats from "./pages/AdminStats";
import AdminQuiz from "./pages/AdminQuiz";
import AdminMetiers from "./pages/AdminMetiers";
import AdminFichesProfils from "./pages/AdminFichesProfils";
import AdminPasseportsFiscaux from "./pages/AdminPasseportsFiscaux";
import AdminPays from "./pages/AdminPays";
import AdminContenus from "./pages/AdminContenus";
import AdminModuleContenus from "./pages/AdminModuleContenus";
import AdminModuleQuiz from "./pages/AdminModuleQuiz";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import AdminEmails from "./pages/AdminEmails";
import AdminSettings from "./pages/AdminSettings";
import AdminCoupons from "./pages/AdminCoupons";
import AdminCouponDetail from "./pages/AdminCouponDetail";
import AdminCouponsParrains from "./pages/AdminCouponsParrains";
import AdminCouponParrainDetail from "./pages/AdminCouponParrainDetail";
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
import ImpotsTeam from "./pages/ImpotsTeam";
import ImpotsTeamSouscription from "./pages/ImpotsTeamSouscription";
import ImpotsTeamBienvenue from "./pages/ImpotsTeamBienvenue";
import ImpotsTeamDashboard from "./pages/ImpotsTeamDashboard";
import InvitationAccept from "./pages/InvitationAccept";
import VerifierCertificat from "./pages/VerifierCertificat";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/connexion" element={<RedirectIfAuth><Connexion /></RedirectIfAuth>} />
            <Route path="/inscription" element={<RedirectIfAuth><Inscription /></RedirectIfAuth>} />
            <Route path="/verifier-email" element={<VerifierEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
            <Route path="/tarifs" element={<Tarifs />} />
            <Route path="/comment-ca-marche" element={<CommentCaMarche />} />
            <Route path="/paiement-succes" element={<PaiementSucces />} />
            <Route path="/checkout" element={<PaiementSucces />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Impôts Team (B2B) */}
            <Route path="/impots-team" element={<ImpotsTeam />} />
            <Route path="/impots-team/souscription" element={<ImpotsTeamSouscription />} />
            {/* Bienvenue post-paiement : publique car la session peut être perdue
                au retour de Stripe (token expiré, ITP, storage partitioning…).
                La page propose un CTA "Se connecter" qui ramène ici après login. */}
            <Route path="/impots-team/bienvenue" element={<ImpotsTeamBienvenue />} />
            <Route path="/impots-team/dashboard" element={<ProtectedRoute><ImpotsTeamDashboard /></ProtectedRoute>} />
            <Route path="/impots-team/invitation/:token" element={<InvitationAccept />} />
            {/* Alias rétro-compatible pour les anciens emails */}
            <Route path="/invitation/:token" element={<InvitationAccept />} />

            {/* Legal pages (public) */}
            <Route path="/cgv" element={<Cgv />} />
            <Route path="/cgu" element={<Cgu />} />
            <Route path="/confidentialite" element={<Confidentialite />} />
            <Route path="/politique-confidentialite" element={<Confidentialite />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/disclaimer" element={<LegalDisclaimer />} />
            <Route path="/disclaimer-fiscal" element={<LegalDisclaimer />} />
            <Route path="/renonciation-retractation" element={<RenonciationRetractation />} />
            <Route path="/remboursement" element={<Remboursement />} />
            <Route path="/politique-remboursement" element={<Remboursement />} />
            <Route path="/verifier-certificat/:numero" element={<VerifierCertificat />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

            {/* Protected routes with sidebar layout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/mes-simulateurs" element={<MesSimulateurs />} />
              <Route path="/simulateur" element={<AccessGuard requires="expert"><Simulateur /></AccessGuard>} />
              <Route path="/simulateur-de-frais" element={<SimulateurFrais />} />
              <Route path="/simulateur-frais-pro" element={<AccessGuard requires="expert"><SimulateurFraisPro /></AccessGuard>} />
              <Route path="/simulateur/frais-reels-pro" element={<AccessGuard requires="expert"><SimulateurFraisPro /></AccessGuard>} />
              <Route path="/simulateur/frais-reels" element={<SimulateurFrais />}/>
              <Route path="/simulateur/ir-bareme" element={<AccessGuard requires="expert"><SimulateurIRBareme /></AccessGuard>} />
              <Route path="/simulateur/quotient-familial" element={<AccessGuard requires="expert"><SimulateurQuotientFamilial /></AccessGuard>} />
              <Route path="/simulateur/pas" element={<AccessGuard requires="expert"><SimulateurPAS /></AccessGuard>} />
              <Route path="/simulateur/credits-reductions" element={<AccessGuard requires="expert"><SimulateurCreditsReductions /></AccessGuard>} />
              <Route path="/fiche-metier/:id" element={<FicheMetier />} />
              <Route path="/fiches/:type/:slug" element={<Fiche />} />
              <Route path="/profil" element={<Profil />} />
              <Route path="/mon-compte" element={<Profil />} />
              <Route path="/profil/onboarding-resultats" element={<OnboardingResultats />} />
              <Route path="/mon-profil/onboarding-resultats" element={<OnboardingResultats />} />
              <Route path="/mes-modules" element={<MesModules />} />
              <Route path="/fiches-personnalisees" element={<FichesPersonnalisees />} />
              <Route path="/recommandations" element={<Recommandations />} />
              <Route path="/passeport-fiscal" element={<PasseportFiscal />} />
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
              <Route path="/admin/metiers" element={<AdminMetiers />} />
              <Route path="/admin/fiches-profils" element={<AdminFichesProfils />} />
              <Route path="/admin/passeports-fiscaux" element={<AdminPasseportsFiscaux />} />
              <Route path="/admin/pays" element={<AdminPays />} />
              <Route path="/admin/contenus" element={<AdminContenus />} />
              <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
              <Route path="/admin/emails" element={<AdminEmails />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/recommandations" element={<AdminRecommandations />} />
              <Route path="/admin/simulateurs" element={<AdminSimulateurs />} />
              <Route path="/admin/suggestions" element={<AdminSuggestions />} />
              <Route path="/admin/coupons" element={<AdminCoupons />} />
              <Route path="/admin/coupons/parrains" element={<AdminCouponsParrains />} />
              <Route path="/admin/coupons/parrains/:id" element={<AdminCouponParrainDetail />} />
              <Route path="/admin/coupons/:id" element={<AdminCouponDetail />} />
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
