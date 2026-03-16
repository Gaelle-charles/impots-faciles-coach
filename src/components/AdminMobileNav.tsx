import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { AdminSidebar } from '@/components/AdminSidebar';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating admin button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg md:hidden"
        style={{ backgroundColor: 'hsl(0 67% 35%)' }}
      >
        <Settings className="h-4 w-4" />
        Admin
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-[260px] p-0 border-0"
          style={{ backgroundColor: 'hsl(222 47% 11%)' }}
        >
          <VisuallyHidden>
            <SheetTitle>Menu admin</SheetTitle>
          </VisuallyHidden>
          <div onClick={() => setOpen(false)} className="h-full [&>aside]:relative [&>aside]:w-full">
            <AdminSidebar />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
