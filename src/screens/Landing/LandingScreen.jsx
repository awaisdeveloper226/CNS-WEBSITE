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

// ── Motion-aware helpers ──────────────────────────────────────────────────

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e) => setReduced(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);
  return reduced;
}

// Scroll-reveal: an element fades/rises in the first time it enters the
// viewport, then leaves its transition alone. Falls back to "always
// visible" if IntersectionObserver isn't available.
function useReveal(threshold = 0.2) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(
    typeof window === "undefined" || typeof IntersectionObserver === "undefined"
  );
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.unobserve(el);
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function Reveal({ children, delay = 0, className = "", as: Tag = "div", ...rest }) {
  const [ref, visible] = useReveal();
  return (
    <Tag
      ref={ref}
      className={`ls-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// Counts a number up from 0 once its container scrolls into view.
function CountUp({ value, formatter, duration = 1100 }) {
  const [ref, visible] = useReveal(0.5);
  const [display, setDisplay] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!visible) return;
    if (reduced) { setDisplay(value); return; }
    let raf;
    let start = null;
    const step = (ts) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setDisplay(value * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible, value, duration, reduced]);

  return <span ref={ref}>{formatter(display)}</span>;
}

// Subtle cursor-tilt on hover — purely a hover affordance, so it's a no-op
// (and never wired up) when the visitor prefers reduced motion.
function TiltCard({ children, className = "" }) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();

  const handleMove = (e) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.setProperty("--tiltX", `${py * -5}deg`);
    ref.current.style.setProperty("--tiltY", `${px * 5}deg`);
  };
  const handleLeave = () => {
    if (!ref.current) return;
    ref.current.style.setProperty("--tiltX", "0deg");
    ref.current.style.setProperty("--tiltY", "0deg");
  };

  return (
    <div
      ref={ref}
      className={`ls-tilt ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  );
}

// ── KnowledgeMap — signature element ─────────────────────────────────────
// The product's whole pitch is "one driver's route knowledge becomes every
// driver's knowledge." Rather than an icon, the hero shows that literally,
// live: five driver nodes, one shared hub, and a steady stream of light
// pulses traveling from every node into the hub — knowledge flowing in
// from everywhere, continuously, with no node more central than another.
function KnowledgeMap() {
  const reduced = usePrefersReducedMotion();
  const nodes = [
    { x: 300, y: 44 },
    { x: 512, y: 152 },
    { x: 436, y: 336 },
    { x: 164, y: 336 },
    { x: 88, y: 152 },
  ];
  const center = { x: 300, y: 194 };

  return (
    <svg className="ls-knowledge-map" viewBox="0 0 600 380" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {nodes.map((n, i) => (
        <path
          key={`path-${i}`}
          id={`ls-route-path-${i}`}
          d={`M ${n.x} ${n.y} L ${center.x} ${center.y}`}
          className="ls-km-line"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}

      {/* Traveling knowledge pulses — SMIL animateMotion, skipped entirely
          under reduced motion rather than just visually hidden. */}
      {!reduced && nodes.map((_, i) => (
        <circle key={`pulse-${i}`} r="3.5" className="ls-km-pulse">
          <animateMotion dur="2.6s" repeatCount="indefinite" begin={`${i * 0.42}s`}>
            <mpath href={`#ls-route-path-${i}`} />
          </animateMotion>
        </circle>
      ))}

      {nodes.map((n, i) => (
        <g key={`node-${i}`} className="ls-km-node" style={{ animationDelay: `${0.4 + i * 0.12}s` }}>
          <circle cx={n.x} cy={n.y} r="15" />
          <circle cx={n.x} cy={n.y} r="4" className="ls-km-node-dot" />
        </g>
      ))}

      <g className="ls-km-hub">
        <circle cx={center.x} cy={center.y} r="34" className="ls-km-hub-ring ls-km-hub-ring--1" />
        <circle cx={center.x} cy={center.y} r="34" className="ls-km-hub-ring ls-km-hub-ring--2" />
        <circle cx={center.x} cy={center.y} r="30" className="ls-km-hub-fill" />
        <text x={center.x} y={center.y + 5} textAnchor="middle" className="ls-km-hub-label">CNS</text>
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
    <TiltCard className="ls-feature-card">
      <div className="ls-feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </TiltCard>
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

// ── ROI bar comparison — plain CSS widths, no chart library. Fills grow
//    from zero the moment the panel enters view, instead of just appearing.
function RoiBars({ reclaimedShare }) {
  const [ref, visible] = useReveal(0.45);
  const withoutWidth = 100;
  const withWidth = Math.max(6, Math.round((1 - reclaimedShare) * 100 * 0.18));
  // The "with CNS" bar is intentionally drawn far shorter than the raw
  // percentage would imply — it represents residual friction, not total
  // working time, so it reads as "nearly solved" rather than "18% left".

  return (
    <div ref={ref} className="ls-roi-bars" role="img" aria-label="Time lost to route friction, with and without CNS">
      <div className="ls-roi-bar-row">
        <span className="ls-roi-bar-label">Without CNS</span>
        <div className="ls-roi-bar-track">
          <div
            className="ls-roi-bar-fill ls-roi-bar-fill--dark"
            style={{ width: visible ? `${withoutWidth}%` : "0%" }}
          />
        </div>
        <span className="ls-roi-bar-value">9,600 min / driver / mo</span>
      </div>
      <div className="ls-roi-bar-row">
        <span className="ls-roi-bar-label">With CNS</span>
        <div className="ls-roi-bar-track">
          <div
            className="ls-roi-bar-fill ls-roi-bar-fill--route"
            style={{ width: visible ? `${withWidth}%` : "0%", transitionDelay: "0.3s" }}
          />
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
  const [showFloatingCta, setShowFloatingCta] = useState(false);
  const featuresRef = useRef(null);
  const heroRef = useRef(null);

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

  // Floating "sign up" pill appears once the hero has scrolled out of view,
  // so the CTA stays reachable without following the visitor everywhere.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || !heroRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => setShowFloatingCta(!entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(heroRef.current);
    return () => io.disconnect();
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
      <section className="ls-hero" ref={heroRef}>
        <div className="ls-hero-ambient" aria-hidden="true" />

        <div className="ls-hero-copy">
          <Reveal><SectionEyebrow>Delivery navigation, built for fleets</SectionEyebrow></Reveal>
          <Reveal delay={80}>
            <h1 className="ls-headline">
              The last 100 meters,<br />
              solved once, <span className="ls-headline-gradient">known by everyone.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="ls-subhead">
              The map gets a driver to the address. CNS gets them to the actual
              door &mdash; the loading dock, the side gate, the buzzer that
              works. Once one driver learns a stop, every driver on your fleet
              knows it too.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="ls-hero-actions">
              <span className="ls-cta-pulse">
                <button className="ls-btn-primary ls-btn-large" onClick={onSignupClick}>
                  Try it free with one route
                </button>
              </span>
              <button className="ls-btn-ghost ls-btn-large" onClick={scrollToFeatures}>
                See how it works
              </button>
            </div>
          </Reveal>
          <Reveal delay={300}>
            <p className="ls-hero-fineprint">
              Run a real delivery with an experienced driver's knowledge before you pay for anything.
            </p>
          </Reveal>
        </div>

        <Reveal delay={200} className="ls-hero-visual">
          <div className="ls-console">
            <div className="ls-console-head">
              <span className="ls-console-live">
                <span className="ls-console-live-dot" aria-hidden="true" />
                Always in sync
              </span>
              <span className="ls-console-label">Knowledge network</span>
            </div>
            <KnowledgeMap />
            <span className="ls-console-caption">
              One stop, learned once &mdash; instantly known fleet&#8209;wide.
            </span>
          </div>
        </Reveal>
      </section>

      {/* ── Features ── */}
      <section className="ls-section" ref={featuresRef}>
        <Reveal className="ls-section-head" as="div">
          <SectionEyebrow>Why fleets switch</SectionEyebrow>
          <h2>Every driver runs every route the same way.</h2>
          <p className="ls-section-sub">
            No more one driver who "knows the west side." With CNS, that
            knowledge belongs to the fleet, not the person.
          </p>
        </Reveal>
        <div className="ls-feature-grid">
          <Reveal delay={0}>
            <FeatureCard icon={<Share2 size={20} strokeWidth={2} />} title="One shared map">
              Every driver has access to the knowledge every other driver has
              already earned. Assign any run to any driver and get the same result.
            </FeatureCard>
          </Reveal>
          <Reveal delay={90}>
            <FeatureCard icon={<GraduationCap size={20} strokeWidth={2} />} title="Training costs disappear">
              A driver who can drive and can read doesn't need a ride-along to
              learn a route &mdash; the instructions are already sitting in their hand.
            </FeatureCard>
          </Reveal>
          <Reveal delay={180}>
            <FeatureCard icon={<PhoneOff size={20} strokeWidth={2} />} title="Dispatch stops ringing">
              When a driver already knows where to go, they stop calling in to
              ask. Fewer interruptions, less back-and-forth, cleaner days.
            </FeatureCard>
          </Reveal>
          <Reveal delay={270}>
            <FeatureCard icon={<Smile size={20} strokeWidth={2} />} title="Customers feel it">
              Deliveries land at the right door on the first try, every time. A
              frustrated driver becomes a confident one, and it shows up on the doorstep.
            </FeatureCard>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="ls-section ls-section--tint">
        <Reveal className="ls-section-head" as="div">
          <SectionEyebrow>How it works</SectionEyebrow>
          <h2>Three steps, then it runs itself.</h2>
        </Reveal>
        <div className="ls-step-grid">
          <Reveal delay={0}>
            <StepCard index="01" title="Run one route free">
              We hand an unfamiliar driver the knowledge of your most experienced
              one, on a real delivery. You watch the difference before you commit to anything.
            </StepCard>
          </Reveal>
          <Reveal delay={110}>
            <StepCard index="02" title="We map your customers">
              Our team works with your drivers and sales reps to document every
              stop once &mdash; the entrance, the gate code, the exact spot to park.
            </StepCard>
          </Reveal>
          <Reveal delay={220}>
            <StepCard index="03" title="Every driver, every route">
              The map goes live for your whole fleet, and we resync it against
              your customer list every week, so it's always accurate, never stale.
            </StepCard>
          </Reveal>
        </div>
      </section>

      {/* ── ROI ── */}
      <section className="ls-section" id="roi">
        <Reveal className="ls-section-head" as="div">
          <SectionEyebrow>Return on investment</SectionEyebrow>
          <h2>The math, laid out plainly.</h2>
          <p className="ls-section-sub">
            A driver working an 8-hour day covers 480 minutes &mdash; 9,600 a
            month. Every minute spent backtracking, calling dispatch, or
            re-learning a stop someone else already knows is a minute that
            didn't need to be spent.
          </p>
        </Reveal>

        <Reveal className="ls-roi-panel" as="div">
          <RoiBars reclaimedShare={MINUTES_RECLAIMED_PER_MONTH / 9600} />

          <div className="ls-roi-stats">
            <div className="ls-roi-stat">
              <TrendingUp size={18} strokeWidth={2.2} />
              <div>
                <span className="ls-roi-stat-value">
                  <CountUp value={MINUTES_RECLAIMED_PER_MONTH} formatter={(n) => `~${Math.round(n)} min`} />
                </span>
                <span className="ls-roi-stat-label">reclaimed / driver / month</span>
              </div>
            </div>
            <div className="ls-roi-stat">
              <TrendingUp size={18} strokeWidth={2.2} />
              <div>
                <span className="ls-roi-stat-value">
                  <CountUp value={reclaimedValue} formatter={formatMoney} />
                </span>
                <span className="ls-roi-stat-label">value reclaimed, at ${ASSUMED_HOURLY_WAGE}/hr</span>
              </div>
            </div>
            <div className="ls-roi-stat">
              <TrendingUp size={18} strokeWidth={2.2} />
              <div>
                <span className="ls-roi-stat-value">
                  {roiMultiplier
                    ? <CountUp value={roiMultiplier} formatter={(n) => `${n.toFixed(1)}x`} />
                    : "up to 10x"}
                </span>
                <span className="ls-roi-stat-label">return on your subscription cost</span>
              </div>
            </div>
          </div>
        </Reveal>
        <p className="ls-roi-footnote">
          Figures are an illustrative example based on an 8-hour driver day
          and a {formatMoney(ASSUMED_HOURLY_WAGE)}/hr wage &mdash; your own numbers will vary with route density and fleet size.
        </p>
      </section>

      {/* ── Pricing ── */}
      <section className="ls-section ls-section--tint" id="pricing">
        <Reveal className="ls-section-head" as="div">
          <SectionEyebrow>Pricing</SectionEyebrow>
          <h2>One price. No surprises.</h2>
        </Reveal>
        <Reveal className="ls-pricing-card" as="div">
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
        </Reveal>
      </section>

      {/* ── Contact ── */}
      <section className="ls-contact" id="contact">
        <Reveal className="ls-contact-inner" as="div">
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
        </Reveal>
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

      {/* ── Floating CTA ── */}
      <button
        className={`ls-floating-cta ${showFloatingCta ? "is-visible" : ""}`}
        onClick={onSignupClick}
      >
        Start your free trial <ArrowUpRight size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
}
