import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { useCurrentUser, useHydrating, useStoreReady } from "@/lib/store";

export function StaffGate({ children }: { children: ReactNode }) {
  const ready = useStoreReady();
  const hydrating = useHydrating();
  const user = useCurrentUser();
  if (!ready || (hydrating && !user)) return <PageSkeleton />;
  if (user?.role !== "operator") return <Navigate to="/" />;
  return <>{children}</>;
}
