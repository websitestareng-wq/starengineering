"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import WebsiteHeader from "@/components/website/WebsiteHeader";
import WebsiteFooter from "@/components/website/WebsiteFooter";

const CTA_TEXT = "Send Requirement →";

const MATERIALS = [
  { key: "ALL", label: "All / Not sure" },
  { key: "MS", label: "MS (Mild Steel)" },
  { key: "SS", label: "SS (Stainless Steel)" },
  { key: "GI", label: "GI (Galvanized Iron)" },
  { key: "GP", label: "GP (Pre-Galvanized)" },
  { key: "HR", label: "HR (Hot Rolled)" },
  { key: "CR", label: "CR (Cold Rolled)" },
  { key: "PPGI", label: "PPGI (Color Coated GI)" },
  { key: "PPGL", label: "PPGL (Color Coated Galvalume)" },
  { key: "GL", label: "Galvalume (Al-Zn)" },
];

const WHATSAPP_NUMBER = "917045276723";
const DEFAULT_SUBJECT = "STAR ENGINEERING – Requirement Enquiry";

function cleanPhone(v: string) {
  return String(v || "")
    .replace(/[^\d+]/g, "")
    .replace(/^00/, "+")
    .trim();
}

function isValidEmail(v: string) {
  const s = String(v || "").trim();
  if (!s) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function buildEmailBody(payload: {
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  material: string;
  details: string;
  subject: string;
  preferred: string;
}) {
  const materialLabel =
    MATERIALS.find((m) => m.key === payload.material)?.label || payload.material;

  return [
    `STAR ENGINEERING – New Requirement Enquiry`,
    ``,
    `Name: ${payload.name}`,
    `Company: ${payload.company || "-"}`,
    `Phone: ${payload.phone}`,
    `Email: ${payload.email || "-"}`,
    `City / Location: ${payload.city}`,
    `Material Type: ${materialLabel}`,
    `Preferred Contact: ${payload.preferred}`,
    `Subject: ${payload.subject || DEFAULT_SUBJECT}`,
    ``,
    `Requirement Details:`,
    `${payload.details}`,
    ``,
    `Kindly share availability, specifications, delivery feasibility, and your best quotation.`,
  ].join("\n");
}
function buildWhatsAppMessage(payload: {
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  material: string;
  details: string;
  subject: string;
  preferred: string;
}) {
  const materialLabel =
    MATERIALS.find((m) => m.key === payload.material)?.label || payload.material;

  return [
    `*STAR ENGINEERING – New Requirement Enquiry*`,
    ``,
    `*Name:* ${payload.name}`,
    `*Company:* ${payload.company || "-"}`,
    `*Phone:* ${payload.phone}`,
    `*Email:* ${payload.email || "-"}`,
    `*City / Location:* ${payload.city}`,
    `*Material Type:* ${materialLabel}`,
    `*Preferred Contact:* ${payload.preferred}`,
    `*Subject:* ${payload.subject || DEFAULT_SUBJECT}`,
    ``,
    `*Requirement Details:*`,
    `${payload.details}`,
    ``,
    `Kindly share availability, specifications, delivery feasibility, and your best quotation.`,
  ].join("\n");
}

export default function ContactPage() {
  const searchParams = useSearchParams();
  const preSubject = searchParams.get("subject") || "";

const [draftReady, setDraftReady] = useState(false);
const [loading, setLoading] = useState(false);
const [err, setErr] = useState("");

  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    city: "",
    material: "ALL",
    details: "",
    subject: preSubject || DEFAULT_SUBJECT,
    preferred: "Call",
  });

  const canSend = useMemo(() => {
    const nameOk = String(form.name).trim().length >= 2;
    const phoneOk = cleanPhone(form.phone).replace(/\D/g, "").length >= 10;
    const cityOk = String(form.city).trim().length >= 2;
    const detailsOk = String(form.details).trim().length >= 10;
    const emailOk = isValidEmail(form.email);
    return nameOk && phoneOk && cityOk && detailsOk && emailOk;
  }, [form]);

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

 async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setErr("");

  if (!canSend) {
    setErr("Please fill required fields properly (Name, Phone, City, Details).");
    return;
  }

  setLoading(true);

  try {
    setDraftReady(true);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    setErr(message);
  } finally {
    setLoading(false);
  }
}
const draftPayload = {
  name: form.name.trim(),
  company: form.company.trim(),
  phone: String(form.phone || "").replace(/\D/g, ""),
  email: form.email.trim(),
  city: form.city.trim(),
  material: form.material,
  details: form.details.trim(),
  subject: (form.subject || DEFAULT_SUBJECT).trim(),
  preferred: form.preferred,
};
const whatsappPreviewLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  buildWhatsAppMessage(draftPayload),
)}`;

const emailDraftLink = `mailto:corporate@stareng.co.in?subject=${encodeURIComponent(
  draftPayload.subject || DEFAULT_SUBJECT,
)}&body=${encodeURIComponent(buildEmailBody(draftPayload))}`;

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
    <div className="contactHero">
            <div className="heroBadge" style={{ marginBottom: 10 }}>
              <span className="dot" />
              Sales Enquiry / Requirement
            </div>

            <h1 className="contactTitle">
              Let’s discuss your <span className="gradText">requirement</span>
            </h1>

            <p className="sub">
              Submit your details and requirement. We will respond with
              availability & specifications.
              <b> After submission, please call Sales for faster processing.</b>
            </p>
          </div>

          {draftReady ? (
            <div className="contactThanks contactCard">
  <div className="successWrap">
    <div className="successIcon">
      <div className="successPulse" />
      <div className="successRing" />
      <div className="successCheck">✓</div>
    </div>

    <div className="successText">
      <div className="successTitle">Your message draft is ready</div>
      <div className="successSub">
        Choose the method to send message. You can open an
        <b> email draft</b> or continue with <b>WhatsApp draft</b>.
      </div>
    </div>
  </div>

  <div className="thanksActions">
    <a
      className="btn"
      href={emailDraftLink}
    >
      Open Email Draft →
    </a>

    <a
      className="btnGhost contactGhostBtn"
      href={whatsappPreviewLink}
      target="_blank"
      rel="noreferrer"
    >
      Open WhatsApp Draft →
    </a>

    <button
      type="button"
      className="btnGhost contactGhostBtn"
      onClick={() => setDraftReady(false)}
    >
      Edit Details →
    </button>
  </div>
</div>
          ) : (
            <div className="contactGrid">
              <div className="contactCard contactInfo">
                <div className="h2" style={{ marginBottom: 10 }}>
                  STAR ENGINEERING
                </div>

                <div className="infoRow">
                  <div className="infoLabel">Address</div>
                  <div className="infoVal">
                    Shop No. 5, Chunawala Compound, Opp. BEST Depot / Kanakia
                    Zillion, LBS Marg, Kurla (W), Mumbai - 400070, Maharashtra.
                  </div>
                </div>

                <div className="infoRow">
                  <div className="infoLabel">Phone</div>
                  <div className="infoVal">
                    <a className="link" href="tel:+917045276723">
                      +91-7045276723
                    </a>
                  </div>
                </div>

                <div className="infoRow">
                  <div className="infoLabel">Email</div>
                  <div className="infoVal">
                    <a className="link" href="mailto:corporate@stareng.co.in">
                      corporate@stareng.co.in
                    </a>
                  </div>
                </div>

                <div className="infoRow">
                  <div className="infoLabel">Working Hours</div>
                  <div className="infoVal">8:30 am to 7:30 pm</div>
                </div>

                <div className="infoActions">
                  <a className="btn" href="tel:+917045276723">
                    Call Sales →
                  </a>

                  <a
                    className="btnGhost contactGhostBtn"
                    href="https://maps.app.goo.gl/LnhcYdKkpSciJ1wf6"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Maps →
                  </a>

                  <a
                    className="btnGhost contactGhostBtn"
                    href={`https://wa.me/${WHATSAPP_NUMBER}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp →
                  </a>
                </div>

                <div className="mapWrap">
                  <iframe
                    title="STAR Engineering Map"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3078.4641880413465!2d72.87410010968183!3d19.074709051940676!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c9006064e9b5%3A0x18fa5097ab4a837e!2sStar%20Engineering!5e1!3m2!1sen!2sin!4v1772242311463!5m2!1sen!2sin"
                    loading="lazy"
                    style={{
                      border: 0,
                      width: "100%",
                      height: 260,
                      borderRadius: 18,
                    }}
                    allowFullScreen
                  />
                </div>
              </div>

            <div className="contactCard contactFormCard">
                <div className="h2" style={{ marginBottom: 6 }}>
                  Send Requirement
                </div>

                <div className="sub" style={{ marginBottom: 14 }}>
                  Fill details and we’ll get back. For urgent support, call Sales.
                </div>

                {err ? <div className="contactErr">{err}</div> : null}

                <form onSubmit={onSubmit} className="contactForm">
                  <div className="row2">
                    <div>
                      <div className="label">Full Name *</div>
                      <input
                        className="input"
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <div className="label">Company</div>
                      <input
                        className="input"
                        value={form.company}
                        onChange={(e) => setField("company", e.target.value)}
                        placeholder="Company name (optional)"
                      />
                    </div>
                  </div>

                  <div className="row2">
                    <div>
                      <div className="label">Phone *</div>
                      <input
                        className="input"
                        value={form.phone}
                        onChange={(e) => setField("phone", e.target.value)}
                        placeholder="+91 9XXXXXXXXX"
                      />
                    </div>

                    <div>
                      <div className="label">Email</div>
                      <input
                        className="input"
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                        placeholder="you@company.com (optional)"
                      />
                    </div>
                  </div>

                  <div className="row2">
                    <div>
                      <div className="label">City / Location *</div>
                      <input
                        className="input"
                        value={form.city}
                        onChange={(e) => setField("city", e.target.value)}
                        placeholder="Mumbai / Navi Mumbai / Thane..."
                      />
                    </div>

                    <div>
                      <div className="label">Material Type</div>
                      <select
                        className="input"
                        value={form.material}
                        onChange={(e) => setField("material", e.target.value)}
                      >
                        {MATERIALS.map((m) => (
                          <option key={m.key} value={m.key}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row2">
                    <div>
                      <div className="label">Preferred Contact</div>
                      <select
                        className="input"
                        value={form.preferred}
                        onChange={(e) => setField("preferred", e.target.value)}
                      >
                        <option value="Call">Call</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Email">Email</option>
                      </select>
                    </div>

                    <div>
                      <div className="label">Subject</div>
                      <input
                        className="input"
                        value={form.subject}
                        onChange={(e) => setField("subject", e.target.value)}
                        placeholder={DEFAULT_SUBJECT}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="label">Requirement Details *</div>
                    <textarea
                      className="input contactTextarea"
                      rows={5}
                      value={form.details}
                      onChange={(e) => setField("details", e.target.value)}
                      placeholder="Example: ISMC 200, 12m length, qty 2 ton, delivery Kurla..."
                    />
                    <div className="hint">
                      Tip: Mention size, thickness/grade, length, qty, delivery
                      location.
                    </div>
                  </div>

                  <div className="formActions">
                    <button
                      className="btn btnAnim"
                      disabled={loading}
                      type="submit"
                    >
                      {loading ? "Sending..." : CTA_TEXT}
                    </button>

                    <button
                      type="button"
                      className="btnGhost contactGhostBtn"
                      onClick={() =>
                        window.open(
                          `https://wa.me/${WHATSAPP_NUMBER}`,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                    >
                      WhatsApp Now →
                    </button>

                    <a
                      className="btnGhost contactGhostBtn"
                      href="tel:+917045276723"
                    >
                      Call Sales →
                    </a>
                  </div>

                  {!canSend ? (
                    <div className="hint" style={{ marginTop: 10 }}>
                      Required: Name, Phone, City, Details (min 10 chars). Email optional.
                    </div>
                  ) : null}
                </form>
              </div>
            </div>
          )}
        </div>
            </section>
      </main>

      <WebsiteFooter />
    </div>

  );
}