import { useState, useEffect } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import "./TermsScreen.css";

// ── Content ───────────────────────────────────────────────────────────────
// Structured as sections → blocks so the page can build both the article
// and the waypoint nav from one source of truth.
const LAST_UPDATED = "July 20, 2026";

const SECTIONS = [
  {
    id: "introduction",
    num: "01",
    title: "Introduction",
    blocks: [
      { type: "p", text: `Welcome to CNS ("CNS", "we", "our", or "us").` },
      { type: "p", text: `These Terms of Service ("Terms") govern your access to and use of the CNS website, mobile application, and related services (collectively, the "Services").` },
      { type: "p", text: "By creating an account, accessing, or using the Services, you agree to be bound by these Terms. If you do not agree with these Terms, you must not use CNS." },
    ],
  },
  {
    id: "eligibility",
    num: "02",
    title: "Eligibility",
    blocks: [
      { type: "p", text: "You must be at least 18 years of age to use CNS." },
      { type: "p", text: "If you create an account on behalf of a business or organisation, you represent that you have the authority to bind that business or organisation to these Terms." },
    ],
  },
  {
    id: "accounts",
    num: "03",
    title: "Accounts",
    blocks: [
      { type: "p", text: "You are responsible for:" },
      { type: "ul", items: [
        "Maintaining the confidentiality of your account credentials.",
        "Ensuring the information you provide is accurate and up to date.",
        "All activity that occurs under your account.",
      ]},
      { type: "p", text: "You must notify us immediately if you believe your account has been accessed without your permission." },
    ],
  },
  {
    id: "subscription-services",
    num: "04",
    title: "Subscription Services",
    blocks: [
      { type: "p", text: "CNS is provided as a subscription-based service." },
      { type: "p", text: "Subscription pricing, billing frequency, and included features are displayed during the checkout process." },
      { type: "p", text: "Your subscription will automatically renew unless cancelled before the next billing date." },
      { type: "p", text: "By purchasing a subscription, you authorise CNS and its payment processor to charge your selected payment method for all applicable subscription fees." },
    ],
  },
  {
    id: "payments",
    num: "05",
    title: "Payments",
    blocks: [
      { type: "p", text: "Payments are securely processed through Stripe." },
      { type: "p", text: "CNS does not store or process your payment card information." },
      { type: "p", text: "If a payment cannot be processed, we may suspend or restrict access to the Services until payment has been successfully received." },
    ],
  },
  {
    id: "subscription-changes",
    num: "06",
    title: "Subscription Changes and Cancellation",
    blocks: [
      { type: "p", text: "You may cancel your subscription at any time through your customer account or by contacting us." },
      { type: "p", text: "Cancellation prevents future billing but does not automatically entitle you to a refund for any fees already paid." },
      { type: "p", text: "Your subscription will remain active until the end of your current billing period unless otherwise stated." },
    ],
  },
  {
    id: "refunds",
    num: "07",
    title: "Refunds",
    blocks: [
      { type: "p", text: "Unless required by Australian law, subscription fees are non-refundable." },
      { type: "p", text: "If you believe you have been charged incorrectly, please contact us at:" },
      { type: "contact", email: "support@cnsroute.com" },
    ],
  },
  {
    id: "acceptable-use",
    num: "08",
    title: "Acceptable Use",
    blocks: [
      { type: "p", text: "You agree not to:" },
      { type: "ul", items: [
        "Use CNS for unlawful purposes.",
        "Upload false, misleading, or intentionally inaccurate information.",
        "Upload malicious software or harmful code.",
        "Attempt to gain unauthorised access to CNS systems.",
        "Interfere with the operation or security of the Services.",
        "Use automated systems to scrape or copy data without our written permission.",
        "Impersonate another person or organisation.",
      ]},
    ],
  },
  {
    id: "user-content",
    num: "09",
    title: "User Content",
    blocks: [
      { type: "p", text: "CNS allows users to upload information including:" },
      { type: "ul", items: [
        "Photos",
        "Videos",
        "Navigation notes",
        "Loading dock information",
        "Delivery instructions",
        "Site-specific operational information",
      ]},
      { type: "p", text: "You retain ownership of the content you upload." },
      { type: "p", text: "By submitting content to CNS, you grant us a worldwide, non-exclusive, royalty-free licence to store, display, reproduce, modify where technically necessary, and distribute that content solely for the purpose of operating, maintaining, and improving the Services." },
      { type: "p", text: "You represent that you have the necessary rights and permissions to upload any content you submit." },
      { type: "p", text: "We reserve the right to remove content that violates these Terms or applicable law." },
    ],
  },
  {
    id: "intellectual-property",
    num: "10",
    title: "Intellectual Property",
    blocks: [
      { type: "p", text: "All software, branding, logos, graphics, text, databases, designs, and other materials comprising CNS are owned by or licensed to CNS and are protected by applicable intellectual property laws." },
      { type: "p", text: "Except as expressly permitted by these Terms, you may not copy, reproduce, distribute, modify, reverse engineer, or create derivative works from any part of the Services without our prior written consent." },
    ],
  },
  {
    id: "availability",
    num: "11",
    title: "Availability of the Services",
    blocks: [
      { type: "p", text: "We aim to provide reliable and uninterrupted access to CNS." },
      { type: "p", text: "However, we do not guarantee that the Services will always be available or free from interruptions, delays, errors, or security vulnerabilities." },
      { type: "p", text: "We may modify, suspend, or discontinue any part of the Services at any time." },
    ],
  },
  {
    id: "data-accuracy",
    num: "12",
    title: "Data Accuracy",
    blocks: [
      { type: "p", text: "CNS provides delivery-related information contributed by businesses and users." },
      { type: "p", text: "While we encourage accurate information, we do not guarantee that all content is complete, current, or accurate." },
      { type: "p", text: "Users remain responsible for exercising their own judgement when relying on information provided through the Services." },
    ],
  },
  {
    id: "limitation-of-liability",
    num: "13",
    title: "Limitation of Liability",
    blocks: [
      { type: "p", text: "To the maximum extent permitted by law, CNS shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, business interruption, data loss, or loss of goodwill arising from or relating to your use of the Services." },
      { type: "p", text: "Our total liability for any claim relating to the Services shall not exceed the total subscription fees paid by you to CNS during the twelve (12) months immediately preceding the event giving rise to the claim." },
      { type: "p", text: "Nothing in these Terms excludes or limits any rights or remedies that cannot be excluded under applicable law, including the Australian Consumer Law." },
    ],
  },
  {
    id: "indemnity",
    num: "14",
    title: "Indemnity",
    blocks: [
      { type: "p", text: "You agree to indemnify and hold harmless CNS, its directors, employees, contractors, and affiliates from any claims, liabilities, damages, losses, or expenses arising from:" },
      { type: "ul", items: [
        "your use of the Services;",
        "your breach of these Terms;",
        "content you upload; or",
        "your violation of any applicable law or the rights of another person.",
      ]},
    ],
  },
  {
    id: "suspension-termination",
    num: "15",
    title: "Suspension and Termination",
    blocks: [
      { type: "p", text: "We may suspend or terminate your account immediately if:" },
      { type: "ul", items: [
        "you breach these Terms;",
        "your subscription fees remain unpaid;",
        "your conduct threatens the security or integrity of the Services; or",
        "we are required to do so by law.",
      ]},
      { type: "p", text: "Upon termination, your right to access the Services will cease." },
    ],
  },
  {
    id: "privacy",
    num: "16",
    title: "Privacy",
    blocks: [
      { type: "p", text: "Your use of CNS is also governed by our Privacy Policy." },
      { type: "p", text: "By using the Services, you acknowledge that you have read and understood our Privacy Policy." },
    ],
  },
  {
    id: "changes-to-terms",
    num: "17",
    title: "Changes to These Terms",
    blocks: [
      { type: "p", text: "We may update these Terms from time to time." },
      { type: "p", text: `If we make material changes, we will update the "Last updated" date and may notify users by email or through the Services where appropriate.` },
      { type: "p", text: "Continued use of CNS after changes take effect constitutes acceptance of the updated Terms." },
    ],
  },
  {
    id: "governing-law",
    num: "18",
    title: "Governing Law",
    blocks: [
      { type: "p", text: "These Terms are governed by the laws of New South Wales, Australia." },
      { type: "p", text: "Any disputes arising out of or relating to these Terms or the Services shall be subject to the exclusive jurisdiction of the courts of New South Wales, Australia." },
    ],
  },
  {
    id: "contact-us",
    num: "19",
    title: "Contact Us",
    blocks: [
      { type: "p", text: "If you have any questions regarding these Terms, please contact us:" },
      { type: "contact", label: "CNS", email: "support@cnsroute.com" },
    ],
  },
];

// ── Block renderer ───────────────────────────────────────────────────────
function Block({ block }) {
  if (block.type === "p") return <p className="ts-p">{block.text}</p>;

  if (block.type === "ul") {
    return (
      <ul className="ts-ul">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === "contact") {
    return (
      <div className="ts-contact-card">
        {block.label && <span className="ts-contact-label">{block.label}</span>}
        <a className="ts-contact-email" href={`mailto:${block.email}`}>
          <Mail size={15} strokeWidth={2} />
          {block.email}
        </a>
      </div>
    );
  }

  return null;
}

// ── TermsScreen ───────────────────────────────────────────────────────────
export default function TermsScreen({ onBack, onPrivacyPress }) {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);

  // This screen is swapped into the same page (no real navigation happens —
  // App.js just changes `tab`), so the browser keeps whatever scroll
  // position the previous screen was at. Since the link to get here usually
  // lives in a footer at the bottom of the page, that means Terms/Privacy
  // would otherwise render already scrolled to the bottom. Force it back
  // to the top on mount, and reset the active waypoint to match.
  useEffect(() => {
    window.scrollTo(0, 0);
    setActiveId(SECTIONS[0].id);
  }, []);

  const handleWaypointClick = (id) => {
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="ts-root">
      {/* ── Top nav ── */}
      <header className="ts-nav">
        <div className="ts-nav-inner">
          <button className="ts-back" onClick={onBack} aria-label="Back to home">
            <ArrowLeft size={18} strokeWidth={2.25} />
          </button>
          <div className="ts-wordmark">
            <span className="ts-wordmark-dot" aria-hidden="true" />
            CNS
          </div>
          <span className="ts-nav-label">Terms of Service</span>
        </div>
      </header>

      {/* ── Header ── */}
      <section className="ts-hero">
        <div className="ts-hero-inner">
          <span className="ts-eyebrow">Legal</span>
          <h1 className="ts-headline">Terms of Service</h1>
          <p className="ts-updated">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      {/* ── Body ── */}
      <div className="ts-layout">
        {/* Waypoint nav — the route line of the document itself */}
        <aside className="ts-toc" aria-label="Sections">
          <div className="ts-toc-line" aria-hidden="true" />
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  className={`ts-toc-item ${activeId === s.id ? "is-active" : ""}`}
                  onClick={() => handleWaypointClick(s.id)}
                >
                  <span className="ts-toc-dot" aria-hidden="true" />
                  <span className="ts-toc-num">{s.num}</span>
                  <span className="ts-toc-title">{s.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Article */}
        <article className="ts-article">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="ts-section">
              <h2 className="ts-section-title">
                <span className="ts-section-num">{s.num}</span>
                {s.title}
                {s.id === "privacy" && onPrivacyPress && (
                  <button className="ts-inline-link" onClick={onPrivacyPress}>
                    View Privacy Policy
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
      <footer className="ts-footer">
        <div className="ts-footer-inner">
          <div className="ts-wordmark ts-wordmark-footer">
            <span className="ts-wordmark-dot" aria-hidden="true" />
            CNS
          </div>
          <button className="ts-footer-back" onClick={onBack}>
            Back to CNS
          </button>
        </div>
      </footer>
    </div>
  );
}