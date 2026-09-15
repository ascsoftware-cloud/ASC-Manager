import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Surface } from "@/components/page-header";

export const Route = createFileRoute("/_app/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageHeader
        eyebrow="Legal"
        title="Privacy policy"
        description="Atlas Scale Collective (Pty) Ltd · 2026/726493/07 · Pretoria"
      />
      <Surface className="space-y-4 p-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          ASC Manager is the client and system panel for Atlas Scale Collective,
          trading as ASC Software. This notice is written for South Africa and
          POPIA.
        </p>
        <h2 className="font-display text-lg text-champagne">What we hold</h2>
        <p>
          Client companies, sites, monitors, renewals, visitor counts, support
          requests, and the website fields a client is allowed to change. That
          data is stored per tenant in our database. Staff can see every
          client; a client user sees only their own.
        </p>
        <h2 className="font-display text-lg text-champagne">Why</h2>
        <p>
          To watch the systems we run for you, and to let you change the parts
          of a site you are meant to change. Signed in, you see your own and
          nothing else. We do not sell personal information.
        </p>
        <h2 className="font-display text-lg text-champagne">Cookies</h2>
        <p>
          Necessary cookies keep the panel working. Optional analytics only load
          after you accept. See the banner on first visit.
        </p>
        <h2 className="font-display text-lg text-champagne">Your rights</h2>
        <p>
          Access, correction, deletion, and objection under POPIA. Write to
          privacy@ascsoftware.co.za. Complaints: Information Regulator (South
          Africa).
        </p>
        <p className="text-xs">Last updated 15 September 2026.</p>
      </Surface>
    </div>
  );
}
