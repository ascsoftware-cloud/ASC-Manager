import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUser } from "@/lib/store";
import { ClientOverview } from "./-client-overview";
import { StaffDashboard } from "./-staff-dashboard";

export const Route = createFileRoute("/_app/")({
  component: HomePage,
});

function HomePage() {
  const user = useCurrentUser();
  if (user?.role === "client") return <ClientOverview />;
  return <StaffDashboard />;
}
