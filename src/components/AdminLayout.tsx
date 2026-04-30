import { Outlet, Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AdminMobileNav } from '@/components/AdminMobileNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUnreadSuggestions } from '@/hooks/useUnreadSuggestions';
import { Badge } from '@/components/ui/badge';

export function AdminLayout() {
  const isMobile = useIsMobile();
  const unread = useUnreadSuggestions();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(var(--dashboard-bg))' }}>
      {!isMobile && <AdminSidebar />}
      <main className={`min-h-screen ${isMobile ? '' : 'ml-[260px]'}`}>
        {/* Top bar with notification bell */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end border-b bg-background/80 backdrop-blur px-6">
          <Link
            to="/admin/suggestions"
            aria-label={`Suggestions${unread > 0 ? ` (${unread} non lues)` : ''}`}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <Badge
                className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px] font-bold rounded-full bg-red-500 text-white border-2 border-background"
              >
                {unread > 99 ? '99+' : unread}
              </Badge>
            )}
          </Link>
        </header>
        <div className={`mx-auto w-full max-w-screen-2xl py-10 ${isMobile ? 'px-4 pb-20' : 'px-8'}`}>
          <Outlet />
        </div>
      </main>
      {isMobile && <AdminMobileNav />}
    </div>
  );
}
