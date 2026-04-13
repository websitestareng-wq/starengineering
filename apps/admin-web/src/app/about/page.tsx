"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import WebsiteHeader from "@/components/website/WebsiteHeader";
import WebsiteFooter from "@/components/website/WebsiteFooter";

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function AboutPage() {
  const router = useRouter();
  useReveal();

  const aboutRef = useRef<HTMLElement | null>(null);
  const [par, setPar] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = aboutRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / r.width;
      const dy = (e.clientY - cy) / r.height;
      setPar({ x: dx, y: dy });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const blobStyle = useMemo(() => {
    const x = Math.max(-1, Math.min(1, par.x));
    const y = Math.max(-1, Math.min(1, par.y));

    return {
      ["--px" as string]: `${x * 14}px`,
      ["--py" as string]: `${y * 10}px`,
    } as React.CSSProperties;
  }, [par]);

  return (
    <div className="site">
      <WebsiteHeader />

      <main className="main">
        <section
          ref={aboutRef}
          className="aboutBand aboutBand--blueprint"
          style={blobStyle}
        >
          <div className="aboutBandBg" aria-hidden="true">
            <div className="abBlob a1" />
            <div className="abBlob a2" />
            <div className="abBlob a3" />
            <div className="abGrid" />
          </div>

          <div className="container aboutBandInner">
            <div className="aboutHeroBlock" data-reveal>
              <div className="heroBadge">
                <span className="dot" />
                Corporate • Industrial • Procurement Ready
              </div>

              <h1 className="aboutH1">
                About <span className="gradText">STAR ENGINEERING</span>
              </h1>

              <p className="aboutLead">
                STAR Engineering is a trusted supplier of steel, iron, metals
                and engineering materials — built to support infrastructure,
                manufacturing, fabrication, and corporate procurement teams with
                reliable supply and professional documentation.
              </p>

              <div className="aboutHeroActions">
                <button
                  type="button"
                  className="btn btnAnim"
                  onClick={() => router.push("/contact")}
                >
                  Request a Quote
                </button>

                <button
                  type="button"
                  className="btnGhost btnGhost--cta"
                  onClick={() => router.push("/shop")}
                >
                  View Product Listing
                </button>
              </div>
            </div>

            <div className="aboutStats" data-reveal>
              <div className="statBox">
                <div className="statK">Industrial Supply</div>
                <div className="statS">Steel • Iron • Metals</div>
              </div>
              <div className="statBox">
                <div className="statK">Bulk Orders</div>
                <div className="statS">PO / Tender friendly</div>
              </div>
              <div className="statBox">
                <div className="statK">Documentation</div>
                <div className="statS">Invoice • GST • Challan</div>
              </div>
              <div className="statBox">
                <div className="statK">Support</div>
                <div className="statS">Clear communication</div>
              </div>
            </div>
          </div>
        </section>

        <div className="container">
          <section className="aboutSection" data-reveal>
            <div className="sectionHead">
              <h2 className="h2">Company Overview</h2>
              <p className="sub">
                We operate as a dependable sourcing and supply partner for
                engineering materials — focused on quality consistency, supply
                reliability, and transparent dealing.
              </p>
            </div>

            <div className="aboutTwoCol">
              <div className="aboutCardX">
                <h3 className="aboutH3">What we do</h3>
                <p className="aboutP">
                  We supply structural steel sections, MS/SS/GI materials, rods
                  & bars, plates & sheets, fabrication essentials, fasteners and
                  industrial consumables. Our process is designed for corporate
                  purchasing — quick quotes, clear specifications, and
                  professional records.
                </p>
                <p className="aboutP">
                  Whether you need regular supply for daily operations or bulk
                  material for project timelines, we support procurement with
                  clarity and speed.
                </p>
              </div>

              <div className="aboutCardX">
                <h3 className="aboutH3">Our history (how we work)</h3>

                <div className="timeline">
                  <div className="tlItem">
                    <div className="tlDot" />
                    <div>
                      <div className="tlTitle">Foundation</div>
                      <div className="tlSub">
                        Established in 2013. Started with a focus on quality
                        supply and long-term relationships.
                      </div>
                    </div>
                  </div>

                  <div className="tlItem">
                    <div className="tlDot" />
                    <div>
                      <div className="tlTitle">Expansion</div>
                      <div className="tlSub">
                        Extended categories to support fabrication,
                        construction, and procurement needs.
                      </div>
                    </div>
                  </div>

                  <div className="tlItem">
                    <div className="tlDot" />
                    <div>
                      <div className="tlTitle">Corporate-ready operations</div>
                      <div className="tlSub">
                        PO-based supply, documentation workflow and dispatch
                        coordination.
                      </div>
                    </div>
                  </div>

                  <div className="tlItem">
                    <div className="tlDot" />
                    <div>
                      <div className="tlTitle">Today</div>
                      <div className="tlSub">
                        Reliable sourcing + professional support for industrial
                        customers.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="aboutNote">
                  <span className="pillMini">Note</span>
                  <span className="muted">
                    Exact grades/specs are confirmed as per requirement and
                    availability.
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="aboutSection" data-reveal>
            <div className="sectionHead">
              <h2 className="h2">Why organizations choose us?</h2>
              <p className="sub">
                We focus on dependable supply for industrial timelines — not
                just selling products.
              </p>
            </div>

            <div className="aboutGrid3">
              {[
                {
                  t: "Specification-first supply",
                  s: "Grades, sizes and quantities confirmed before dispatch — fewer mismatches.",
                },
                {
                  t: "Procurement-ready workflow",
                  s: "PO-based supply, billing clarity, GST invoices and challans in order.",
                },
                {
                  t: "Predictable timelines",
                  s: "Availability + dispatch timelines shared upfront with clear confirmations.",
                },
                {
                  t: "Bulk & repeat capability",
                  s: "Supports tenders, projects and monthly procurement cycles.",
                },
                {
                  t: "Transparent communication",
                  s: "Clear pricing, status updates and practical coordination — no confusion.",
                },
                {
                  t: "After-dispatch support",
                  s: "Documentation, follow-ups and repeat orders handled professionally.",
                },
              ].map((x, i) => (
                <div className="whyCard" data-reveal key={i}>
                  <div className="whyTop">
                    <span className="whyDot" aria-hidden="true" />
                    <div className="whyTitle">{x.t}</div>
                  </div>
                  <div className="whySub">{x.s}</div>
                  <div className="whyBar" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="aboutSection" data-reveal>
            <div className="sectionHead">
              <h2 className="h2">How supply works</h2>
              <p className="sub">
                Simple steps designed for corporate purchasing and project
                timelines.
              </p>
            </div>

            <div className="steps">
              {[
                {
                  n: "01",
                  t: "Requirement & specification",
                  s: "Share item list (grade/size/quantity), delivery location, and timeline. We verify feasibility.",
                },
                {
                  n: "02",
                  t: "Quotation & availability",
                  s: "We provide pricing, availability window, dispatch plan and documentation checklist (GST/Challan).",
                },
                {
                  n: "03",
                  t: "PO / confirmation",
                  s: "Procurement confirmation via PO/approval. We lock specs, packaging requirements and dispatch schedule.",
                },
                {
                  n: "04",
                  t: "Packaging, billing & dispatch",
                  s: "Material handling + invoice/GST/challan, dispatch coordination and tracking updates until delivery.",
                },
              ].map((x, i) => (
                <div className="step step--alt" data-reveal key={i}>
                  <div className="stepNo">{x.n}</div>
                  <div className="stepTitle">{x.t}</div>
                  <div className="stepSub">{x.s}</div>
                  <div className="stepGlow" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>

          <section className="ctaBand" data-reveal>
            <div className="ctaLeft">
              <h2 className="ctaTitle">
                Need materials for your next requirement?
              </h2>
              <p className="ctaSub">
                Send your specifications and we’ll respond with a quote and
                availability.
              </p>
            </div>

            <div className="ctaRight">
              <button
                type="button"
                className="btn btnAnim"
                onClick={() => router.push("/contact")}
              >
                Talk to Sales
              </button>

              <button
                type="button"
                className="btnGhost btnGhost--cta"
                onClick={() => router.push("/shop")}
              >
                Browse Listing
              </button>
            </div>
          </section>

          <div style={{ height: 18 }} />
        </div>
      </main>

      <WebsiteFooter />
    </div>
  );
}