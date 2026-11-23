import { createFileRoute, Outlet } from "@tanstack/react-router";
import { StaffGate } from "@/components/staff-gate";

export const Route = createFileRoute("/_app/clients")({
  component: () => (
    <StaffGate>
      <Outlet />
    </StaffGate>
  ),
});
