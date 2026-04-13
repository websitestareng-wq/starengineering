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

export default function HomePage() {
  const router = useRouter();
  useReveal();

  const heroRef = useRef<HTMLElement | null>(null);
  const [par, setPar] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = heroRef.current;
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
      ["--px" as string]: `${x * 16}px`,
      ["--py" as string]: `${y * 12}px`,
    } as React.CSSProperties;
  }, [par]);

  return (
    <div className="site">
      <WebsiteHeader />

      <main className="main">
        <section ref={heroRef} className="heroFull" style={blobStyle}>
          <div className="heroBg" aria-hidden="true">
            <div className="heroBlob b1" />
            <div className="heroBlob b2" />
            <div className="heroBlob b3" />
            <div className="heroGrid" />
          </div>

          <div className="container heroFullInner">
            <div className="heroFullGrid">
              <div className="heroLeft" data-reveal>
                <div className="heroBadge">
                  <span className="dot" />
                  Trusted Engineering Materials Supplier
                </div>

                <h1 className="heroTitle">
                  Premium <span className="gradText">Steel • Iron • Metals</span>
                  <br />
                  Supply for Industrial Projects
                </h1>

                <p className="heroLead">
                  STAR Engineering supplies engineering materials and industrial
                  products with consistent quality, reliable sourcing, and
                  professional documentation — built for contractors,
                  manufacturers, and large procurement teams.
                </p>

                <div className="heroCtas">
                  <button
                    type="button"
                    className="btn btnAnim"
                    onClick={() => router.push("/shop")}
                  >
                    Explore Products
                  </button>

                  <button
                    type="button"
                    className="btnGhost heroGhost"
                    onClick={() => router.push("/contact")}
                  >
                    Request a Quote
                  </button>
                </div>
              </div>

              <div className="heroRight" data-reveal>
                <div className="heroPanel">
                  <div className="panelHead">
                    <div className="panelTitle">What we supply</div>
                    <div className="panelSub">Industrial-grade categories</div>
                  </div>

                  <div className="pillGrid">
                    <div className="pill">I Section & C Section</div>
                    <div className="pill">L Section & T Section</div>
                    <div className="pill">M.S. / S.S. / G.I. Items</div>
                    <div className="pill">TMT / Rods / Bars</div>
                    <div className="pill">Sheets & Metal Plates</div>
                    <div className="pill">Fabrication Materials</div>
                    <div className="pill">All Construction Materials</div>
                    <div className="pill">Custom Supply (PO)</div>
                  </div>

                  <div className="panelFoot">
                    <div className="muted">Need a specific grade/spec?</div>
                    <button
                      type="button"
                      className="btnLink"
                      onClick={() => router.push("/contact")}
                    >
                      Talk to Sales →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <section className="trustStrip trustStrip--underHero" data-reveal>
              <div className="trustItem">
                <div className="trustBig">Corporate</div>
                <div className="muted">Professional dealing</div>
              </div>
              <div className="trustItem">
                <div className="trustBig">Procurement</div>
                <div className="muted">Purchase orders & billing</div>
              </div>
              <div className="trustItem">
                <div className="trustBig">Quality</div>
                <div className="muted">Consistent supply chain</div>
              </div>
              <div className="trustItem">
                <div className="trustBig">Support</div>
                <div className="muted">Clear communication</div>
              </div>
            </section>
          </div>
        </section>

        <div className="container">
          <section className="section">
            <div className="sectionHead" data-reveal>
              <h2 className="h2">Industries We Serve</h2>
              <p className="sub">
                We support businesses that require timely, dependable materials
                for critical timelines.
              </p>
            </div>

            <div className="tiles">
              {[
                {
                  t: "Infrastructure & Construction",
                  s: "Structural steel and project materials",
                },
                {
                  t: "Manufacturing & Fabrication",
                  s: "MS/SS metals, pipes, and consumables",
                },
                {
                  t: "Mechanical & Maintenance",
                  s: "Replacement parts and fast supply",
                },
                {
                  t: "Industrial Procurement",
                  s: "PO based supply with documentation",
                },
                {
                  t: "Warehousing & Logistics",
                  s: "Bulk packaging, dispatch coordination",
                },
                {
                  t: "Contractors & Vendors",
                  s: "Regular supply, repeat orders",
                },
              ].map((x, i) => (
                <div className="tile" data-reveal key={i}>
                  <div className="tileTitle">{x.t}</div>
                  <div className="tileSub">{x.s}</div>
                  <div className="tileLine" />
                </div>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="sectionHead" data-reveal>
              <h2 className="h2">Simple, Reliable Supply Process</h2>
              <p className="sub">
                Designed for corporate purchasing — quick quotes, clear specs,
                smooth delivery.
              </p>
            </div>

            <div className="steps">
              {[
                {
                  n: "01",
                  t: "Share requirement",
                  s: "Material type, size, grade, quantity, delivery location.",
                },
                {
                  n: "02",
                  t: "Quotation & confirmation",
                  s: "Competitive rates, availability timeline, and terms.",
                },
                {
                  n: "03",
                  t: "Packaging & dispatch",
                  s: "Proper handling with invoice / GST / challan.",
                },
                {
                  n: "04",
                  t: "Support & repeat supply",
                  s: "Ongoing material support for project timelines.",
                },
              ].map((x, i) => (
                <div className="step" data-reveal key={i}>
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
                Ready to source materials for your next project?
              </h2>
              <p className="ctaSub">
                Tell us your requirement and we’ll respond with a quote and
                availability.
              </p>
            </div>

            <div className="ctaRight">
              <button
                type="button"
                className="btn btnAnim"
                onClick={() => router.push("/contact")}
              >
                Get Quote
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