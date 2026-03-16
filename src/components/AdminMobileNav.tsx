import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
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

      <Drawer open={open} onOpenChange={setOpen} direction="left">
        <DrawerContent
          className="h-full w-[260px] rounded-none border-0 p-0"
          style={{ backgroundColor: 'hsl(222 47% 11%)' }}
        >
          <VisuallyHidden>
            <DrawerTitle>Menu admin</DrawerTitle>
          </VisuallyHidden>
          <div onClick={() => setOpen(false)} className="h-full">
            <AdminSidebarMobile />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

/** Inline version without fixed positioning for drawer usage */
function AdminSidebarMobile() {
  // Re-use the same sidebar but override fixed positioning
  return (
    <div className="h-full [&>aside]:relative [&>aside]:w-full">
      <AdminSidebar />
    </div>
  );
}
