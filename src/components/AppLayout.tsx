import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { Disclaimer } from '@/components/Disclaimer';
import { Header } from '@/components/Header';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLayout() {
  const isMobile = useIsMobile();

  // AppLayout sert les routes B2C (/dashboard, /mes-modules, /profil, etc.).
  // On affiche toujours la AppSidebar : pour un admin org avec accès B2C
  // (licence Team ou plan B2C), le SpaceSwitcher en haut de la sidebar
  // permet de revenir vers /impots-team/dashboard.
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
