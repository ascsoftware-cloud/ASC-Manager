import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Surface } from "@/components/page-header";

export const Route = createFileRoute("/_app/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageHeader
        eyebrow="Legal"
        title="Terms of use"
        description="ASC Manager is provided by Atlas Scale Collective (Pty) Ltd."
      />
      <Surface className="space-y-4 p-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          By using this panel you act for an ASC client or as ASC staff. Do not
          enter data you are not allowed to process.
        </p>
        <h2 className="font-display text-lg text-champagne">The service</h2>
        <p>
          One login per person. ASC staff see every client. A client sees only
          their own sites, content, visitors, requests and renewals. Payments
          on live sites go through Yoco or PayFast only.
        </p>
        <h2 className="font-display text-lg text-champagne">This preview</h2>
        <p>
          Sample clients are fiction for demonstration. Reset demo restores
          them. Nothing here is a production contract.
        </p>
        <h2 className="font-display text-lg text-champagne">Liability</h2>
        <p>
          ASC is not liable for losses from misuse of the panel, unpaid orders
          you mark as paid, or content you publish. South African law applies.
          Courts of Pretoria.
        </p>
        <p className="text-xs">Last updated 15 September 2026.</p>
      </Surface>
    </div>
  );
}
