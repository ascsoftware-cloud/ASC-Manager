import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc, LegalH, LegalList, LegalTable, Mail } from "@/components/legal-prose";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageHeader
        eyebrow="Legal"
        title="Privacy policy"
        description="Atlas Scale Collective (Pty) Ltd, trading as ASC Software, is the responsible party for personal information collected through this site. Last updated 12 September 2026."
      />
      <LegalDoc>
        <LegalH>Who we are</LegalH>
        <p>
          Atlas Scale Collective (Pty) Ltd (trading as ASC Software), registration
          number 2026/726493/07, of [STREET ADDRESS], Pretoria, [POSTAL CODE],
          South Africa.
        </p>
        <p>
          Our Information Officer is [INFORMATION OFFICER NAME], registered with
          the Information Regulator of South Africa. For privacy questions, POPIA
          requests, or anything addressed to the Information Officer, email{" "}
          <Mail to="admin@ascsoftware.co.za" /> or write to the address above.
        </p>
        <p>
          For general enquiries, email <Mail to="hello@ascsoftware.co.za" />.
        </p>

        <LegalH>What we collect</LegalH>
        <p>When you send a brief through the quote form, we collect:</p>
        <LegalList
          items={[
            "name, email address, and phone number",
            "company name, if you give one",
            "the package or practice you selected, any add-ons, and the brief you write",
          ]}
        />
        <p>
          We collect this directly from you. We also receive ordinary technical
          data from your browser when you load the site, for example IP address,
          device type, and pages requested, through our hosting logs.
        </p>
        <p>
          We do not ask for identity documents, payment-card numbers, or special
          personal information on this site, and we do not knowingly collect
          information from children.
        </p>

        <LegalH>Whether you have to give it</LegalH>
        <p>
          Giving us this information is voluntary. You are not obliged to send a
          brief.
        </p>
        <p>
          Name, email address, and phone number are required fields in the form.
          Without them we cannot prepare or send you a quote, or reply to you.
          Company name and the brief itself are optional, but the less you tell
          us, the rougher the quote.
        </p>

        <LegalH>Why we use it</LegalH>
        <p>We use that information to:</p>
        <LegalList
          items={[
            "prepare and send a scoped quote in Rand",
            "reply to you about the work",
            "keep a record of briefs and correspondence",
            "perform a contract if you accept a quote",
            "meet tax, company, and other legal duties",
          ]}
        />
        <p>
          We do not sell personal information, and we do not use it for
          advertising networks.
        </p>

        <LegalH>POPIA</LegalH>
        <p>
          We process personal information under the Protection of Personal
          Information Act 4 of 2013. Depending on the step, that is because you
          asked us for a quote, because we need it to take steps toward a
          contract, because we have a legitimate interest in running the studio,
          or because the law requires a record.
        </p>

        <LegalH>Who else sees it</LegalH>
        <p>
          Briefs are read by the studio, which is the two directors and no one
          else.
        </p>
        <p>
          We use the following operators to run the site and deliver messages:
        </p>
        <LegalTable
          headers={["Operator", "What they do", "Where they process it"]}
          rows={[
            [
              "Vercel Inc.",
              "Hosts this website and runs the function that receives your brief",
              "United States",
            ],
            [
              "Formspree Inc.",
              "Processes quote form submissions and delivers them to us",
              "United States",
            ],
            [
              "Afrihost (Pty) Ltd",
              "Hosts our ascsoftware.co.za mailboxes",
              "South Africa",
            ],
          ]}
        />
        <p>
          We do not use a database for this site, and we run no advertising or
          analytics services on it.
        </p>
        <p>
          We will also share information if the law requires it, or to protect
          our rights.
        </p>

        <LegalH>Information sent outside South Africa</LegalH>
        <p>
          Vercel and Formspree process personal information in the United States.
          That is a cross-border transfer under section 72 of POPIA.
        </p>
        <p>
          We rely on section 72(1)(b): the transfer is necessary to take steps,
          at your own request, toward concluding a contract between you and us.
          When you send a brief asking for a quote, delivering that brief to us
          is the step you asked for, and it cannot happen without those
          providers.
        </p>
        <p>
          We choose providers that commit contractually to protecting personal
          information, and we send them only what the form collects.
        </p>

        <LegalH>How we secure it</LegalH>
        <p>
          We take appropriate, reasonable technical and organisational measures
          to protect personal information, as section 19 of POPIA requires. In
          practice:
        </p>
        <LegalList
          items={[
            "the site is served over HTTPS, so what you type in the form is encrypted in transit",
            "access to briefs is limited to the two directors",
            "our mailboxes are protected by two-factor authentication",
            "we do not store payment-card details or special personal information anywhere",
          ]}
        />
        <p>
          If personal information in our care is accessed or acquired by an
          unauthorised person, we will notify the Information Regulator and the
          people affected, as section 22 of POPIA requires.
        </p>

        <LegalH>How long we keep it</LegalH>
        <LegalList
          items={[
            <>
              <strong className="text-champagne">Briefs that do not become work:</strong>{" "}
              12 months from your last contact with us, then deleted.
            </>,
            <>
              <strong className="text-champagne">Client records and correspondence:</strong>{" "}
              5 years after the engagement ends.
            </>,
            <>
              <strong className="text-champagne">Accounting records:</strong> 7
              years, as the Companies Act 71 of 2008 requires.
            </>,
            <>
              <strong className="text-champagne">Hosting logs:</strong> as long as
              our providers retain them for security and operations, typically a
              short period measured in weeks.
            </>,
          ]}
        />
        <p>
          You can ask us to delete a brief earlier than this. We will do so
          unless we must keep it for a legal reason, and we will tell you if
          that is the case.
        </p>

        <LegalH>Your rights</LegalH>
        <p>You may ask us to:</p>
        <LegalList
          items={[
            "confirm whether we hold your personal information",
            "access it, correct it, or delete it",
            "object to how we use it, or withdraw consent where we relied on consent",
          ]}
        />
        <p>
          Write to <Mail to="admin@ascsoftware.co.za" />. We will respond within
          a reasonable period, and in any event within the time POPIA allows.
          There is no charge for a request, unless it is repetitive or
          excessive, in which case we will tell you the fee before doing the
          work.
        </p>
        <p>
          POPIA gives you the right to complete the Regulator&apos;s prescribed
          forms for access and objection. Ask us and we will point you to them.
        </p>
        <p>
          If you are not satisfied with how we have handled a request, you may
          complain to the Information Regulator (South Africa) at{" "}
          <a
            className="text-emerald hover:underline"
            href="https://inforegulator.org.za/"
            target="_blank"
            rel="noreferrer"
          >
            inforegulator.org.za
          </a>
          , by email to{" "}
          <Mail to="complaints.IR@inforegulator.org.za" />, or at their offices
          in Johannesburg.
        </p>

        <LegalH>Cookies and browser storage</LegalH>
        <p>
          This site sets <strong className="text-champagne">no cookies</strong>.
        </p>
        <p>
          It uses one browser storage entry, which remembers your scroll position
          while you move between pages and is cleared when you close the tab.
          Nothing in it identifies you.
        </p>
        <p>
          We run no advertising cookies, no analytics, and no third-party
          trackers on this site.
        </p>

        <LegalH>Changes</LegalH>
        <p>
          We may update this policy when the studio or the law changes. The date
          at the top of this page is the current version.
        </p>
      </LegalDoc>
    </div>
  );
}
