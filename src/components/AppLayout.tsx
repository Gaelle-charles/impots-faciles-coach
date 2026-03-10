import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-sidebar min-h-screen">
        <div className="mx-auto max-w-content px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
