import { createFileRoute } from "@tanstack/react-router";
import { TeamGate } from "@/components/permission-gate";
import { PageHeader } from "@/components/page-header";
import { TeamManager } from "@/components/team-manager";
import { useOwnClientId } from "@/lib/store";

export const Route = createFileRoute("/_app/team")({
  component: () => (
    <TeamGate>
      <TeamPage />
    </TeamGate>
  ),
});

function TeamPage() {
  const clientId = useOwnClientId();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        eyebrow="Account"
        title="Team"
        description="Add the people who work on your sites. Choose which pages and which sites each person can use, and send a password reset any time."
      />
      {clientId ? <TeamManager clientId={clientId} /> : null}
    </div>
  );
}
