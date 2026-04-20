import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAccess, type Plan } from '@/hooks/useAccess';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

export type AccessRequirement = 'authenticated' | 'starter' | 'expert' | 'premium' | 'admin';

const PLAN_HIERARCHY: Record<Plan, number> = {
  nouveau: 0,
  starter: 1,
  expert: 2,
  premium: 2,
};

const PLAN_LABEL: Record<AccessRequirement, string> = {
  authenticated: 'connecté',
  starter: 'Starter',
  expert: 'Expert',
  premium: 'Premium',
  admin: 'Admin',
};

interface AccessGuardProps {
  requires: AccessRequirement;
  children: ReactNode;
}

export function AccessGuard({ requires, children }: AccessGuardProps) {
  const { isLoading, isAuthenticated, plan, hasAdminAccess } = useAccess();
  const location = useLocation();

  const isAllowed = (() => {
    if (!isAuthenticated) return false;
    if (hasAdminAccess()) return true;
    if (requires === 'admin') return false;
    if (requires === 'authenticated') return true;
    return PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[requires as Plan];
  })();

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isAllowed) {
      toast({
        title: 'Accès restreint',
        description: `Ce contenu nécessite le plan ${PLAN_LABEL[requires]}`,
        variant: 'destructive',
      });
    }
  }, [isLoading, isAuthenticated, isAllowed, requires]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const redirect = location.pathname + location.search + location.hash;
    return <Navigate to={`/connexion?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (!isAllowed) {
    const recommended = requires === 'admin' || requires === 'authenticated' ? '' : requires;
    const target = recommended ? `/tarifs?recommended=${recommended}&redirected=1` : '/tarifs';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
