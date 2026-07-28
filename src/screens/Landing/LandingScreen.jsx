import React, { useState, useMemo } from "react";
import {
  Truck,
  MapPin,
  PhoneCall,
  Users,
  Clock3,
  PackageCheck,
  CheckCircle2,
  ArrowRight,
  Route as RouteIcon,
  ShieldCheck,
  TrendingUp,
  Menu,
  X,
  UserPlus,
  CalendarOff,
  ThermometerSun,
} from "lucide-react";

/* ------------------------------------------------------------------
   CNS — "Every Driver. Every Customer. Every Time."
   Delivery knowledge platform landing page
------------------------------------------------------------------- */

const ROUTE_STOPS = [
  { label: "Dock 3, rear alley", icon: MapPin },
  { label: "Ring buzzer twice", icon: PhoneCall },
  { label: "Skip reception", icon: CheckCircle2 },
  { label: "Gate code 4471", icon: ShieldCheck },
];

const PROBLEM_ITEMS = [
  { icon: PhoneCall, text: "A call to dispatch, just to find the address" },
  { icon: PhoneCall, text: "A call to the customer, just to find the entrance" },
  { icon: Clock3, text: "Minutes lost circling for the right delivery point" },
  { icon: Users, text: "An experienced driver pulled off their own run to help" },
];

const KNOWLEDGE_ROWS = [
  { who: "Driver A", knows: "The correct loading dock is round the back, not the front office." },
  { who: "Driver B", knows: "The quickest entrance is through the yard gate, not the car park." },
  { who: "Driver C", knows: "This customer wants deliveries taken straight to the storage room." },
  { who: "Driver D", knows: "Reception adds ten minutes — go to the goods-in door instead." },
];

const SCENARIOS = [
  { icon: ThermometerSun, title: "A driver calls in sick", body: "Someone else steps in and still finds every dock, buzzer, and preference exactly where they left off." },
  { icon: CalendarOff, title: "A driver takes leave", body: "The run doesn't wait for one person's memory. Any capable driver can pick it up today." },
  { icon: UserPlus, title: "A new hire starts Monday", body: "They arrive at their first stop already knowing what took a veteran three years to learn." },
];

const ONBOARD_STEPS = [
  { n: "01", title: "We ride along", body: "Our team joins your drivers and sales reps on real runs to see how each customer actually likes to be handled." },
  { n: "02", title: "We map it", body: "Every dock, gate code, buzzer, and quirk gets logged against the stop — no spreadsheets, no guesswork left to memory." },
  { n: "03", title: "You switch it on", body: "Your knowledge base is live. No implementation fee, no setup cost, no mapping charge." },
];

export default function CNSLandingPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [driverCount, setDriverCount] = useState(25);
  const [minutesSaved, setMinutesSaved] = useState(35);

  const monthlyCost = driverCount * 9.99;
  const monthlyMinutesSaved = driverCount * minutesSaved * 22; // ~22 working days
  const monthlyHoursSaved = Math.round(monthlyMinutesSaved / 60);
  const breakEvenMinutes = 20;
  const surplusMinutes = Math.max(minutesSaved - breakEvenMinutes, 0);

  const roiMultiple = useMemo(() => {
    if (monthlyCost <= 0) return 0;
    const valuePerDriver = minutesSaved * 22; // minutes saved per driver per month
    const costPerDriverMinutes = 9.99; // cost is fixed regardless of minutes
    return (valuePerDriver / breakEvenMinutes).toFixed(1);
  }, [minutesSaved, monthlyCost]);

  return (
    <div className="cns-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

        .cns-root {
          --ink: #16241F;
          --ink-soft: #4A5D53;
          --ink-faint: #7C8B82;
          --paper: #F5F4EE;
          --paper-dim: #ECEADF;
          --surface: #FFFFFF;
          --green-deep: #0E3B2E;
          --green: #167A51;
          --green-bright: #2FAE73;
          --blue: #2C77A6;
          --orange: #E1631E;
          --orange-deep: #B84713;
          --line: #DBD7C9;
          --line-soft: #E7E4D8;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          background: var(--paper);
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
        }
        .cns-root * { box-sizing: border-box; }
        .cns-display {
          font-family: 'Space Grotesk', sans-serif;
          letter-spacing: -0.02em;
        }
        .cns-mono {
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 0.02em;
        }
        .cns-wrap {
          max-width: 1160px;
          margin: 0 auto;
          padding: 0 32px;
        }
        @media (max-width: 640px) {
          .cns-wrap { padding: 0 20px; }
        }

        /* ---------- NAV ---------- */
        .cns-nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(245, 244, 238, 0.92);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid var(--line);
        }
        .cns-nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 76px;
        }
        .cns-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cns-brand-mark {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(160deg, var(--blue) 0%, var(--green) 55%, var(--green-bright) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cns-brand-word {
          font-size: 20px;
          font-weight: 700;
        }
        .cns-brand-tag {
          font-size: 10px;
          color: var(--ink-faint);
          margin-top: -3px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .cns-nav-links {
          display: flex;
          align-items: center;
          gap: 36px;
        }
        .cns-nav-links a {
          font-size: 14.5px;
          font-weight: 500;
          color: var(--ink-soft);
          text-decoration: none;
        }
        .cns-nav-links a:hover { color: var(--ink); }
        .cns-nav-actions { display: flex; align-items: center; gap: 18px; }
        .cns-nav-toggle { display: none; background: none; border: none; cursor: pointer; color: var(--ink); }
        @media (max-width: 860px) {
          .cns-nav-links { display: none; }
          .cns-nav-toggle { display: block; }
        }
        .cns-mobile-menu {
          border-bottom: 1px solid var(--line);
          background: var(--surface);
          padding: 8px 0 20px;
        }
        .cns-mobile-menu a {
          display: block;
          padding: 12px 0;
          font-weight: 500;
          color: var(--ink);
          text-decoration: none;
          border-bottom: 1px solid var(--line-soft);
        }

        /* ---------- BUTTONS ---------- */
        .cns-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14.5px;
          padding: 12px 22px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
        }
        .cns-btn-primary {
          background: var(--orange);
          color: #fff;
        }
        .cns-btn-primary:hover { background: var(--orange-deep); }
        .cns-btn-ghost {
          background: transparent;
          color: var(--ink);
          border: 1px solid var(--line);
        }
        .cns-btn-ghost:hover { border-color: var(--ink-faint); }
        .cns-btn-dark {
          background: var(--green-deep);
          color: #fff;
        }
        .cns-btn-dark:hover { background: #0a2e24; }

        /* ---------- HERO ---------- */
        .cns-hero {
          padding: 76px 0 60px;
          position: relative;
          overflow: hidden;
        }
        .cns-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--green);
          background: rgba(22, 122, 81, 0.08);
          border: 1px solid rgba(22, 122, 81, 0.25);
          padding: 6px 14px;
          border-radius: 999px;
          margin-bottom: 22px;
        }
        .cns-hero-grid {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 56px;
          align-items: center;
        }
        @media (max-width: 900px) {
          .cns-hero-grid { grid-template-columns: 1fr; }
        }
        .cns-h1 {
          font-size: 52px;
          font-weight: 700;
          line-height: 1.06;
          margin: 0 0 22px;
        }
        @media (max-width: 640px) {
          .cns-h1 { font-size: 36px; }
        }
        .cns-h1 span { color: var(--green); }
        .cns-hero-sub {
          font-size: 18px;
          color: var(--ink-soft);
          max-width: 480px;
          margin: 0 0 32px;
        }
        .cns-hero-ctas { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 34px; }
        .cns-hero-proof {
          display: flex;
          gap: 28px;
          flex-wrap: wrap;
        }
        .cns-proof-item { display: flex; align-items: baseline; gap: 8px; }
        .cns-proof-num {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 22px;
          color: var(--ink);
        }
        .cns-proof-label { font-size: 13px; color: var(--ink-faint); }

        /* route visual */
        .cns-route-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 28px 26px 22px;
          position: relative;
        }
        .cns-route-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }
        .cns-route-card-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-faint);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .cns-route-live {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--green);
          font-weight: 600;
        }
        .cns-route-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--green-bright);
        }
        .cns-route-line-svg { width: 100%; height: auto; display: block; margin-bottom: 6px; }
        .cns-route-stops {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .cns-stop {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px dashed var(--line-soft);
        }
        .cns-stop:last-child { border-bottom: none; }
        .cns-stop-icon {
          width: 32px; height: 32px;
          border-radius: 8px;
          background: var(--paper-dim);
          display: flex; align-items: center; justify-content: center;
          color: var(--green);
          flex-shrink: 0;
        }
        .cns-stop-text { font-size: 14.5px; color: var(--ink); font-weight: 500; }
        .cns-stop-driver { font-size: 11.5px; color: var(--ink-faint); }

        /* ---------- SECTION SCAFFOLD ---------- */
        .cns-section { padding: 88px 0; }
        .cns-section-alt { background: var(--surface); }
        .cns-kicker {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--orange);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .cns-h2 {
          font-size: 36px;
          font-weight: 700;
          line-height: 1.15;
          margin: 0 0 18px;
          max-width: 640px;
        }
        @media (max-width: 640px) { .cns-h2 { font-size: 28px; } }
        .cns-section-sub {
          font-size: 16.5px;
          color: var(--ink-soft);
          max-width: 560px;
          margin-bottom: 48px;
        }

        /* divider */
        .cns-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 0;
        }
        .cns-divider-dash {
          flex: 1;
          height: 1px;
          background-image: repeating-linear-gradient(to right, var(--line) 0, var(--line) 6px, transparent 6px, transparent 12px);
        }
        .cns-divider-node { width: 7px; height: 7px; border-radius: 50%; background: var(--green-bright); flex-shrink: 0; }

        /* ---------- PROBLEM ---------- */
        .cns-problem-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        @media (max-width: 640px) { .cns-problem-grid { grid-template-columns: 1fr; } }
        .cns-problem-row {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 16px 18px;
        }
        .cns-problem-icon {
          width: 34px; height: 34px;
          border-radius: 8px;
          background: rgba(225, 99, 30, 0.1);
          color: var(--orange-deep);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .cns-problem-text { font-size: 14.5px; font-weight: 500; }

        .cns-problem-callout {
          margin-top: 36px;
          padding: 22px 24px;
          border-left: 3px solid var(--orange);
          background: rgba(225, 99, 30, 0.06);
          font-size: 16px;
          color: var(--ink);
          font-weight: 500;
        }

        /* ---------- KNOWLEDGE TABLE ---------- */
        .cns-know-list {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--line);
          border-radius: 12px;
          overflow: hidden;
          background: var(--paper);
        }
        .cns-know-row {
          display: grid;
          grid-template-columns: 130px 1fr;
          gap: 18px;
          padding: 18px 22px;
          border-bottom: 1px solid var(--line-soft);
          align-items: center;
        }
        .cns-know-row:last-child { border-bottom: none; }
        @media (max-width: 640px) {
          .cns-know-row { grid-template-columns: 1fr; gap: 6px; }
        }
        .cns-know-who {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--green);
        }
        .cns-know-text { font-size: 15px; color: var(--ink); }
        .cns-know-arrow-row {
          display: flex;
          justify-content: center;
          padding: 18px 0 4px;
          color: var(--ink-faint);
        }
        .cns-know-result {
          text-align: center;
          font-size: 18px;
          font-weight: 600;
          margin-top: 10px;
        }
        .cns-know-result span { color: var(--green); }

        /* ---------- SCENARIOS ---------- */
        .cns-scenario-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 860px) { .cns-scenario-grid { grid-template-columns: 1fr; } }
        .cns-scenario-card {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 26px 24px;
        }
        .cns-scenario-icon {
          width: 40px; height: 40px;
          border-radius: 10px;
          background: var(--surface);
          border: 1px solid var(--line);
          display: flex; align-items: center; justify-content: center;
          color: var(--blue);
          margin-bottom: 18px;
        }
        .cns-scenario-title { font-weight: 600; font-size: 16.5px; margin-bottom: 8px; }
        .cns-scenario-body { font-size: 14.5px; color: var(--ink-soft); }

        /* ---------- ROI CALCULATOR ---------- */
        .cns-roi {
          background: var(--green-deep);
          border-radius: 20px;
          padding: 48px;
          color: #fff;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
        }
        @media (max-width: 860px) {
          .cns-roi { grid-template-columns: 1fr; padding: 32px 24px; }
        }
        .cns-roi-label {
          font-size: 13px;
          color: rgba(255,255,255,0.65);
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
        }
        .cns-roi-value { font-family: 'Space Grotesk', sans-serif; font-weight: 600; }
        .cns-roi-slider-block { margin-bottom: 28px; }
        .cns-roi-slider-block:last-child { margin-bottom: 0; }
        .cns-roi-slider {
          width: 100%;
          accent-color: var(--green-bright);
          height: 4px;
        }
        .cns-roi-stats {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .cns-roi-big {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 44px;
          font-weight: 700;
          line-height: 1;
        }
        .cns-roi-big-label { font-size: 13.5px; color: rgba(255,255,255,0.65); margin-top: 8px; }
        .cns-roi-mini-row { display: flex; gap: 28px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.15); }
        .cns-roi-mini-num { font-size: 20px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; }
        .cns-roi-mini-label { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 2px; }

        /* ---------- ONBOARDING ---------- */
        .cns-onboard-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
          background: var(--surface);
        }
        @media (max-width: 860px) { .cns-onboard-grid { grid-template-columns: 1fr; } }
        .cns-onboard-cell {
          padding: 30px 26px;
          border-right: 1px solid var(--line);
        }
        .cns-onboard-cell:last-child { border-right: none; }
        @media (max-width: 860px) {
          .cns-onboard-cell { border-right: none; border-bottom: 1px solid var(--line); }
          .cns-onboard-cell:last-child { border-bottom: none; }
        }
        .cns-onboard-n {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          color: var(--orange);
          font-weight: 600;
          margin-bottom: 14px;
        }
        .cns-onboard-title { font-weight: 600; font-size: 17px; margin-bottom: 8px; }
        .cns-onboard-body { font-size: 14.5px; color: var(--ink-soft); }
        .cns-onboard-note {
          text-align: center;
          margin-top: 22px;
          font-size: 14px;
          color: var(--ink-faint);
        }

        /* ---------- PROOF BANNER ---------- */
        .cns-proof-banner {
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 44px;
          background: var(--paper-dim);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 32px;
          align-items: center;
        }
        @media (max-width: 780px) {
          .cns-proof-banner { grid-template-columns: 1fr; text-align: left; }
        }
        .cns-proof-banner h3 { font-size: 24px; margin: 0 0 10px; }
        .cns-proof-banner p { font-size: 15px; color: var(--ink-soft); margin: 0; max-width: 480px; }

        /* ---------- FINAL CTA ---------- */
        .cns-final {
          background: var(--green-deep);
          border-radius: 22px;
          padding: 64px 48px;
          text-align: center;
          color: #fff;
        }
        .cns-final h2 { color: #fff; margin: 0 auto 16px; }
        .cns-final p { color: rgba(255,255,255,0.72); max-width: 480px; margin: 0 auto 30px; }
        .cns-final-ctas { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

        /* ---------- FOOTER ---------- */
        .cns-footer {
          background: var(--green-deep);
          color: rgba(255,255,255,0.6);
          padding: 40px 0;
          font-size: 13.5px;
        }
        .cns-footer-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .cns-footer-brand { color: #fff; font-weight: 600; font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      {/* ---------------- NAV ---------------- */}
      <header className="cns-nav">
        <div className="cns-wrap cns-nav-inner">
          <div className="cns-brand">
            <div className="cns-brand-mark">
              <RouteIcon size={19} color="#fff" strokeWidth={2.4} />
            </div>
            <div>
              <div className="cns-brand-word cns-display">CNS</div>
              <div className="cns-brand-tag">Delivery knowledge</div>
            </div>
          </div>

          <nav className="cns-nav-links">
            <a href="#problem">The problem</a>
            <a href="#how-it-works">How it works</a>
            <a href="#roi">ROI</a>
            <a href="#onboarding">Getting started</a>
          </nav>

          <div className="cns-nav-actions">
            <a href="#cta" className="cns-btn cns-btn-primary">
              Book a free trial <ArrowRight size={15} />
            </a>
            <button className="cns-nav-toggle" onClick={() => setNavOpen(!navOpen)} aria-label="Toggle menu">
              {navOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {navOpen && (
          <div className="cns-mobile-menu">
            <div className="cns-wrap">
              <a href="#problem" onClick={() => setNavOpen(false)}>The problem</a>
              <a href="#how-it-works" onClick={() => setNavOpen(false)}>How it works</a>
              <a href="#roi" onClick={() => setNavOpen(false)}>ROI</a>
              <a href="#onboarding" onClick={() => setNavOpen(false)}>Getting started</a>
            </div>
          </div>
        )}
      </header>

      {/* ---------------- HERO ---------------- */}
      <section className="cns-hero">
        <div className="cns-wrap cns-hero-grid">
          <div>
            <div className="cns-eyebrow">
              <Truck size={13} /> Built for delivery fleets
            </div>
            <h1 className="cns-h1 cns-display">
              Every driver.<br />Every customer.<br /><span>Every time.</span>
            </h1>
            <p className="cns-hero-sub">
              Give every driver the experience of your entire fleet. CNS captures what
              your best drivers already know — the right dock, the right entrance, the
              right way in — and puts it in front of whoever's behind the wheel.
            </p>
            <div className="cns-hero-ctas">
              <a href="#cta" className="cns-btn cns-btn-primary">
                Book a free trial <ArrowRight size={15} />
              </a>
              <a href="#how-it-works" className="cns-btn cns-btn-ghost">
                See how it works
              </a>
            </div>
            <div className="cns-hero-proof">
              <div className="cns-proof-item">
                <span className="cns-proof-num cns-mono">20 min</span>
                <span className="cns-proof-label">to break even, per driver, per month</span>
              </div>
              <div className="cns-proof-item">
                <span className="cns-proof-num cns-mono">$0</span>
                <span className="cns-proof-label">setup, mapping, or implementation cost</span>
              </div>
            </div>
          </div>

          <div className="cns-route-card">
            <div className="cns-route-card-top">
              <span className="cns-route-card-title">Route 14 &middot; Riverside industrial</span>
              <span className="cns-route-live"><span className="cns-route-dot" /> Live knowledge</span>
            </div>
            <svg className="cns-route-line-svg" viewBox="0 0 340 36" fill="none">
              <path d="M8 28 C 60 8, 100 8, 150 20 S 240 32, 332 10" stroke="#DBD7C9" strokeWidth="2" strokeDasharray="1 8" strokeLinecap="round" />
              <circle cx="8" cy="28" r="4" fill="#2FAE73" />
              <circle cx="150" cy="20" r="4" fill="#2C77A6" />
              <circle cx="332" cy="10" r="4" fill="#E1631E" />
            </svg>
            <div className="cns-route-stops">
              {ROUTE_STOPS.map((s, i) => (
                <div className="cns-stop" key={i}>
                  <div className="cns-stop-icon"><s.icon size={16} /></div>
                  <div>
                    <div className="cns-stop-text">{s.label}</div>
                    <div className="cns-stop-driver cns-mono">learned once &middot; known by all</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- PROBLEM ---------------- */}
      <section className="cns-section" id="problem">
        <div className="cns-wrap">
          <div className="cns-kicker">The problem</div>
          <h2 className="cns-h2 cns-display">Every time a driver has to ask, your business loses time.</h2>
          <p className="cns-section-sub">
            Individually, these are small delays. Across a fleet, every day, they add
            up to a slower operation, a busier dispatch desk, and a delivery experience
            that changes depending on who shows up.
          </p>

          <div className="cns-problem-grid">
            {PROBLEM_ITEMS.map((p, i) => (
              <div className="cns-problem-row" key={i}>
                <div className="cns-problem-icon"><p.icon size={17} /></div>
                <div className="cns-problem-text">{p.text}</div>
              </div>
            ))}
          </div>

          <div className="cns-problem-callout">
            The information to prevent these delays already exists. It's just scattered
            across your workforce — one driver at a time.
          </div>
        </div>
      </section>

      <div className="cns-wrap"><div className="cns-divider"><div className="cns-divider-dash" /><div className="cns-divider-node" /><div className="cns-divider-dash" /></div></div>

      {/* ---------------- ONE DRIVER'S EXPERIENCE ---------------- */}
      <section className="cns-section" id="how-it-works">
        <div className="cns-wrap">
          <div className="cns-kicker">How it works</div>
          <h2 className="cns-h2 cns-display">One driver's experience becomes everyone's.</h2>
          <p className="cns-section-sub">
            Right now, this knowledge lives in four different heads. CNS brings it into
            one place, so the next driver on this route starts where the last one left off.
          </p>

          <div className="cns-know-list">
            {KNOWLEDGE_ROWS.map((k, i) => (
              <div className="cns-know-row" key={i}>
                <span className="cns-know-who">{k.who}</span>
                <span className="cns-know-text">{k.knows}</span>
              </div>
            ))}
          </div>
          <div className="cns-know-arrow-row"><ArrowRight size={18} /></div>
          <div className="cns-know-result">
            Every driver arrives knowing what took years to learn <span>— on day one.</span>
          </div>
        </div>
      </section>

      {/* ---------------- SCENARIOS ---------------- */}
      <section className="cns-section cns-section-alt">
        <div className="cns-wrap">
          <div className="cns-kicker">Any driver, any route, any time</div>
          <h2 className="cns-h2 cns-display">Stop managing around people's memory.</h2>
          <p className="cns-section-sub">
            Start managing around information you can actually rely on — whoever's driving today.
          </p>

          <div className="cns-scenario-grid">
            {SCENARIOS.map((s, i) => (
              <div className="cns-scenario-card" key={i}>
                <div className="cns-scenario-icon"><s.icon size={19} /></div>
                <div className="cns-scenario-title">{s.title}</div>
                <div className="cns-scenario-body">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- ROI CALCULATOR ---------------- */}
      <section className="cns-section" id="roi">
        <div className="cns-wrap">
          <div className="cns-kicker">The math</div>
          <h2 className="cns-h2 cns-display">A driver only needs to save 20 minutes a month.</h2>
          <p className="cns-section-sub">
            CNS costs $9.99 per driver, per month. The average driver works around
            10,000 minutes a month. Everything saved past the first 20 is pure
            productivity. Adjust the numbers for your own fleet below.
          </p>

          <div className="cns-roi">
            <div>
              <div className="cns-roi-slider-block">
                <div className="cns-roi-label">
                  <span>Drivers on your fleet</span>
                  <span className="cns-roi-value cns-mono">{driverCount}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={200}
                  value={driverCount}
                  onChange={(e) => setDriverCount(Number(e.target.value))}
                  className="cns-roi-slider"
                />
              </div>
              <div className="cns-roi-slider-block">
                <div className="cns-roi-label">
                  <span>Minutes saved per driver, per day</span>
                  <span className="cns-roi-value cns-mono">{minutesSaved} min</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={90}
                  value={minutesSaved}
                  onChange={(e) => setMinutesSaved(Number(e.target.value))}
                  className="cns-roi-slider"
                />
              </div>
              <div className="cns-roi-mini-row">
                <div>
                  <div className="cns-roi-mini-num cns-mono">${monthlyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  <div className="cns-roi-mini-label">Monthly cost, whole fleet</div>
                </div>
                <div>
                  <div className="cns-roi-mini-num cns-mono">{breakEvenMinutes} min</div>
                  <div className="cns-roi-mini-label">Needed to break even</div>
                </div>
              </div>
            </div>

            <div className="cns-roi-stats">
              <div>
                <div className="cns-roi-big cns-mono">{monthlyHoursSaved.toLocaleString()} hrs</div>
                <div className="cns-roi-big-label">Estimated driver time saved across your fleet, every month</div>
              </div>
              <div>
                <div className="cns-roi-big cns-mono">
                  {surplusMinutes > 0 ? `${surplusMinutes} min` : "0 min"}
                </div>
                <div className="cns-roi-big-label">Pure productivity gain, per driver, per day, above break-even</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="cns-wrap"><div className="cns-divider"><div className="cns-divider-dash" /><div className="cns-divider-node" /><div className="cns-divider-dash" /></div></div>

      {/* ---------------- ONBOARDING ---------------- */}
      <section className="cns-section" id="onboarding">
        <div className="cns-wrap">
          <div className="cns-kicker">Getting started</div>
          <h2 className="cns-h2 cns-display">We build your knowledge base with you.</h2>
          <p className="cns-section-sub">
            No implementation fees. No setup fees. No mapping costs. Your drivers keep
            doing what they've always done — we capture it as they go.
          </p>

          <div className="cns-onboard-grid">
            {ONBOARD_STEPS.map((s, i) => (
              <div className="cns-onboard-cell" key={i}>
                <div className="cns-onboard-n cns-mono">{s.n}</div>
                <div className="cns-onboard-title">{s.title}</div>
                <div className="cns-onboard-body">{s.body}</div>
              </div>
            ))}
          </div>
          <div className="cns-onboard-note">You subscribe. You start using it. That's the whole process.</div>
        </div>
      </section>

      {/* ---------------- PROOF BANNER ---------------- */}
      <section className="cns-section cns-section-alt">
        <div className="cns-wrap">
          <div className="cns-proof-banner">
            <div>
              <h3 className="cns-display">We'll prove it on your own routes.</h3>
              <p>
                We'll map one of your existing runs and hand it to a driver who's
                never done it before. No special preparation, no chosen route —
                just your customers, your streets, and CNS.
              </p>
            </div>
            <a href="#cta" className="cns-btn cns-btn-dark">
              Request a live demo <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- FINAL CTA ---------------- */}
      <section className="cns-section" id="cta">
        <div className="cns-wrap">
          <div className="cns-final">
            <div className="cns-kicker" style={{ color: "var(--green-bright)" }}>Ready when you are</div>
            <h2 className="cns-h2 cns-display">
              Give every driver the experience of your best driver.
            </h2>
            <p>
              Most logistics software manages deliveries. CNS manages the knowledge
              behind them — so your business never loses it.
            </p>
            <div className="cns-final-ctas">
              <a href="#" className="cns-btn cns-btn-primary">
                Book a free trial <ArrowRight size={15} />
              </a>
              <a href="#" className="cns-btn cns-btn-ghost" style={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}>
                Talk to our team
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="cns-footer">
        <div className="cns-wrap cns-footer-inner">
          <span className="cns-footer-brand">CNS</span>
          <span>Delivery knowledge, shared across every driver.</span>
          <span>&copy; {new Date().getFullYear()} CNS. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}