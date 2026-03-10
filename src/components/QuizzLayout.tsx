import { AppSidebar } from '@/components/AppSidebar';

export function QuizzLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed />
      <main className="ml-[20px] flex min-h-screen items-center justify-center">
        <div className="w-full max-w-content px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
