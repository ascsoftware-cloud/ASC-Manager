import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { canManageTeam, canUse, type PermissionKey } from "@/lib/permissions";
import { useCurrentUser, useHydrating, useStoreReady } from "@/lib/store";

/**
 * Wraps a page that only some logins may open. ASC staff and account admins
 * always pass; a client staff login needs `perm` ticked by their admin.
 */
export function PermissionGate({
  perm,
  children,
}: {
  perm: PermissionKey;
  children: ReactNode;
}) {
  const ready = useStoreReady();
  const hydrating = useHydrating();
  const user = useCurrentUser();
  if (!ready || (hydrating && !user)) return <PageSkeleton />;
  if (!canUse(user, perm)) return <Navigate to="/" />;
  return <>{children}</>;
}

/** The team page: account admins only. */
export function TeamGate({ children }: { children: ReactNode }) {
  const ready = useStoreReady();
  const hydrating = useHydrating();
  const user = useCurrentUser();
  if (!ready || (hydrating && !user)) return <PageSkeleton />;
  if (!canManageTeam(user)) return <Navigate to="/" />;
  return <>{children}</>;
}
