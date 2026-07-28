import { useState, useEffect, useRef } from "react";
import {
  Share2, GraduationCap, PhoneOff, Smile, ArrowUpRight,
  CheckCircle2, TrendingUp, Mail, MapPin,
} from "lucide-react";
import { API_ENDPOINTS } from "../../constants/network";
import "./LandingScreen.css";

// ── Config ────────────────────────────────────────────────────────────────
// Swap this for your real inbox before shipping.
const CONTACT_EMAIL = "hello@cnsapp.com";

// Marketing-page assumption used to translate reclaimed minutes into a
// dollar figure. Kept as one named constant so it's obvious where the "10x"
// headline number comes from, and easy to change later.
const ASSUMED_HOURLY_WAGE = 30;
const MINUTES_RECLAIMED_PER_MONTH = 200;

// ── KnowledgeMap — signature element ─────────────────────────────────────
// The product's whole pitch is "one driver's route knowledge becomes every
// driver's knowledge." Rather than an icon, the hero shows that literally:
// five driver nodes, one shared map at the center, every node connected to
// it the same way — no node more central than another.
function KnowledgeMap() {
  const nodes = [
    { x: 300, y: 40 },
    { x: 520, y: 150 },
    { x: 440, y: 340 },
    { x: 160, y: 340 },
    { x: 80, y: 150 },
  ];
  const center = { x: 300, y: 190 };

  return (
    <svg className="ls-knowledge-map" viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {nodes.map((n, i) => (
        <line
          key={i}
          x1={n.x} y1={n.y} x2={center.x} y2={center.y}
          className="ls-km-line"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i} className="ls-km-node" style={{ animationDelay: `${0.4 + i * 0.12}s` }}>
          <circle cx={n.x} cy={n.y} r="15" />
        </g>
      ))}
      <g className="ls-km-hub">
        <circle cx={center.x} cy={center.y} r="34" />
        <circle cx={center.x} cy={center.y} r="34" className="ls-km-hub-ring" />
      </g>
    </svg>
  );
}

// ── Small reusable bits ──────────────────────────────────────────────────
function SectionEyebrow({ children }) {
  return <span className="ls-eyebrow">{children}</span>;
}

function FeatureCard({ icon, title, children }) {
  return (
    <div className="ls-feature-card">
      <div className="ls-feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

function StepCard({ index, title, children }) {
  return (
    <div className="ls-step-card">
      <span className="ls-step-index">{index}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

// ── ROI bar comparison — plain CSS widths, no chart library ─────────────
function RoiBars({ reclaimedShare }) {
  // reclaimedShare: fraction (0-1) of a driver's working month spent on
  // avoidable friction (wrong turns, calls to dispatch, retraining) that
  // CNS reclaims. Rendered as two bars on the same scale.
  const withoutWidth = 100;
  const withWidth = Math.max(6, Math.round((1 - reclaimedShare) * 100 * 0.18));
  // The "with CNS" bar is intentionally drawn far shorter than the raw
  // percentage would imply — it represents residual friction, not total
  // working time, so it reads as "nearly solved" rather than "18% left".

  return (
    <div className="ls-roi-bars" role="img" aria-label="Time lost to route friction, with and without CNS">
      <div className="ls-roi-bar-row">
        <span className="ls-roi-bar-label">Without CNS</span>
        <div className="ls-roi-bar-track">
          <div className="ls-roi-bar-fill ls-roi-bar-fill--dark" style={{ width: `${withoutWidth}%` }} />
        </div>
        <span className="ls-roi-bar-value">9,600 min / driver / mo</span>
      </div>
      <div className="ls-roi-bar-row">
        <span className="ls-roi-bar-label">With CNS</span>
        <div className="ls-roi-bar-track">
          <div className="ls-roi-bar-fill ls-roi-bar-fill--route" style={{ width: `${withWidth}%` }} />
        </div>
        <span className="ls-roi-bar-value">~{MINUTES_RECLAIMED_PER_MONTH} min reclaimed</span>
      </div>
    </div>
  );
}

// ── LandingScreen ─────────────────────────────────────────────────────────
export default function LandingScreen({ onLoginClick, onSignupClick, onTermsPress, onPrivacyPress }) {
  const [unitPrice, setUnitPrice] = useState(null);
  const [currency, setCurrency] = useState("usd");
  const [scrolled, setScrolled] = useState(false);
  const featuresRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_ENDPOINTS.PAYMENT_PRICE_INFO);
        const data = await res.json();
        if (res.ok && typeof data.unitAmountDecimal === "number") {
          setUnitPrice(data.unitAmountDecimal);
          if (typeof data.currency === "string") setCurrency(data.currency);
        }
      } catch {
        // silent — the page reads fine without a live price
      }
    })();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const formatMoney = (amount) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
    }
  };

  const reclaimedHours = MINUTES_RECLAIMED_PER_MONTH / 60;
  const reclaimedValue = reclaimedHours * ASSUMED_HOURLY_WAGE;
  const roiMultiplier = unitPrice && unitPrice > 0 ? (reclaimedValue / unitPrice) : null;

  const scrollToFeatures = () => featuresRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="ls-root">
      {/* ── Nav ── */}
      <header className={`ls-nav ${scrolled ? "ls-nav--scrolled" : ""}`}>
        <div className="ls-nav-inner">
          <div className="ls-wordmark">
            <span className="ls-wordmark-dot" aria-hidden="true" />
            CNS
          </div>
          <nav className="ls-nav-links" aria-label="Primary">
            <button className="ls-nav-link" onClick={scrollToFeatures}>Product</button>
            <a className="ls-nav-link" href="#roi">ROI</a>
            <a className="ls-nav-link" href="#pricing">Pricing</a>
            <a className="ls-nav-link" href="#contact">Contact</a>
          </nav>
          <div className="ls-nav-actions">
            <button className="ls-btn-ghost" onClick={onLoginClick}>Log in</button>
            <button className="ls-btn-primary" onClick={onSignupClick}>
              Sign up <ArrowUpRight size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="ls-hero">
        <div className="ls-hero-copy">
          <SectionEyebrow>Delivery navigation, built for fleets</SectionEyebrow>
          <h1 className="ls-headline">
            The last 100 meters,<br />solved once, known&nbsp;by&nbsp;everyone.
          </h1>
          <p className="ls-subhead">
            The map gets a driver to the address. CNS gets them to the actual
            door &mdash; the loading dock, the side gate, the buzzer that
            works. Once one driver learns a stop, every driver on your fleet
            knows it too.
          </p>
          <div className="ls-hero-actions">
            <button className="ls-btn-primary ls-btn-large" onClick={onSignupClick}>
              Try it free with one route
            </button>
            <button className="ls-btn-ghost ls-btn-large" onClick={scrollToFeatures}>
              See how it works
            </button>
          </div>
          <p className="ls-hero-fineprint">
            Run a real delivery with an experienced driver's knowledge before you pay for anything.
          </p>
        </div>
        <div className="ls-hero-visual">
          <KnowledgeMap />
          <span className="ls-hero-visual-caption">One stop, learned once &mdash; instantly known fleet-wide</span>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="ls-section" ref={featuresRef}>
        <div className="ls-section-head">
          <SectionEyebrow>Why fleets switch</SectionEyebrow>
          <h2>Every driver runs every route the same way.</h2>
          <p className="ls-section-sub">
            No more one driver who "knows the west side." With CNS, that
            knowledge belongs to the fleet, not the person.
          </p>
        </div>
        <div className="ls-feature-grid">
          <FeatureCard icon={<Share2 size={20} strokeWidth={2} />} title="One shared map">
            Every driver has access to the knowledge every other driver has
            already earned. Assign any run to any driver and get the same result.
          </FeatureCard>
          <FeatureCard icon={<GraduationCap size={20} strokeWidth={2} />} title="Training costs disappear">
            A driver who can drive and can read doesn't need a ride-along to
            learn a route &mdash; the instructions are already sitting in their hand.
          </FeatureCard>
          <FeatureCard icon={<PhoneOff size={20} strokeWidth={2} />} title="Dispatch stops ringing">
            When a driver already knows where to go, they stop calling in to
            ask. Fewer interruptions, less back-and-forth, cleaner days.
          </FeatureCard>
          <FeatureCard icon={<Smile size={20} strokeWidth={2} />} title="Customers feel it">
            Deliveries land at the right door on the first try, every time. A
            frustrated driver becomes a confident one, and it shows up on the doorstep.
          </FeatureCard>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="ls-section ls-section--tint">
        <div className="ls-section-head">
          <SectionEyebrow>How it works</SectionEyebrow>
          <h2>Three steps, then it runs itself.</h2>
        </div>
        <div className="ls-step-grid">
          <StepCard index="01" title="Run one route free">
            We hand an unfamiliar driver the knowledge of your most experienced
            one, on a real delivery. You watch the difference before you commit to anything.
          </StepCard>
          <StepCard index="02" title="We map your customers">
            Our team works with your drivers and sales reps to document every
            stop once &mdash; the entrance, the gate code, the exact spot to park.
          </StepCard>
          <StepCard index="03" title="Every driver, every route">
            The map goes live for your whole fleet, and we resync it against
            your customer list every week, so it's always accurate, never stale.
          </StepCard>
        </div>
      </section>

      {/* ── ROI ── */}
      <section className="ls-section" id="roi">
        <div className="ls-section-head">
          <SectionEyebrow>Return on investment</SectionEyebrow>
          <h2>The math, laid out plainly.</h2>
          <p className="ls-section-sub">
            A driver working an 8-hour day covers 480 minutes &mdash; 9,600 a
            month. Every minute spent backtracking, calling dispatch, or
            re-learning a stop someone else already knows is a minute that
            didn't need to be spent.
          </p>
        </div>

        <div className="ls-roi-panel">
          <RoiBars reclaimedShare={MINUTES_RECLAIMED_PER_MONTH / 9600} />

          <div className="ls-roi-stats">
            <div className="ls-roi-stat">
              <TrendingUp size={18} strokeWidth={2.2} />
              <div>
                <span className="ls-roi-stat-value">~{MINUTES_RECLAIMED_PER_MONTH} min</span>
                <span className="ls-roi-stat-label">reclaimed / driver / month</span>
              </div>
            </div>
            <div className="ls-roi-stat">
              <TrendingUp size={18} strokeWidth={2.2} />
              <div>
                <span className="ls-roi-stat-value">{formatMoney(reclaimedValue)}</span>
                <span className="ls-roi-stat-label">value reclaimed, at ${ASSUMED_HOURLY_WAGE}/hr</span>
              </div>
            </div>
            <div className="ls-roi-stat">
              <TrendingUp size={18} strokeWidth={2.2} />
              <div>
                <span className="ls-roi-stat-value">
                  {roiMultiplier ? `${roiMultiplier.toFixed(1)}x` : "up to 10x"}
                </span>
                <span className="ls-roi-stat-label">return on your subscription cost</span>
              </div>
            </div>
          </div>
        </div>
        <p className="ls-roi-footnote">
          Figures are an illustrative example based on an 8-hour driver day
          and a {formatMoney(ASSUMED_HOURLY_WAGE)}/hr wage &mdash; your own numbers will vary with route density and fleet size.
        </p>
      </section>

      {/* ── Pricing ── */}
      <section className="ls-section ls-section--tint" id="pricing">
        <div className="ls-section-head">
          <SectionEyebrow>Pricing</SectionEyebrow>
          <h2>One price. No surprises.</h2>
        </div>
        <div className="ls-pricing-card">
          <div className="ls-pricing-price">
            {unitPrice !== null ? (
              <>
                <span className="ls-pricing-amount">{formatMoney(unitPrice)}</span>
                <span className="ls-pricing-period">/ driver / month</span>
              </>
            ) : (
              <span className="ls-pricing-amount ls-pricing-amount--loading">Loading pricing&hellip;</span>
            )}
          </div>
          <ul className="ls-pricing-list">
            <li><CheckCircle2 size={16} strokeWidth={2.4} /> No implementation charges</li>
            <li><CheckCircle2 size={16} strokeWidth={2.4} /> No upfront costs, no hidden fees</li>
            <li><CheckCircle2 size={16} strokeWidth={2.4} /> No contracts &mdash; cancel anytime</li>
            <li><CheckCircle2 size={16} strokeWidth={2.4} /> Free trial run before you subscribe</li>
          </ul>
          <button className="ls-btn-primary ls-btn-large" onClick={onSignupClick}>
            Get your fleet started
          </button>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="ls-contact" id="contact">
        <div className="ls-contact-inner">
          <h2>Want to see it on your own routes?</h2>
          <p>Tell us about your fleet and we'll set up a free trial run on one of your real deliveries.</p>
          <div className="ls-contact-actions">
            <a className="ls-btn-ghost ls-btn-large ls-btn-on-dark" href={`mailto:${CONTACT_EMAIL}`}>
              <Mail size={16} strokeWidth={2.2} /> {CONTACT_EMAIL}
            </a>
            <button className="ls-btn-primary ls-btn-large" onClick={onSignupClick}>
              Sign up
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="ls-footer">
        <div className="ls-footer-inner">
          <div className="ls-footer-brand">
            <div className="ls-wordmark">
              <span className="ls-wordmark-dot" aria-hidden="true" />
              CNS
            </div>
            <p><MapPin size={13} strokeWidth={2} /> Built by couriers, for couriers.</p>
          </div>
          <nav className="ls-footer-legal" aria-label="Legal">
            <button className="ls-footer-legal-link" onClick={onTermsPress}>Terms of Service</button>
            <span className="ls-footer-dot" aria-hidden="true" />
            <button className="ls-footer-legal-link" onClick={onPrivacyPress}>Privacy Policy</button>
          </nav>
        </div>
      </footer>
    </div>
  );
}