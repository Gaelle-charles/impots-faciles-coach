import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminMobileNav } from '@/components/AdminMobileNav';
import { useIsMobile } from '@/hooks/use-mobile';

export function AdminLayout() {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(var(--dashboard-bg))' }}>
      {!isMobile && <AdminSidebar />}
      <main className={`min-h-screen ${isMobile ? '' : 'ml-[260px]'}`}>
        <div className={`mx-auto max-w-content py-10 ${isMobile ? 'px-4 pb-20' : 'px-8'}`}>
          <Outlet />
        </div>
      </main>
      {isMobile && <AdminMobileNav />}
    </div>
  );
}
