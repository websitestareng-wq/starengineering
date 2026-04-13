"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import WebsiteHeader from "@/components/website/WebsiteHeader";
import WebsiteFooter from "@/components/website/WebsiteFooter";

function useReveal(deps: React.DependencyList = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!els.length) return;

    const targets = els.filter((el) => !el.classList.contains("is-in"));

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

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, deps);
}

const CTA_TEXT = "Send Requirement →";

const MATERIALS = [
  { key: "MS", label: "MS (Mild Steel)" },
  { key: "SS", label: "SS (Stainless Steel)" },
  { key: "GI", label: "GI (Galvanized Iron)" },
  { key: "GP", label: "GP (Galvanized / Pre-galvanized)" },
  { key: "HR", label: "HR (Hot Rolled)" },
  { key: "CR", label: "CR (Cold Rolled)" },
  { key: "PPGI", label: "PPGI (Color Coated GI)" },
  { key: "PPGL", label: "PPGL (Color Coated Galvalume)" },
  { key: "GL", label: "Galvalume (Al-Zn)" },
];

const CATALOG = [
  {
    id: "i-beam",
    title: "I BEAM (ISMB / I SECTION)",
    img: "/products/i-beam.jpg",
    materials: ["MS"],
    use: "Structural frames, sheds, mezzanine floors, heavy supports.",
    sizes: [
      "Common depths: 100, 125, 150, 175, 200, 250, 300, 350, 400, 450, 500, 600 mm (typical ISMB range).",
      "Flange width/thickness & web thickness vary by section as per standard tables.",
    ],
    lengths: ["Standard length: 12 m (common)", "Cut length: as per requirement"],
    note: "Share required depth + application. We’ll confirm availability/spec.",
    tags: ["ISMB", "IS 808"],
  },
  {
    id: "l-angle",
    title: "L ANGLE (ISA EQUAL / UNEQUAL)",
    img: "/products/l-angle.jpg",
    materials: ["MS", "SS", "GI"],
    use: "Fabrication, bracing, frames, racks, gates, trusses.",
    sizes: [
      "Equal angles: 20×20 to 200×200 mm; thickness 3 to 25 mm (size-based).",
      "Unequal angles: 25×20 to 200×150 mm; thickness 3 to 20+ mm.",
    ],
    lengths: ["Standard length: 6 m / 12 m (common)", "Cut length: as per requirement"],
    note: "Tell us: equal/unequal + size (A×B) + thickness + length + material.",
    tags: ["ISA"],
  },
  {
    id: "c-channel",
    title: "C CHANNEL (ISMC / CHANNEL SECTION)",
    img: "/products/c-channel.jpg",
    materials: ["MS", "GI"],
    use: "Supports, frames, purlins, industrial structures, platforms.",
    sizes: [
      "Typical ISMC sizes: 75×40, 100×50, 125×65, 150×75, 175×75, 200×75, 250×82, 300×90, 400×100 (mm).",
      "Thickness varies by section as per ISMC tables.",
    ],
    lengths: ["Standard length: 6 m / 12 m (common)", "Cut length: as per requirement"],
    note: "Share (Depth×Flange) + thickness preference for fastest confirmation.",
    tags: ["ISMC", "IS 808"],
  },
  {
    id: "t-angle",
    title: "T ANGLE / T SECTION (TEE)",
    img: "/products/t-section.jpg",
    materials: ["MS", "SS"],
    use: "Bracing, supports, frames, industrial reinforcement.",
    sizes: [
      "T sections available in multiple widths/heights with varying thickness.",
      "Selection depends on load and fabrication requirement.",
    ],
    lengths: ["Standard length: 6 m / 12 m (common)", "Cut length: as per requirement"],
    note: "Send required W×H×t (or drawing/spec). We’ll confirm matching section.",
    tags: ["TEE"],
  },
  {
    id: "pipes",
    title: "PIPES (ROUND / SQUARE / RECTANGULAR)",
    img: "/products/pipes.jpg",
    materials: ["MS", "GI", "SS", "GP"],
    use: "Fabrication, plumbing, frames, rails, structures.",
    sizes: [
      "Round pipes: NB commonly 15, 20, 25, 32, 40, 50, 65, 80, 100, 150+.",
      "Thickness: light/medium/heavy or schedule as required.",
      "Square/Rectangular: multiple sizes (e.g., 20×20, 25×25, 40×40, 50×25, 75×50 etc.) with thickness options.",
    ],
    lengths: ["Standard length: 6 m / 12 m (common)", "Cut length: as per requirement"],
    note: "Tell us: shape + size + thickness/schedule + material + quantity.",
    tags: ["ERW", "GI", "Seamless"],
  },
  {
    id: "profile-sheet",
    title: "PROFILE SHEET (ROOFING / CLADDING)",
    img: "/products/profile-sheet.jpg",
    materials: ["GI", "PPGI", "PPGL", "GL"],
    use: "Industrial roofing, sheds, wall cladding.",
    sizes: [
      "Thickness commonly: 0.30 to 0.60 mm (product-based).",
      "Lengths: 8ft / 10ft / 12ft / 14ft / 16ft (custom possible).",
      "Cover width depends on profile (effective ~1000 mm typical).",
    ],
    lengths: ["Cut-to-length available"],
    note: "Share thickness + profile + color (if coated) + required length.",
    tags: ["PPGI", "PPGL", "GI"],
  },
  {
    id: "ac-sheets",
    title: "AC SHEETS (ASBESTOS CEMENT SHEETS)",
    img: "/products/ac-sheets.jpg",
    materials: ["CEMENT"],
    use: "Roofing applications where permitted/used.",
    sizes: ["Different corrugation profiles & thickness depending on brand/spec."],
    lengths: ["Common lengths: 6ft / 8ft / 10ft / 12ft (availability-based)"],
    note: "Send required length + qty + delivery location for confirmation.",
    tags: ["Roofing"],
  },
  {
    id: "sq-bars",
    title: "SQ BARS (SQUARE BARS)",
    img: "/products/square-bars.jpg",
    materials: ["MS", "SS"],
    use: "Machining, fabrication, industrial components.",
    sizes: ["Typical sizes: 6×6 to 50×50 mm (and above) as per requirement."],
    lengths: ["Standard length: 6 m (common)", "Cut length: as per requirement"],
    note: "Share size + grade (MS/SS) + length for quick confirmation.",
    tags: ["Square Bar"],
  },
  {
    id: "tmt-bars",
    title: "TMT BARS",
    img: "/products/tmt.jpg",
    materials: ["TMT"],
    use: "Construction reinforcement for columns, beams, slabs.",
    sizes: ["Diameters: 6, 8, 10, 12, 16, 20, 25, 32 mm (and more)."],
    lengths: ["Standard length: 12 m (common)"],
    note: "Send diameter + grade (Fe500/Fe500D etc.) + qty for availability.",
    tags: ["Rebar"],
  },
  {
    id: "plates",
    title: "PLATES (MS / SS / GI PLATES)",
    img: "/products/plates.jpg",
    materials: ["MS", "SS", "GI", "HR", "Chequered"],
    use: "Base plates, fabrication, industrial structures.",
    sizes: [
      "Thickness: 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32 mm (and above).",
      "Common plate sizes may include 1250×2500 mm, 1500×6000 mm (availability-based).",
    ],
    lengths: ["Full plates/sheets or cut-to-size"],
    note: "Send thickness + size (L×W) + grade for confirmation.",
    tags: ["Plates"],
  },
  {
    id: "rods",
    title: "RODS / ROUND BARS",
    img: "/products/rods.jpg",
    materials: ["MS", "SS"],
    use: "Machining, shafts, fabrication.",
    sizes: ["Diameters: multiple options (6 mm to 100+ mm based on requirement)."],
    lengths: ["Standard length: 6 m (common)", "Cut length: as per requirement"],
    note: "Send diameter + grade + usage for correct recommendation.",
    tags: ["Round Bar"],
  },
  {
    id: "flats",
    title: "FLATS (FLAT BARS / PATTI)",
    img: "/products/flats.jpg",
    materials: ["MS", "SS", "GI"],
    use: "Fabrication, clamps, frames, base supports.",
    sizes: ["Widths: 12 to 150+ mm | Thickness: 3 to 20+ mm (requirement-based)."],
    lengths: ["Standard length: 6 m (common)", "Cut length: as per requirement"],
    note: "Send width × thickness × length + material.",
    tags: ["Flat Bar"],
  },
];

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="chip">{children}</span>;
}

export default function ShopPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mat, setMat] = useState("ALL");

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();

    return CATALOG.filter((it) => {
      const matchQ =
        !query ||
        it.title.toLowerCase().includes(query) ||
        it.use.toLowerCase().includes(query) ||
        (it.tags || []).join(" ").toLowerCase().includes(query);

      const matchMat = mat === "ALL" || (it.materials || []).includes(mat);
      return matchQ && matchMat;
    });
  }, [q, mat]);

  useReveal([mat, q, items.length]);

  const onCta = (itemTitle: string) => {
    router.push(`/contact?subject=${encodeURIComponent(`Requirement: ${itemTitle}`)}`);
  };

  return (
    <div className="site">
      <WebsiteHeader />

      <main className="main">
        <section className="aboutBand aboutBand--blueprint">
          <div className="aboutBandBg" aria-hidden="true">
            <div className="abBlob a1" />
            <div className="abBlob a2" />
            <div className="abBlob a3" />
            <div className="abGrid" />
          </div>

          <div className="container aboutBandInner">
            <div className="shopTop" data-reveal>
              <div>
                <div className="heroBadge" style={{ marginBottom: 10 }}>
                  <span className="dot" />
                  Corporate Material Catalog
                </div>

                <h1 className="aboutH1" style={{ marginBottom: 10 }}>
                  Materials We Supply:{" "}
                  <span className="gradText">Steel • Iron • Industrial</span>
                </h1>

                <p className="sub">
                  No online ordering, no public rates. Share your requirement and
                  we’ll respond with availability and specifications.
                </p>
              </div>

              <div className="shopFilters" data-reveal>
                <input
                  className="shopSearch"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search (e.g., ISMC, angle, pipes, sheets...)"
                />

                <select
                  className="shopSelect"
                  value={mat}
                  onChange={(e) => setMat(e.target.value)}
                >
                  <option value="ALL">All Materials</option>
                  {MATERIALS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btnGhost shopContactBtn"
                  onClick={() => router.push("/contact")}
                >
                  Contact Sales →
                </button>
              </div>
            </div>

            <div className="shopGrid">
              {items.map((it) => (
                <article className="shopCard" key={it.id} data-reveal>
                  <div className="shopImgWrap">
                    <img
                      src={it.img}
                      alt={it.title}
                      className="shopImg"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "/products/placeholder.jpg";
                      }}
                    />
                  </div>

                  <div className="shopBody">
                    <h3 className="shopTitle">{it.title}</h3>

                    <div className="shopChips">
                      {(it.materials || []).map((m) => (
                        <Chip key={m}>{m}</Chip>
                      ))}
                    </div>

                    <div className="shopSection">
                      <div className="shopLabel">Typical use</div>
                      <div className="shopText">{it.use}</div>
                    </div>

                    <div className="shopSection">
                      <div className="shopLabel">Common dimensions</div>
                      <ul className="shopList">
                        {it.sizes.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="shopSection">
                      <div className="shopLabel">Lengths / supply</div>
                      <ul className="shopList">
                        {it.lengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="shopNote">{it.note}</div>

                    <div className="shopActions">
                      <button
                        type="button"
                        className="btn btnAnim"
                        onClick={() => onCta(it.title)}
                      >
                        {CTA_TEXT}
                      </button>

                      <button
                        type="button"
                        className="btnGhost"
                        onClick={() => router.push("/contact")}
                      >
                        Request a Call →
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div style={{ height: 18 }} />
          </div>
        </section>
      </main>

      <WebsiteFooter />

      <style jsx>{`
        .shopTop {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .shopFilters {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
        }

        .shopSearch {
          height: 44px;
          min-width: 320px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: rgba(255, 255, 255, 0.85);
          outline: none;
          font-family: Arial, Helvetica, sans-serif;
        }

        .shopSearch:focus {
          border-color: rgba(124, 58, 237, 0.35);
          box-shadow: 0 12px 30px rgba(124, 58, 237, 0.1);
        }

        .shopSelect {
          height: 44px;
          padding: 0 12px;
          border-radius: 14px;
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: rgba(255, 255, 255, 0.85);
          outline: none;
        }

        .shopContactBtn {
          height: 44px;
          border-radius: 14px;
          padding: 0 14px;
          background: rgb(255, 255, 255);
        }

        .shopGrid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .shopCard {
          border-radius: 22px;
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 10px 30px rgba(2, 6, 23, 0.06);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .shopImgWrap {
          height: 180px;
          background: linear-gradient(
            135deg,
            rgba(255, 45, 85, 0.08),
            rgba(124, 58, 237, 0.08),
            rgba(37, 99, 235, 0.08)
          );
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }

        .shopImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform: scale(1.02);
        }

        .shopBody {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .shopTitle {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }

        .shopChips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .chip {
          display: inline-flex;
          align-items: center;
          height: 26px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid rgba(15, 23, 42, 0.1);
          background: rgba(255, 255, 255, 0.85);
          color: #0f172a;
        }

        .shopSection {
          display: grid;
          gap: 4px;
        }

        .shopLabel {
          font-size: 12px;
          color: #64748b;
          font-weight: 700;
        }

        .shopText {
          color: #334155;
          line-height: 1.6;
          font-size: 13px;
        }

        .shopList {
          margin: 0;
          padding-left: 16px;
          color: #334155;
          line-height: 1.7;
          font-size: 13px;
        }

        .shopNote {
          margin-top: 2px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(248, 250, 252, 0.85);
          border-radius: 14px;
          padding: 10px 12px;
          color: #475569;
          line-height: 1.6;
          font-size: 12.5px;
        }

        .shopActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 6px;
        }

        .shopActions .btnGhost {
          height: 44px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: rgba(255, 255, 255, 0.88);
          font-weight: 700;
          font-family: Arial, Helvetica, sans-serif;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          transition:
            transform 0.12s ease,
            box-shadow 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease;
        }

        .shopActions .btnGhost:hover {
          border-color: rgba(124, 58, 237, 0.25);
          box-shadow: 0 10px 24px rgba(124, 58, 237, 0.12);
          transform: translateY(-1px);
        }

        .shopActions .btnGhost:active {
          transform: translateY(0px) scale(0.99);
        }

        @media (max-width: 980px) {
          .shopGrid {
            grid-template-columns: 1fr;
          }

          .shopSearch {
            min-width: 240px;
            width: 100%;
          }

          .shopFilters {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}