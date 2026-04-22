import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLayout() {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {!isMobile && <AppSidebar />}
      <main className={`min-h-screen ${isMobile ? '' : 'ml-sidebar'}`}>
        <div className={`mx-auto w-full max-w-7xl py-10 ${isMobile ? 'px-4 pb-20' : 'px-4 sm:px-6 lg:px-8'}`}>
          <Outlet />
        </div>
      </main>
      {isMobile && <MobileBottomNav />}
    </div>
  );
}
