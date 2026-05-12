import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { TeamSidebar } from '@/components/TeamSidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { Disclaimer } from '@/components/Disclaimer';
import { Header } from '@/components/Header';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrgRole } from '@/hooks/useOrgRole';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function AppLayout() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { org, isOrgAdmin, hasLicense, loading } = useOrgRole();
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>('');
  const [hasB2CPlan, setHasB2CPlan] = useState(false);

  // Charger logo + nom de l'orga (seulement pour admin orga)
  useEffect(() => {
    if (!isOrgAdmin || !org?.org_id) return;
    setOrgName(org.raison_sociale ?? '');
    setOrgLogoUrl(org.logo_url ?? null);
  }, [isOrgAdmin, org?.org_id, org?.raison_sociale, org?.logo_url]);

  // Charger le plan B2C de l'admin pour décider d'afficher le switcher d'espace
  useEffect(() => {
    if (!isOrgAdmin || !user?.id) { setHasB2CPlan(false); return; }
    let cancelled = false;
    supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setHasB2CPlan(!!data?.plan && data.plan !== 'nouveau');
      });
    return () => { cancelled = true; };
  }, [isOrgAdmin, user?.id]);

  const adminInitials = (
    (user?.email?.[0] ?? '') + (user?.email?.[1] ?? '')
  ).toUpperCase();

  // Admin orga → TeamSidebar partout (desktop). Mobile → Header standard.
  if (isOrgAdmin && !loading) {
    return (
      <div className="min-h-screen bg-dashboard-bg">
        {!isMobile && (
          <TeamSidebar
            orgName={orgName}
            orgLogoUrl={orgLogoUrl}
            adminInitials={adminInitials}
            hasLicense={hasLicense}
          />
        )}
        {isMobile && <Header />}
        <main className={`min-h-screen ${isMobile ? '' : 'ml-sidebar'}`}>
          <div className={`mx-auto w-full max-w-7xl py-10 ${isMobile ? 'px-4 pb-20' : 'px-4 sm:px-6 lg:px-8'}`}>
            <Outlet />
            <Disclaimer />
          </div>
        </main>
        {isMobile && <MobileBottomNav />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {!isMobile && <AppSidebar />}
      {isMobile && <Header />}
      <main className={`min-h-screen ${isMobile ? '' : 'ml-sidebar'}`}>
        <div className={`mx-auto w-full max-w-7xl py-10 ${isMobile ? 'px-4 pb-20' : 'px-4 sm:px-6 lg:px-8'}`}>
          <Outlet />
          <Disclaimer />
        </div>
      </main>
      {isMobile && <MobileBottomNav />}
    </div>
  );
}
