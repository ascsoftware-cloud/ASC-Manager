import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalDoc, LegalH, LegalList, LegalTable, Mail } from "@/components/legal-prose";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageHeader
        eyebrow="Legal"
        title="Terms and conditions"
        description="These terms cover this website and work quoted or built by Atlas Scale Collective (Pty) Ltd, trading as ASC Software. Last updated 12 September 2026."
      />
      <LegalDoc>
        <LegalH>The studio</LegalH>
        <LegalTable
          rows={[
            ["Registered name", "Atlas Scale Collective (Pty) Ltd"],
            [
              "Legal status",
              "Private company incorporated in the Republic of South Africa",
            ],
            ["Registration number", "2026/726493/07"],
            ["Trading name", "ASC Software"],
            ["Directors", "Gregory Candiotes, Tiaan Schoeman"],
            ["Physical address", "[STREET ADDRESS], Pretoria, [POSTAL CODE], South Africa"],
            ["Telephone", "[TELEPHONE NUMBER]"],
            ["Email", <Mail key="hello" to="hello@ascsoftware.co.za" />],
            ["Website", "www.ascsoftware.co.za"],
          ]}
        />
        <p>
          We are not a registered VAT vendor. We do not belong to a
          self-regulatory body, and we are not subject to an industry code of
          conduct.
        </p>

        <LegalH>Which terms apply</LegalH>
        <p>
          These terms cover this website and, until we sign something more
          specific with you, the quote and the work.
        </p>
        <p>
          Where we and a client sign a services agreement,{" "}
          <strong className="text-champagne">
            that agreement governs the work and prevails over these terms and
            over anything published on this site
          </strong>
          . A signed quote or statement of work under that agreement prevails
          over these terms for the engagement it covers.
        </p>

        <LegalH>This website</LegalH>
        <p>
          The site is an invitation to send a brief, not an offer to the world
          at large. Content is provided as a description of the studio. We may
          change packages, copy, and published starting prices without notice.
        </p>

        <LegalH>Quotes and From prices</LegalH>
        <p>
          Prices on this site are starting points, shown as From, in South
          African Rand. They are not a final fee. Apps, systems, and custom
          websites are often price on application until we have the brief.
        </p>
        <p>
          A quote we send after your brief is our offer. It is scoped to that
          brief. Extra pages, features, integrations, or revisions outside the
          quote are additional work and may be charged. Nothing is a binding
          build contract until you accept the quote in writing, including by
          email, and we confirm.
        </p>

        <LegalH>The work</LegalH>
        <p>
          We design and engineer websites, apps, and systems. Unless the
          accepted quote or a signed services agreement says otherwise:
        </p>
        <LegalList
          items={[
            "you supply brand, copy, images, and access we reasonably need",
            "you review work in the time we agree so the job can move",
            "we build to the accepted scope, in Pretoria, quoted in Rand",
            "hosting and maintenance, where included, are billed monthly as quoted",
            "optional database and add-ons are only included if the quote says so",
          ]}
        />
        <p>
          Timelines in a quote are estimates. They depend on a complete brief
          and timely feedback. We are not liable for delay caused by missing
          content, third-party platforms, or approvals on your side.
        </p>

        <LegalH>Fees</LegalH>
        <p>
          Fees, deposits, and payment dates are those in the accepted quote. All
          prices are in Rand unless we state otherwise.
        </p>
        <p>
          Prices exclude value-added tax. We are not currently a registered VAT
          vendor, so no VAT is charged. If we become registered, VAT at the
          applicable rate will be added to invoices issued after the date of
          registration.
        </p>
        <p>
          Work may pause if an invoice is overdue. Monthly hosting or
          maintenance can be stopped if those fees are unpaid, after notice.
        </p>

        <LegalH>Cancellation</LegalH>
        <p>Either of us may end an engagement on reasonable written notice.</p>
        <p>
          If you end it, you pay for work performed and third-party costs
          committed up to that point, and deposits are not refundable to the
          extent work has already been done. If we end it without cause, we
          invoice only for work performed and hand over what you have paid for.
        </p>
        <p>
          Where a cooling-off right applies to an electronic transaction, it
          does not extend to work we have begun with your agreement, or to
          anything made to your specification. Bespoke software is made to your
          specification.
        </p>

        <LegalH>Intellectual property</LegalH>
        <p>
          We retain the studio&apos;s own tools, components, libraries, and
          methods, including any of them built into what we deliver.
        </p>
        <p>
          <strong className="text-champagne">
            On payment in full of the accepted quote, ownership of the
            intellectual property in the deliverables described in that quote
            transfers to you
          </strong>
          , excluding our own tools and components and any third-party products.
          Where our tools or components are built into a deliverable, you get a
          perpetual, worldwide, royalty-free licence to use and modify them as
          part of that deliverable, but not to extract, license, or resell them
          separately.
        </p>
        <p>
          Until we are paid in full, the intellectual property in the
          deliverables remains ours, and you have a licence to use them for
          review and testing only.
        </p>
        <p>
          You keep your brand, content, and data throughout. Third-party fonts,
          stock, libraries, and platforms stay under their own licences.
        </p>

        <LegalH>Warranties and liability</LegalH>
        <p>
          We build with reasonable skill and care. We do not warrant that a
          site, app, or system will be error-free, uninterrupted, or fit for a
          purpose we were not told about in the brief.
        </p>
        <p>
          To the extent the Consumer Protection Act 68 of 2008 or other law
          allows, our liability for any claim arising from a quote or the work
          is limited to the fees you paid us for that job, and we are not liable
          for indirect or consequential loss, including lost profit, lost
          revenue, or lost data.
        </p>
        <p>
          You are responsible for keeping your own backups of your content and
          data.
        </p>
        <p>
          No claim may be brought more than 12 months after the date you became
          aware, or ought reasonably to have become aware, of the facts giving
          rise to it.
        </p>
        <p>
          Nothing in these terms limits liability for fraud, or for death or
          personal injury caused by negligence, or any liability that South
          African law does not allow us to limit.
        </p>

        <LegalH>Acceptable use</LegalH>
        <p>
          Do not misuse this site, including scraping, attacking, or sending a
          brief on someone else&apos;s behalf without authority. Quote
          submissions must be accurate so we can price the work.
        </p>

        <LegalH>Personal information</LegalH>
        <p>
          Personal information is handled under our{" "}
          <Link to="/privacy" className="text-emerald hover:underline">
            privacy policy
          </Link>
          .
        </p>
        <p>
          Where we process personal information on your behalf in the course of
          the work, you are the responsible party and we are your operator under
          the Protection of Personal Information Act 4 of 2013. Those
          arrangements are set out in our services agreement.
        </p>

        <LegalH>Governing law</LegalH>
        <p>
          These terms, and any quote or build contract, are governed by the law
          of the Republic of South Africa.
        </p>
        <p>
          We each consent, in terms of section 45 of the Magistrates&apos;
          Courts Act 32 of 1944, to the jurisdiction of the Magistrates&apos;
          Court for any proceedings arising from these terms or the work, even
          where the amount in dispute exceeds that court&apos;s ordinary
          jurisdiction. This does not stop either of us from bringing
          proceedings in a High Court with jurisdiction, and it does not limit
          any rights you have as a consumer under the Consumer Protection Act.
        </p>

        <LegalH>Changes</LegalH>
        <p>
          We may update these terms. The date at the top is the current version
          for the website. An accepted quote stays on the terms that applied
          when you accepted it, unless we both agree otherwise.
        </p>
      </LegalDoc>
    </div>
  );
}
