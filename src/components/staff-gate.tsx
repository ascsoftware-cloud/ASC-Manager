import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCurrentUser, useStoreReady } from "@/lib/store";

export function StaffGate({ children }: { children: ReactNode }) {
  const ready = useStoreReady();
  const user = useCurrentUser();
  if (!ready) return null;
  if (user?.role !== "operator") return <Navigate to="/" />;
  return <>{children}</>;
}
