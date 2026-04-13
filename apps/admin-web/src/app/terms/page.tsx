"use client";

import WebsiteHeader from "@/components/website/WebsiteHeader";
import WebsiteFooter from "@/components/website/WebsiteFooter";

export default function TermsAndConditionsPage() {
  const lastUpdated = "February 27, 2026";

  return (
    <div className="site">
      <WebsiteHeader />

      <main className="main">
        <div className="legalPage">
          <div className="legalHero">
            <div className="legalHeroInner">
              <div className="legalBadge">Legal</div>
              <h1 className="legalTitle gradText">Terms &amp; Conditions</h1>
              <p className="legalSub">
                These Terms &amp; Conditions (“Terms”) govern the access, use,
                purchase, and business engagement with STAR ENGINEERING.
              </p>
              <div className="legalMeta">Last Updated: {lastUpdated}</div>
            </div>
          </div>

          <div className="legalWrap">
            <div className="legalCard">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing this website, using any portal operated by STAR
                ENGINEERING, requesting quotations, placing purchase orders, or
                entering into any commercial transaction with STAR ENGINEERING,
                you agree to be legally bound by these Terms &amp; Conditions.
              </p>
              <p>
                If you do not agree to these Terms, you must refrain from using
                our website and services.
              </p>

              <h2>2. Company Information</h2>
              <p>
                STAR ENGINEERING is engaged in manufacturing, fabrication,
                supply, trading, and engineering-related services. All business
                transactions, documentation, quotations, invoices, dispatches,
                and communications issued by STAR ENGINEERING are subject to
                these Terms.
              </p>

              <h2>3. Quotations &amp; Validity</h2>
              <ul>
                <li>All quotations are valid for the period stated in the quotation document.</li>
                <li>If no validity period is mentioned, the quotation shall be valid for 15 days.</li>
                <li>Prices may change due to raw material fluctuations, tax changes, or supply chain conditions.</li>
                <li>Quotations do not constitute a binding contract until accepted in writing by STAR ENGINEERING.</li>
              </ul>

              <h2>4. Orders &amp; Confirmation</h2>
              <ul>
                <li>Orders must be placed in writing via email or authorized purchase order.</li>
                <li>Order confirmation is subject to acceptance by STAR ENGINEERING.</li>
                <li>STAR ENGINEERING reserves the right to reject or cancel orders without liability.</li>
                <li>Custom or made-to-order products cannot be cancelled once production begins.</li>
              </ul>

              <h2>5. Pricing &amp; Taxes</h2>
              <p>
                All prices are exclusive of applicable taxes unless explicitly
                stated. GST and other statutory levies shall be charged as per
                prevailing laws.
              </p>

              <h2>6. Payment Terms</h2>
              <p><b>Current Payment Methods:</b></p>
              <ul>
                <li>Bank Transfer (NEFT / RTGS / IMPS)</li>
                <li>UPI</li>
                <li>Cheque</li>
                <li>Cash (subject to legal limits)</li>
              </ul>
              <p>
                Payments must be made as per invoice terms. Late payments may
                result in delayed dispatch or interest charges.
              </p>
              <p>
                STAR ENGINEERING may, in the future, enable online payment
                gateways. If activated, such payments will be governed by the
                respective gateway&apos;s terms and conditions.
              </p>

              <h2>7. Delivery &amp; Risk Transfer</h2>
              <ul>
                <li>Delivery timelines are estimates unless confirmed in writing.</li>
                <li>Risk transfers to the buyer upon dispatch from our premises.</li>
                <li>STAR ENGINEERING is not responsible for transport delays beyond its control.</li>
              </ul>

              <h2>8. Inspection &amp; Acceptance</h2>
              <p>
                Customers must inspect goods upon delivery. Any claim regarding
                shortages, damage, or defects must be notified within 48 hours
                of receipt.
              </p>

              <h2>9. Returns &amp; Refund Policy</h2>
              <p>
                Returns are accepted only with prior written approval from STAR
                ENGINEERING. Customized or fabricated items are generally
                non-returnable.
              </p>
              <p>
                Approved refunds shall be processed after inspection and internal
                review.
              </p>

              <h2>10. Warranty Disclaimer</h2>
              <p>
                Unless explicitly stated in writing, products are supplied on an
                “as-is” basis. STAR ENGINEERING disclaims all implied
                warranties, including merchantability and fitness for a
                particular purpose.
              </p>

              <h2>11. Limitation of Liability</h2>
              <p>
                STAR ENGINEERING shall not be liable for indirect, incidental,
                punitive, or consequential damages including loss of profits,
                downtime, or business interruption.
              </p>
              <p>
                Total liability shall not exceed the invoice value of the
                specific transaction giving rise to the claim.
              </p>

              <h2>12. Intellectual Property</h2>
              <p>
                All logos, documents, designs, technical drawings, product
                images, and materials displayed on this website are the
                exclusive property of STAR ENGINEERING and may not be reproduced
                without written consent.
              </p>

              <h2>13. Confidentiality</h2>
              <p>
                Any proprietary drawings, quotations, pricing structures, or
                technical data shared by STAR ENGINEERING shall be treated as
                confidential.
              </p>

              <h2>14. Force Majeure</h2>
              <p>
                STAR ENGINEERING shall not be liable for delays or failure
                caused by events beyond reasonable control including natural
                disasters, strikes, governmental actions, transport disruptions,
                or supply chain failures.
              </p>

              <h2>15. Compliance With Laws</h2>
              <p>
                Customers are responsible for ensuring compliance with
                applicable laws, regulations, and standards relating to use of
                purchased products.
              </p>

              <h2>16. Digital Records &amp; Communication</h2>
              <p>
                Electronic communications, invoices, and confirmations sent via
                email or portal shall be deemed valid and legally binding.
              </p>

              <h2>17. Indemnification</h2>
              <p>
                The customer agrees to indemnify and hold harmless STAR
                ENGINEERING from claims arising due to misuse, modification, or
                unauthorized application of supplied products.
              </p>

              <h2>18. Governing Law &amp; Jurisdiction</h2>
              <p>
                These Terms shall be governed by the laws of India. Any disputes
                shall be subject to the exclusive jurisdiction of courts in
                Mumbai, Maharashtra.
              </p>

              <h2>19. Arbitration</h2>
              <p>
                Any dispute arising out of or in connection with these Terms
                shall be resolved through arbitration in accordance with the
                Arbitration and Conciliation Act, 1996. The seat of arbitration
                shall be Mumbai.
              </p>

              <h2>20. Amendments</h2>
              <p>
                STAR ENGINEERING reserves the right to amend these Terms at any
                time. Updated versions shall be posted on the website with a
                revised date.
              </p>

              <h2>21. Contact Information</h2>
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
            font-size: 32px;
            line-height: 1.15;
            letter-spacing: -0.4px;
            font-weight: 700;
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