"use client";

/**
 * The Terms of Agreement that govern the platform, mirrored from the public
 * terms page so a broker can read them without leaving the console.
 */

interface Section {
  id: string;
  title: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    body: [
      'By registering for, accessing, or using ZCanopy (the "Platform") as a broker, agent, or client, you agree to be bound by this Terms of Agreement. If you do not agree with any part of these terms, you must not use the Platform.',
    ],
  },
  {
    id: "eligibility",
    title: "2. Broker Eligibility & Verification",
    body: [
      "Brokers must provide accurate identity information, including a valid government-issued ID, phone number, and email address. ZCanopy reserves the right to verify this information and to suspend or terminate any account that provides false, misleading, or incomplete details.",
      "You are responsible for keeping your broker code confidential and for all activity conducted under your account.",
    ],
  },
  {
    id: "landlord-payment",
    title: "3. Landlord Information, Payment for the Property & Disputes",
    body: [
      "Where a listing includes the details of the landlord, those details - including the landlord's name, national identification number and phone number - are collected and kept for security reasons and for the prevention of fraud. They are used to confirm that the person offering a property is the owner or has been authorised by the owner, and to investigate any transaction that is reported or looks irregular. They are not published to customers and they are not used for marketing.",
      "A customer pays the person who uploaded the property - the broker, agent or authorised representative who posted the listing - for that person's work. The fee for the service is agreed between the customer and the person who uploaded the property, and the customer is expected to pay it when the customer is satisfied with the property they have taken.",
      "ZCanopy provides the platform that makes the listing, the inspection and the booking possible. ZCanopy does not decide whether a customer is satisfied, whether a fee was fairly agreed, or what should happen if a customer and the person who uploaded the property cannot agree. Any such decision is out of the hands of ZCanopy, and ZCanopy will not take sides in a dispute between them. Where money is held on the Platform, its release follows the escrow rules set out below.",
    ],
  },
  {
    id: "conduct",
    title: "4. Acceptable Use & Prohibited Conduct",
    body: [
      "You agree not to use the Platform for any unlawful, fraudulent, or deceptive purpose. This includes, but is not limited to, listing properties you are not authorised to represent, misrepresenting property details, or collecting payments under false pretenses.",
    ],
  },
  {
    id: "fraud",
    title: "5. Fraud, Investigations & Cooperation with Authorities",
    body: [
      "ZCanopy has zero tolerance for fraud. In the event that fraudulent, criminal, or otherwise unlawful activity is suspected or reported in connection with your account or transactions, you expressly consent and agree that ZCanopy may disclose your personal and account information — including your full name, identity documents, phone number, email address, transaction history, and any related records — to the relevant law enforcement agencies, regulatory bodies, or other competent authorities.",
      "This disclosure may occur with or without prior notice to you, to the extent permitted by applicable law, and you waive any objection to such disclosure where it is made in good faith for the purpose of investigating, preventing, or prosecuting fraud or other unlawful conduct.",
      "You agree to cooperate fully with ZCanopy and any authorities in any investigation relating to your use of the Platform.",
    ],
  },
  {
    id: "commissions",
    title: "6. Commissions, Fees & Payments",
    body: [
      "Brokers agree to the applicable subscription fees, platform commissions, and payment terms as displayed on the Platform. ZCanopy may deduct platform commissions from transactions processed through the Platform.",
    ],
  },
  {
    id: "liability",
    title: "7. Limitation of Liability",
    body: [
      "ZCanopy acts as a marketplace connecting brokers and clients. We are not a party to the agreements between brokers and their clients and are not liable for the conduct of any user or the accuracy of any listing.",
    ],
  },
  {
    id: "privacy",
    title: "8. Privacy",
    body: [
      "We collect and process personal data in accordance with applicable data protection laws. By using the Platform you consent to the collection, storage, and processing of your data for the purposes of operating the Platform, verifying identities, and — where necessary — cooperating with authorities as described in Section 5.",
    ],
  },
  {
    id: "termination",
    title: "9. Suspension & Termination",
    body: [
      "ZCanopy may suspend or terminate your access to the Platform at any time, with or without notice, if you breach these terms or engage in conduct that harms the Platform, other users, or the public.",
    ],
  },
  {
    id: "changes",
    title: "10. Changes to These Terms",
    body: [
      "We may update these terms from time to time. Continued use of the Platform after changes take effect constitutes acceptance of the revised terms.",
    ],
  },
  {
    id: "contact",
    title: "11. Contact Us",
    body: [
      "For questions about these terms, contact us at support@support.zcanopy.com or +256741882818, Kampala, Uganda.",
    ],
  },
];

export default function TermsContent() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-[var(--zcanopy-card-brown)]">
          Terms of Agreement
        </h3>
        <p className="mt-1 text-sm text-[var(--zcanopy-muted)]">
          The terms that govern the use of ZCanopy by customers and brokers.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--zcanopy-accent-gold)]/40 bg-[var(--zcanopy-accent-gold)]/10 p-4">
        <p className="text-sm font-semibold text-[var(--zcanopy-card-brown)]">
          Important
        </p>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--zcanopy-muted)]">
          <li>
            The landlord&apos;s information is collected for security reasons and for the
            prevention of fraud. It is used to confirm that the person offering a property is
            the owner or has been authorised by the owner. It is not published to customers.
          </li>
          <li>
            A customer pays the person who uploaded the property - the broker, agent or
            authorised representative who posted the listing - for that person&apos;s work. The
            fee is due when the customer is satisfied with the property.
          </li>
          <li>
            ZCanopy provides the platform. It does not decide whether a customer is satisfied
            or what should happen when a customer and the person who uploaded the property
            cannot agree: any such decision is out of the hands of ZCanopy.
          </li>
        </ul>
      </div>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.id} id={`broker-terms-${section.id}`} className="scroll-mt-24">
            <h4 className="text-lg font-semibold text-[var(--zcanopy-card-brown)]">
              {section.title}
            </h4>
            <div className="mt-2 space-y-3 text-sm leading-relaxed text-[var(--zcanopy-muted)]">
              {section.body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
