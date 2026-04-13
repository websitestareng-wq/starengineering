"use client";

import WebsiteHeader from "@/components/website/WebsiteHeader";
import WebsiteFooter from "@/components/website/WebsiteFooter";

export default function PrivacyPolicyPage() {
  const lastUpdated = "February 27, 2026";

  return (
    <div className="site">
      <WebsiteHeader />

      <main className="main">
        <div className="legalPage">
          <div className="legalHero">
            <div className="legalHeroInner">
              <div className="legalBadge">Legal</div>
              <h1 className="legalTitle gradText">Privacy Policy</h1>
              <p className="legalSub">
                STAR ENGINEERING (“we”, “us”, “our”) respects your privacy and is
                committed to protecting your personal information.
              </p>
              <div className="legalMeta">Last Updated: {lastUpdated}</div>
            </div>
          </div>

          <div className="legalWrap">
            <div className="legalCard">
              <h2>1. Scope</h2>
              <p>
                This Privacy Policy explains how STAR ENGINEERING collects, uses,
                shares, and protects information when you visit our website, use our
                portals, request quotations, place orders, submit enquiries, or
                otherwise interact with us (collectively, the “Services”).
              </p>
              <p>
                By using our Services, you agree to the collection and use of
                information in accordance with this Privacy Policy.
              </p>

              <h2>2. Information We Collect</h2>

              <h3>2.1 Information you provide</h3>
              <ul>
                <li>
                  <b>Contact details:</b> name, company name, email address, phone
                  number, and address when you submit an enquiry, request a quote, or
                  create an account.
                </li>
                <li>
                  <b>Business & order details:</b> purchase order information,
                  delivery/dispatch details, GST/company details (if applicable),
                  product specifications, and communications.
                </li>
                <li>
                  <b>Account/portal information:</b> login verification (OTP or other
                  methods as applicable), and preferences.
                </li>
                <li>
                  <b>Support content:</b> messages, attachments, and feedback you
                  choose to send us.
                </li>
              </ul>

              <h3>2.2 Information collected automatically</h3>
              <ul>
                <li>
                  <b>Device & usage data:</b> IP address, browser type, device
                  identifiers, pages viewed, time spent, referral URLs, and
                  interactions to maintain performance and security.
                </li>
                <li>
                  <b>Cookies & similar technologies:</b> used to remember settings,
                  improve user experience, and understand traffic patterns.
                </li>
              </ul>

              <h3>2.3 Payment information (Manual payments today; gateway optional in future)</h3>
              <p>
                <b>Current payment method:</b> At present, we typically accept
                payments/collections through <b>manual methods</b> such as bank
                transfer (NEFT/RTGS/IMPS), UPI, cash, cheque, or other offline banking
                channels, as agreed with the customer.
              </p>
              <p>
                For these manual payments, we may collect and store limited details
                necessary for billing, reconciliation, and compliance, such as{" "}
                <b>payer name</b>, <b>bank reference/UTR</b>, <b>transaction date</b>,
                <b> amount</b>, and <b>invoice/receipt mapping</b>.
              </p>
              <p>
                <b>Future option:</b> In the future, we may enable online payments
                via a third-party payment gateway or banking partner. If enabled,
                payments would be processed by the gateway and governed by their
                policies and applicable regulations. We would not store full card
                details (such as complete card number or CVV) on our servers. We may
                receive payment status and reference IDs to confirm the transaction.
              </p>

              <h2>3. How We Use Your Information</h2>
              <ul>
                <li>
                  To provide and operate our Services (quotations, orders, dispatch,
                  invoices, receipts, ledgers, support).
                </li>
                <li>
                  To communicate with you regarding enquiries, quotations, orders,
                  delivery updates, and service notices.
                </li>
                <li>
                  To maintain accounting records, reconcile payments/collections, and
                  prevent fraud.
                </li>
                <li>
                  To improve the website/portals, troubleshoot issues, and enhance
                  security and performance.
                </li>
                <li>
                  To comply with legal obligations and enforce our terms/policies.
                </li>
                <li>
                  With consent (where required), to send updates about products and
                  services.
                </li>
              </ul>

              <h2>4. Grounds for Processing</h2>
              <p>
                We process personal information only when we have a valid reason,
                including:
              </p>
              <ul>
                <li>
                  <b>Performance of a contract</b> (e.g., fulfilling orders, providing
                  quotations and service).
                </li>
                <li>
                  <b>Legitimate interests</b> (e.g., business operations, security,
                  preventing fraud, improving services).
                </li>
                <li>
                  <b>Compliance with law</b> (e.g., tax, accounting, regulatory, and
                  legal obligations).
                </li>
                <li>
                  <b>Consent</b> (e.g., marketing communications where required).
                </li>
              </ul>

              <h2>5. Sharing of Information</h2>
              <p>
                We do not sell your personal information. We may share information
                only as necessary:
              </p>
              <ul>
                <li>
                  <b>Service providers:</b> hosting, email/SMS/OTP providers,
                  analytics, customer support tools, and security services.
                </li>
                <li>
                  <b>Banking/payment partners:</b> to reconcile transactions and, if
                  enabled in future, to process online payments.
                </li>
                <li>
                  <b>Logistics/transport partners:</b> for pickup, delivery, and
                  shipment tracking.
                </li>
                <li>
                  <b>Legal and compliance:</b> if required by law, court order, or to
                  protect rights, safety, and security.
                </li>
                <li>
                  <b>Business transfers:</b> in case of merger, acquisition,
                  restructuring, or asset sale.
                </li>
              </ul>

              <h2>6. Data Retention</h2>
              <p>
                We retain personal information only as long as needed for the purposes
                described in this Privacy Policy, including legal, accounting, and
                compliance requirements.
              </p>
              <ul>
                <li>
                  <b>Order, invoice, receipt & accounting records:</b> retained as
                  required under applicable tax and accounting laws.
                </li>
                <li>
                  <b>Support communications:</b> retained to resolve issues and
                  improve service quality.
                </li>
                <li>
                  <b>Security logs:</b> retained for a limited period for security and
                  fraud prevention.
                </li>
              </ul>

              <h2>7. Security Measures</h2>
              <p>
                We implement reasonable administrative, technical, and physical
                safeguards to protect information. However, no method of transmission
                over the internet is 100% secure.
              </p>

              <h2>8. Cookies & Tracking Technologies</h2>
              <p>Cookies help us provide a better experience. We may use:</p>
              <ul>
                <li><b>Essential cookies</b> for site/portal functionality and security.</li>
                <li><b>Preference cookies</b> to remember your settings.</li>
                <li><b>Analytics cookies</b> to understand usage and improve the Services.</li>
              </ul>

              <h2>9. Your Rights & Choices</h2>
              <p>
                Depending on applicable law, you may have rights to access, correct,
                update, or delete your personal information.
              </p>
              <ul>
                <li><b>Access & correction:</b> request a copy or correction of your data.</li>
                <li><b>Deletion:</b> request deletion where legally permissible.</li>
                <li><b>Marketing opt-out:</b> unsubscribe from promotional messages.</li>
                <li><b>Consent withdrawal:</b> where applicable, you may withdraw consent.</li>
              </ul>

              <h2>10. Children’s Privacy</h2>
              <p>
                Our Services are not directed to children under 18. We do not knowingly
                collect personal information from children.
              </p>

              <h2>11. International Data Transfers</h2>
              <p>
                Your information may be processed in India and may be transferred to
                other countries where our service providers operate.
              </p>

              <h2>12. Third-Party Links</h2>
              <p>
                Our Services may contain links to third-party websites. We are not
                responsible for their privacy practices.
              </p>

              <h2>13. Contact / Grievance</h2>
              <p>
                If you have questions, requests, or complaints about this Privacy
                Policy or our data practices, contact:
              </p>

              <div className="legalContact">
                <div className="legalContactRow">
                  <span className="k">Company:</span>
                  <span className="v">STAR ENGINEERING</span>
                </div>
                <div className="legalContactRow">
                  <span className="k">Email:</span>
                  <span className="v">corporate@stareng.co.in</span>
                </div>
                <div className="legalContactRow">
                  <span className="k">Phone:</span>
                  <span className="v">+91-9702485922</span>
                </div>
                <div className="legalContactRow">
                  <span className="k">Address:</span>
                  <span className="v">
                    Shop No. 5, Chunawala Compound, Opp. BEST Depot / Kanakia
                    Zillion, LBS Marg, Kurla (W), Mumbai - 400070, Maharashtra.
                  </span>
                </div>
              </div>

              <p className="legalNote">
                We aim to respond within a reasonable time and as required by
                applicable law.
              </p>

              <h2>14. Updates to this Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Changes will be
                posted on this page with an updated “Last Updated” date.
              </p>
            </div>
          </div>
        </div>

        <style jsx>{`
          .legalPage {
            min-height: 100vh;
            color: #0f172a;
            background:
              radial-gradient(900px 420px at 15% 0%, rgba(255, 0, 102, 0.10), transparent 60%),
              radial-gradient(760px 380px at 95% 18%, rgba(0, 102, 255, 0.10), transparent 55%),
              radial-gradient(920px 520px at 80% 110%, rgba(255, 170, 0, 0.10), transparent 60%),
              radial-gradient(820px 420px at 52% 105%, rgba(163, 0, 255, 0.08), transparent 65%),
              linear-gradient(145deg, #ffffff 0%, #f7f8ff 50%, #ffffff 100%);
          }

          .legalHero {
            padding: 22px 16px 18px;
          }

          .legalHeroInner {
            max-width: 980px;
            margin: 0 auto;
            padding: 22px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.75);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(15, 23, 42, 0.10);
            box-shadow: 0 12px 30px rgba(2, 6, 23, 0.06);
          }

          .legalBadge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 12px;
            letter-spacing: 0.2px;
            color: #1e293b;
            background: rgba(43, 103, 246, 0.10);
            border: 1px solid rgba(43, 103, 246, 0.18);
            margin-bottom: 10px;
          }

          .legalTitle {
            margin: 0;
            font-size: 34px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }

          .legalSub {
            margin: 10px 0 0;
            color: #475569;
            font-size: 14.5px;
            max-width: 780px;
            line-height: 1.7;
          }

          .legalMeta {
            margin-top: 10px;
            font-size: 12.5px;
            color: #64748b;
          }

          .legalWrap {
            padding: 0 16px 56px;
          }

          .legalCard {
            max-width: 980px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.90);
            border: 1px solid rgba(15, 23, 42, 0.10);
            border-radius: 18px;
            padding: 22px;
            box-shadow: 0 12px 30px rgba(2, 6, 23, 0.06);
          }

          .legalCard h2 {
            margin: 18px 0 10px;
            font-size: 18px;
            letter-spacing: -0.2px;
          }

          .legalCard h3 {
            margin: 12px 0 8px;
            font-size: 15px;
          }

          .legalCard p {
            margin: 8px 0;
            color: #334155;
            font-size: 14px;
            line-height: 1.7;
          }

          .legalCard ul {
            margin: 8px 0 10px 18px;
            color: #334155;
            font-size: 14px;
            line-height: 1.7;
          }

          .legalContact {
            margin-top: 10px;
            border: 1px solid rgba(15, 23, 42, 0.10);
            background: rgba(248, 250, 252, 0.70);
            border-radius: 14px;
            padding: 14px;
          }

          .legalContactRow {
            display: flex;
            gap: 10px;
            padding: 6px 0;
            border-bottom: 1px dashed rgba(15, 23, 42, 0.10);
          }

          .legalContactRow:last-child {
            border-bottom: 0;
          }

          .legalContactRow .k {
            width: 110px;
            color: #64748b;
            font-size: 13px;
          }

          .legalContactRow .v {
            flex: 1;
            color: #0f172a;
            font-size: 13.5px;
          }

          .legalNote {
            margin-top: 10px;
            color: #64748b;
            font-size: 13px;
          }

          @media (max-width: 520px) {
            .legalTitle {
              font-size: 26px;
            }

            .legalHeroInner,
            .legalCard {
              padding: 16px;
            }

            .legalContactRow {
              flex-direction: column;
              gap: 4px;
            }

            .legalContactRow .k {
              width: auto;
            }
          }
        `}</style>
      </main>

      <WebsiteFooter />
    </div>
  );
}