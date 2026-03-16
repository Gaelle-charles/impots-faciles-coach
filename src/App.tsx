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
import Admin from "./pages/Admin";
import AdminUsers from "./pages/AdminUsers";
import AdminModules from "./pages/AdminModules";
import NotFound from "./pages/NotFound";

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
            <Route path="/verifier-email" element={<VerifierEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/tarifs" element={<Tarifs />} />

            {/* Protected routes with sidebar layout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/simulateur" element={<Simulateur />} />
              <Route path="/simulateur-de-frais" element={<SimulateurFrais />} />
              <Route path="/fiche-metier/:id" element={<FicheMetier />} />
              <Route path="/profil" element={<Profil />} />
            </Route>

            {/* Module has its own layout */}
            <Route path="/module/:id" element={<ProtectedRoute><Module /></ProtectedRoute>} />

            {/* Admin route */}
            <Route element={<ProtectedRoute adminOnly><AppLayout /></ProtectedRoute>}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/modules" element={<AdminModules />} />
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
