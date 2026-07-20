import { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import "./PrivacyScreen.css";

// ── Content ───────────────────────────────────────────────────────────────
const LAST_UPDATED = "July 20, 2026";

const SECTIONS = [
  {
    id: "introduction",
    num: "01",
    title: "Introduction",
    blocks: [
      { type: "p", text: `Welcome to CNS ("we", "our", or "us"). We are committed to protecting your privacy and handling your personal information responsibly.` },
      { type: "p", text: `This Privacy Policy explains how CNS collects, uses, stores, and protects your information when you use our website, mobile application, and related services (collectively, the "Services").` },
      { type: "p", text: "By using CNS, you agree to the collection and use of your information in accordance with this Privacy Policy." },
    ],
  },
  {
    id: "information-we-collect",
    num: "02",
    title: "Information We Collect",
    blocks: [
      { type: "p", text: "Depending on how you use CNS, we may collect the following information:" },
      { type: "h3", text: "Personal Information" },
      { type: "ul", items: ["Name", "Email address", "Company name", "Driver information associated with your organisation"] },
      { type: "h3", text: "Account Information" },
      { type: "ul", items: ["Login credentials", "Account preferences", "Subscription information"] },
      { type: "h3", text: "Location Information" },
      { type: "p", text: "CNS may collect GPS or location information where required to provide navigation-related functionality within the platform." },
      { type: "h3", text: "User Content" },
      { type: "p", text: "Information you upload to CNS, including:" },
      { type: "ul", items: ["Photos", "Videos", "Navigation notes", "Delivery instructions", "Loading dock information", "Site-specific delivery information"] },
      { type: "h3", text: "Technical Information" },
      { type: "p", text: "We may automatically collect:" },
      { type: "ul", items: ["IP address", "Device information", "Browser type", "Operating system", "App usage information", "Log files"] },
    ],
  },
  {
    id: "how-we-use-information",
    num: "03",
    title: "How We Use Your Information",
    blocks: [
      { type: "p", text: "We use your information to:" },
      { type: "ul", items: [
        "Provide access to CNS",
        "Manage user accounts",
        "Process subscriptions",
        "Improve delivery location information",
        "Display navigation notes and uploaded content",
        "Improve our Services",
        "Respond to customer enquiries",
        "Detect fraud and protect the security of our platform",
        "Comply with legal obligations",
      ]},
    ],
  },
  {
    id: "payments",
    num: "04",
    title: "Payments",
    blocks: [
      { type: "p", text: "All subscription payments are securely processed by Stripe." },
      { type: "p", text: "CNS does not store or have access to your credit or debit card information." },
      { type: "p", text: `Payment information is collected and processed directly by Stripe in accordance with Stripe's Privacy Policy.` },
    ],
  },
  {
    id: "sharing-information",
    num: "05",
    title: "Sharing Your Information",
    blocks: [
      { type: "p", text: "We do not sell your personal information." },
      { type: "p", text: "We may share information with trusted third-party service providers where necessary to operate our Services, including:" },
      { type: "ul", items: ["Stripe (payment processing)", "MongoDB (cloud database hosting)"] },
      { type: "p", text: "We may also disclose information where required by law or to protect our legal rights." },
    ],
  },
  {
    id: "data-storage-security",
    num: "06",
    title: "Data Storage and Security",
    blocks: [
      { type: "p", text: "Your information is stored using secure cloud infrastructure, including MongoDB." },
      { type: "p", text: "We implement reasonable administrative, technical, and organisational measures to protect your information against unauthorised access, alteration, disclosure, or destruction." },
      { type: "p", text: "However, no method of internet transmission or electronic storage is completely secure, and we cannot guarantee absolute security." },
    ],
  },
  {
    id: "user-generated-content",
    num: "07",
    title: "User-Generated Content",
    blocks: [
      { type: "p", text: "CNS allows businesses and drivers to upload information including photos, videos, navigation notes, loading dock details, and delivery instructions." },
      { type: "p", text: "By uploading content, you confirm that:" },
      { type: "ul", items: [
        "you have the right to upload the content;",
        "the content does not infringe the rights of others;",
        "the content does not contain unlawful or malicious material.",
      ]},
      { type: "p", text: "We reserve the right to remove content that violates these requirements or our Terms of Service." },
    ],
  },
  {
    id: "data-retention",
    num: "08",
    title: "Data Retention",
    blocks: [
      { type: "p", text: "We retain your information for as long as necessary to provide our Services, comply with legal obligations, resolve disputes, and enforce our agreements." },
      { type: "p", text: "When information is no longer required, we will take reasonable steps to securely delete or de-identify it." },
    ],
  },
  {
    id: "your-rights",
    num: "09",
    title: "Your Rights",
    blocks: [
      { type: "p", text: "Subject to applicable law, you may request to:" },
      { type: "ul", items: [
        "access your personal information;",
        "correct inaccurate information;",
        "update your account information;",
        "request deletion of your personal information where legally permitted.",
      ]},
      { type: "p", text: "To make a request, please contact us using the details below." },
    ],
  },
  {
    id: "third-party-services",
    num: "10",
    title: "Third-Party Services",
    blocks: [
      { type: "p", text: "Our Services may contain links to third-party websites or services." },
      { type: "p", text: "We are not responsible for the privacy practices or content of those third-party services." },
    ],
  },
  {
    id: "childrens-privacy",
    num: "11",
    title: "Children's Privacy",
    blocks: [
      { type: "p", text: "CNS is intended for businesses and professional drivers and is not directed to individuals under the age of 18." },
      { type: "p", text: "We do not knowingly collect personal information from children." },
    ],
  },
  {
    id: "changes-to-policy",
    num: "12",
    title: "Changes to This Privacy Policy",
    blocks: [
      { type: "p", text: "We may update this Privacy Policy from time to time." },
      { type: "p", text: `Any changes will be posted on this page with an updated "Last updated" date.` },
      { type: "p", text: "Continued use of CNS after changes become effective constitutes acceptance of the updated Privacy Policy." },
    ],
  },
  {
    id: "contact-us",
    num: "13",
    title: "Contact Us",
    blocks: [
      { type: "p", text: "If you have any questions about this Privacy Policy or our privacy practices, please contact us:" },
      { type: "contact", label: "CNS", email: "support@cnsroute.com" },
    ],
  },
];

// ── Block renderer ───────────────────────────────────────────────────────
function Block({ block }) {
  if (block.type === "p") return <p className="pv-p">{block.text}</p>;

  if (block.type === "h3") return <h3 className="pv-h3">{block.text}</h3>;

  if (block.type === "ul") {
    return (
      <ul className="pv-ul">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === "contact") {
    return (
      <div className="pv-contact-card">
        {block.label && <span className="pv-contact-label">{block.label}</span>}
        <a className="pv-contact-email" href={`mailto:${block.email}`}>
          <Mail size={15} strokeWidth={2} />
          {block.email}
        </a>
      </div>
    );
  }

  return null;
}

// ── PrivacyScreen ─────────────────────────────────────────────────────────
export default function PrivacyScreen({ onBack, onTermsPress }) {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);

  const handleWaypointClick = (id) => {
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="pv-root">
      {/* ── Top nav ── */}
      <header className="pv-nav">
        <div className="pv-nav-inner">
          <button className="pv-back" onClick={onBack} aria-label="Back to home">
            <ArrowLeft size={18} strokeWidth={2.25} />
          </button>
          <div className="pv-wordmark">
            <span className="pv-wordmark-dot" aria-hidden="true" />
            CNS
          </div>
          <span className="pv-nav-label">Privacy Policy</span>
        </div>
      </header>

      {/* ── Header ── */}
      <section className="pv-hero">
        <div className="pv-hero-inner">
          <span className="pv-eyebrow">Legal</span>
          <h1 className="pv-headline">Privacy Policy</h1>
          <p className="pv-updated">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="pv-layout">
        {/* Waypoint nav — mirrors TermsScreen's route-line treatment */}
        <aside className="pv-toc" aria-label="Sections">
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  className={`pv-toc-item ${activeId === s.id ? "is-active" : ""}`}
                  onClick={() => handleWaypointClick(s.id)}
                >
                  <span className="pv-toc-dot" aria-hidden="true" />
                  <span className="pv-toc-num">{s.num}</span>
                  <span className="pv-toc-title">{s.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Article */}
        <article className="pv-article">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="pv-section">
              <h2 className="pv-section-title">
                <span className="pv-section-num">{s.num}</span>
                {s.title}
                {s.id === "user-generated-content" && onTermsPress && (
                  <button className="pv-inline-link" onClick={onTermsPress}>
                    View Terms of Service
                  </button>
                )}
              </h2>
              {s.blocks.map((b, i) => (
                <Block key={i} block={b} />
              ))}
            </section>
          ))}
        </article>
      </div>

      {/* ── Footer ── */}
      <footer className="pv-footer">
        <div className="pv-footer-inner">
          <div className="pv-wordmark pv-wordmark-footer">
            <span className="pv-wordmark-dot" aria-hidden="true" />
            CNS
          </div>
          <button className="pv-footer-back" onClick={onBack}>
            Back to CNS
          </button>
        </div>
      </footer>
    </div>
  );
}