import React, { useEffect, useRef, useState } from "react";
import {
  Phone,
  PhoneCall,
  MapPin,
  Clock,
  Users,
  UserPlus,
  UserX,
  Frown,
  Store,
  Package,
  Ban,
  CalendarDays,
  GraduationCap,
  DollarSign,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Route,
  Navigation,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  ClipboardList,
  TrendingUp,
  Timer,
} from "lucide-react";

/* ---------- reveal-on-scroll hook ---------- */
function useReveal(threshold = 0.18) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ---------- small reusable logomark (recreates the pin/road motif) ---------- */
function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="pinGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#17AFC8" />
          <stop offset="100%" stopColor="#2FA84C" />
        </linearGradient>
      </defs>
      <path
        d="M32 2C18 2 7 13 7 27c0 18 25 35 25 35s25-17 25-35C57 13 46 2 32 2Z"
        fill="url(#pinGrad)"
      />
      <path
        d="M13 30c6 3 10 3 19-3s16-1 19 2"
        stroke="#F7FAF9"
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      <circle cx="44" cy="16" r="7" fill="#F3811E" />
      <circle cx="44" cy="16" r="2.3" fill="#F7FAF9" />
    </svg>
  );
}

/* ---------- section wrapper with spine pin + fade/slide reveal ---------- */
function SectionBlock({ id, eyebrow, title, tone = "light", children }) {
  const [ref, visible] = useReveal();
  return (
    <section id={id} ref={ref} className={`sb tone-${tone} ${visible ? "is-visible" : ""}`}>
      <div className="sb-spine" aria-hidden="true">
        <span className="sb-pin" />
        <span className="sb-line" />
      </div>
      <div className="sb-content">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        {title && <h2 className="sb-title">{title}</h2>}
        {children}
      </div>
    </section>
  );
}

function IconRow({ icon: Icon, children }) {
  return (
    <li className="icon-row">
      <span className="icon-row-badge">
        <Icon size={16} strokeWidth={2.4} />
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function CNSLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="cns">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');

        .cns {
          --teal-deep: #073B4C;
          --teal: #0E7C90;
          --teal-bright: #17AFC8;
          --green: #2FA84C;
          --green-deep: #1B6B34;
          --orange: #F3811E;
          --orange-soft: #FFB25E;
          --paper: #F7FAF9;
          --paper-alt: #EBF4F1;
          --ink: #0B2A2E;
          --ink-soft: #4C6B6C;
          --line: #D8E6E2;
          --radius: 16px;
          font-family: 'Inter', -apple-system, sans-serif;
          color: var(--ink);
          background: var(--paper);
        }
        .cns * { box-sizing: border-box; }
        .cns h1, .cns h2, .cns h3 {
          font-family: 'Space Grotesk', 'Inter', sans-serif;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .cns p { line-height: 1.65; color: var(--ink-soft); margin: 0 0 14px; }
        .cns ul { list-style: none; margin: 0; padding: 0; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        /* ---------- nav ---------- */
        /* Fixed dark glass bar at all times — text color never swaps on scroll,
           only the backdrop opacity/blur deepens. This avoids any flash/disappear
           issue that comes from cross-fading text color against a changing bg. */
        .nav {
          position: sticky; top: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          gap: 20px;
          padding: 16px 28px;
          background: rgba(7,59,76,0.32);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          transition: background 0.35s ease, padding 0.35s ease, box-shadow 0.35s ease;
        }
        .nav.scrolled {
          background: rgba(6,42,54,0.82);
          box-shadow: 0 10px 26px -16px rgba(0,0,0,0.45);
          padding: 11px 28px;
        }
        .nav-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.05rem; color: #fff; flex-shrink: 0; }
        .nav-brand small { display:block; font-size: 0.62rem; font-weight: 600; letter-spacing: 0.14em; color: rgba(255,255,255,0.72); text-transform: uppercase; }
        .nav-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; margin-left: auto; }
        .btn-text { background: transparent; color: rgba(255,255,255,0.9); padding: 9px 14px; }
        .btn-text:hover { color: var(--orange-soft); transform: none; }
        @media (max-width: 520px) { .btn-text { display: none; } }
        .btn {
          border: none; cursor: pointer; font-family: inherit; font-weight: 600;
          border-radius: 999px; padding: 12px 24px; font-size: 0.92rem;
          display: inline-flex; align-items: center; gap: 8px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }
        .btn-primary {
          background: linear-gradient(120deg, var(--orange), var(--orange-soft));
          color: #fff; box-shadow: 0 8px 24px -8px rgba(243,129,30,0.65);
        }
        .btn-primary:hover { transform: translateY(-2px); filter: brightness(1.05); }
        .btn-ghost { background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,0.5); }
        .btn-ghost:hover { background: rgba(255,255,255,0.12); }
        .btn-sm { padding: 9px 18px; font-size: 0.82rem; }
        .btn-lg { padding: 15px 32px; font-size: 1rem; }

        /* ---------- hero ---------- */
        .hero {
          position: relative;
          min-height: 92vh;
          display: flex; flex-direction: column; justify-content: center;
          padding: 110px 28px 70px;
          background: linear-gradient(160deg, var(--teal-deep) 0%, var(--teal) 46%, var(--green-deep) 100%);
          background-size: 220% 220%;
          animation: heroShift 16s ease infinite;
          color: #fff;
          overflow: hidden;
          border-radius: 0 0 44px 44px;
        }
        @keyframes heroShift {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 60%; }
          100% { background-position: 0% 0%; }
        }

        .hero-grid {
          position: absolute; inset: 0; z-index: 0;
          background-image: radial-gradient(rgba(255,255,255,0.14) 1.4px, transparent 1.4px);
          background-size: 28px 28px;
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 78%);
          mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 78%);
        }
        .hero-orbs { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
        .orb { position: absolute; border-radius: 50%; filter: blur(70px); }
        .orb-a { width: 380px; height: 380px; background: var(--teal-bright); opacity: 0.5; top: -120px; left: -100px; animation: floatA 13s ease-in-out infinite; }
        .orb-b { width: 320px; height: 320px; background: var(--green); opacity: 0.45; bottom: -140px; right: 4%; animation: floatB 15s ease-in-out infinite; }
        .orb-c { width: 220px; height: 220px; background: var(--orange); opacity: 0.35; top: 34%; right: -70px; animation: floatC 10s ease-in-out infinite; }
        @keyframes floatA { 0%,100% { transform: translate(0,0); } 50% { transform: translate(40px, 30px); } }
        @keyframes floatB { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-30px, -40px); } }
        @keyframes floatC { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-24px, 26px); } }

        .hero-inner-split {
          position: relative; z-index: 2;
          max-width: 1160px; margin: 0 auto; width: 100%;
          display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 30px; align-items: center;
        }
        .hero-copy { text-align: left; }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25);
          padding: 7px 16px; border-radius: 999px; font-size: 0.78rem; font-weight: 600;
          letter-spacing: 0.04em; margin-bottom: 24px;
        }
        .hero h1 {
          font-size: clamp(2.1rem, 4.2vw, 3.3rem);
          font-weight: 700; line-height: 1.08; margin-bottom: 16px;
        }
        .hero h2 {
          font-family: 'Inter', sans-serif; font-weight: 500;
          font-size: clamp(1.02rem, 1.8vw, 1.22rem);
          color: rgba(255,255,255,0.88); margin-bottom: 20px;
        }
        .hero p { color: rgba(255,255,255,0.78); max-width: 520px; margin: 0 0 10px; }
        .hero-ctas { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 26px; }

        .hero-trust { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-top: 38px; }
        .trust-item { display: flex; flex-direction: column; gap: 2px; }
        .trust-num { font-size: 1.08rem; font-weight: 700; color: #fff; }
        .trust-label { font-size: 0.7rem; color: rgba(255,255,255,0.65); }
        .trust-divider { width: 1px; height: 30px; background: rgba(255,255,255,0.22); }

        /* right-side floating knowledge visual */
        .hero-visual { position: relative; height: 420px; display: block; }
        .hero-orbit-road { position: absolute; inset: 0; animation: spin 44s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .hero-pin-glow {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
          filter: drop-shadow(0 0 46px rgba(23,175,200,0.6));
          animation: floatPin 5s ease-in-out infinite;
        }
        @keyframes floatPin {
          0%,100% { transform: translate(-50%,-50%) translateY(0); }
          50% { transform: translate(-50%,-50%) translateY(-14px); }
        }
        .knowledge-card {
          position: absolute; background: rgba(255,255,255,0.97); color: var(--ink);
          padding: 10px 14px; border-radius: 12px; font-size: 0.76rem; font-weight: 600;
          display: flex; align-items: center; gap: 8px; max-width: 190px;
          box-shadow: 0 16px 32px -14px rgba(7,59,76,0.55);
          animation: cardFloat 6s ease-in-out infinite;
        }
        .knowledge-card svg { color: var(--teal); flex-shrink: 0; }
        .card-1 { top: 2%; left: 0%; animation-delay: 0s; }
        .card-2 { top: 26%; right: -2%; animation-delay: 1.3s; }
        .card-3 { bottom: 20%; left: -4%; animation-delay: 2.4s; }
        .card-4 { bottom: 0%; right: 6%; animation-delay: 0.7s; }
        @keyframes cardFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }

        .hero-scroll-cue {
          position: relative; z-index: 2; margin: 46px auto 0;
          width: 30px; height: 46px; border: 2px solid rgba(255,255,255,0.5); border-radius: 999px;
          background: transparent; cursor: pointer; display: block;
        }
        .hero-scroll-cue span {
          position: absolute; top: 8px; left: 50%; width: 4px; height: 8px;
          background: #fff; border-radius: 2px; transform: translateX(-50%);
          animation: scrollCue 1.6s ease infinite;
        }
        @keyframes scrollCue { 0% { opacity: 1; top: 8px; } 100% { opacity: 0; top: 24px; } }

        @media (max-width: 960px) {
          .hero-inner-split { grid-template-columns: 1fr; text-align: center; }
          .hero-copy { text-align: center; }
          .hero p { margin-left: auto; margin-right: auto; }
          .hero-ctas, .hero-trust { justify-content: center; }
          .hero-visual { display: none; }
        }

        /* ---------- section framework ---------- */
        .sb { position: relative; padding: 76px 28px 76px 96px; }
        .tone-light { background: var(--paper); }
        .tone-alt { background: var(--paper-alt); }
        .tone-dark {
          background: linear-gradient(135deg, var(--teal-deep), #0a5c73 60%, var(--green-deep));
          color: #fff;
        }
        .tone-dark p { color: rgba(255,255,255,0.8); }
        .tone-dark .eyebrow { color: var(--orange-soft); }
        .tone-dark .sb-title { color: #fff; }

        .sb-spine { position: absolute; left: 40px; top: 0; bottom: 0; width: 3px; }
        .sb-line {
          position: absolute; left: 0; top: 0; width: 100%; height: 0%;
          background: linear-gradient(180deg, var(--teal-bright), var(--green));
          border-radius: 3px;
          transition: height 1.1s cubic-bezier(.2,.7,.3,1);
        }
        .tone-dark .sb-line { background: linear-gradient(180deg, var(--orange-soft), #fff); }
        .is-visible .sb-line { height: 100%; }
        .sb-pin {
          position: absolute; left: 50%; top: 44px; width: 13px; height: 13px;
          background: var(--orange); border-radius: 50%; transform: translateX(-50%) scale(0);
          box-shadow: 0 0 0 5px rgba(243,129,30,0.18);
        }
        .is-visible .sb-pin { animation: pinPop 0.6s cubic-bezier(.3,1.6,.4,1) 0.15s forwards; }
        @keyframes pinPop {
          0% { transform: translateX(-50%) scale(0); }
          60% { transform: translateX(-50%) scale(1.3); }
          100% { transform: translateX(-50%) scale(1); }
        }

        .sb-content {
          max-width: 760px; margin: 0 auto;
          opacity: 0; transform: translateY(18px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .is-visible .sb-content { opacity: 1; transform: translateY(0); }

        .eyebrow {
          font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; font-weight: 600;
          letter-spacing: 0.14em; text-transform: uppercase; color: var(--orange);
          margin-bottom: 12px;
        }
        .sb-title {
          font-size: clamp(1.5rem, 3vw, 2.15rem); font-weight: 700; margin-bottom: 18px;
        }

        /* ---------- icon list rows ---------- */
        .icon-row { display: flex; align-items: flex-start; gap: 12px; padding: 9px 0; color: var(--ink); font-size: 0.98rem; }
        .icon-row-badge {
          flex-shrink: 0; width: 30px; height: 30px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          background: var(--paper-alt); color: var(--teal);
        }
        .tone-alt .icon-row-badge { background: #fff; }
        .tone-dark .icon-row { color: rgba(255,255,255,0.92); }
        .tone-dark .icon-row-badge { background: rgba(255,255,255,0.14); color: var(--orange-soft); }

        .lead { font-size: 1.08rem; color: var(--ink); font-weight: 500; }
        .divider-line { border: none; border-top: 1px dashed var(--line); margin: 26px 0; }

        .callout {
          background: #fff; border: 1px solid var(--line); border-left: 4px solid var(--orange);
          border-radius: 12px; padding: 18px 20px; margin-top: 20px; font-weight: 600; color: var(--ink);
        }
        .tone-alt .callout { background: var(--paper); }

        /* ---------- card grids ---------- */
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px; }
        .fee-card {
          background: #fff; border-radius: var(--radius); padding: 22px 18px; text-align: center;
          border: 1px solid var(--line); transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .fee-card:hover { transform: translateY(-5px); box-shadow: 0 16px 30px -18px rgba(11,42,46,0.35); }
        .fee-card .badge {
          width: 42px; height: 42px; border-radius: 50%; margin: 0 auto 12px;
          background: linear-gradient(135deg, var(--teal-bright), var(--green));
          display: flex; align-items: center; justify-content: center; color: #fff;
        }
        .fee-card strong { display: block; font-size: 0.98rem; }

        /* ---------- speech-bubble question list (echoes the logo's 'P' bubble) ---------- */
        .bubble-list { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }
        .bubble {
          position: relative; background: #fff; border: 1px solid var(--line);
          border-left: 3px solid var(--teal-bright);
          border-radius: 4px 16px 16px 16px; padding: 14px 18px;
          display: flex; align-items: center; gap: 10px; font-weight: 500; color: var(--ink);
          max-width: 88%;
        }
        .bubble:nth-child(even) { margin-left: auto; border-left: none; border-right: 3px solid var(--orange); border-radius: 16px 4px 16px 16px; }
        .bubble svg { flex-shrink: 0; color: var(--teal); }
        .bubble:nth-child(even) svg { color: var(--orange); }

        /* ---------- ROI visual ---------- */
        .roi-visual { margin-top: 30px; }
        .roi-stats { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; margin-bottom: 34px; }
        .roi-stat { text-align: left; }
        .roi-num { display: block; font-family: 'Space Grotesk', sans-serif; font-size: 2.6rem; font-weight: 700; line-height: 1; color: #fff; }
        .roi-stat-accent .roi-num { color: var(--orange-soft); }
        .roi-label { font-size: 0.82rem; color: rgba(255,255,255,0.7); }
        .roi-arrow { color: rgba(255,255,255,0.5); }

        .roi-bar { position: relative; width: 100%; height: 14px; background: rgba(255,255,255,0.15); border-radius: 999px; margin-top: 46px; overflow: visible; }
        .roi-bar-fill {
          position: absolute; left: 0; top: 0; bottom: 0; width: 0%;
          min-width: 6px; background: linear-gradient(90deg, var(--orange), var(--orange-soft));
          border-radius: 999px; box-shadow: 0 0 14px rgba(243,129,30,0.75);
          transition: width 1.4s cubic-bezier(.2,.7,.3,1);
          animation: pulseGlow 2.4s ease-in-out infinite;
        }
        .is-visible .roi-bar-fill { width: 0.9%; }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(243,129,30,0.55); }
          50% { box-shadow: 0 0 20px rgba(243,129,30,0.95); }
        }
        .roi-bar-pointer { position: absolute; left: 0.9%; top: -38px; transform: translateX(-8px); display: flex; flex-direction: column; align-items: flex-start; }
        .roi-bar-pointer-label { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--orange-soft); white-space: nowrap; margin-bottom: 4px; }
        .roi-bar-pointer-line { width: 2px; height: 16px; background: var(--orange-soft); }
        .roi-bar-caption { margin-top: 44px; font-size: 0.85rem; color: rgba(255,255,255,0.6); }
        .roi-extra { margin-top: 30px; }

        /* ---------- prove-it negation list ---------- */
        .neg-list { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
        .neg-item { display: flex; align-items: center; gap: 10px; color: var(--ink-soft); font-size: 0.98rem; }
        .neg-item.positive { color: var(--ink); font-weight: 600; }
        .neg-item svg { flex-shrink: 0; }
        .neg-item svg.muted { color: #B9C9C6; }
        .neg-item svg.accent { color: var(--green); }

        /* ---------- footer ---------- */
        .footer {
          background: linear-gradient(160deg, var(--green-deep) 0%, var(--teal) 55%, var(--teal-deep) 100%);
          color: #fff; text-align: center; padding: 90px 28px 60px; border-radius: 40px 40px 0 0;
          position: relative; overflow: hidden;
        }
        .footer-inner { max-width: 640px; margin: 0 auto; position: relative; z-index: 2; }
        .footer h2 { font-size: clamp(1.5rem, 3.4vw, 2.2rem); margin-bottom: 16px; }
        .footer p { color: rgba(255,255,255,0.82); }
        .footer-mark { margin-bottom: 22px; display: flex; justify-content: center; }
        .footer-fine { margin-top: 40px; font-size: 0.78rem; color: rgba(255,255,255,0.5); }

        /* ---------- responsive ---------- */
        @media (max-width: 760px) {
          .sb { padding: 56px 20px 56px 20px; }
          .sb-spine { display: none; }
          .grid-3 { grid-template-columns: 1fr; }
          .bubble, .bubble:nth-child(even) { max-width: 100%; margin-left: 0; }
          .roi-stats { gap: 14px; }
          .hero { border-radius: 0 0 26px 26px; padding-bottom: 90px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cns * { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* NAV */}
      <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-brand">
          <LogoMark size={32} />
          <span>
            CNS
            <small>Courier Navigator System</small>
          </span>
        </div>
        <div className="nav-actions">
          <button className="btn btn-text">Login</button>
          <button className="btn btn-sm btn-primary">Sign Up</button>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-orbs" aria-hidden="true">
          <span className="orb orb-a" />
          <span className="orb orb-b" />
          <span className="orb orb-c" />
        </div>

        <div className="hero-inner-split">
          <div className="hero-copy">
            <div className="hero-badge">
              <Sparkles size={14} /> Every driver, instantly experienced
            </div>
            <h1>Every Driver. Every Customer. Every Time.</h1>
            <h2>Give every driver the experience of your entire fleet.</h2>
            <p>
              Every experienced driver builds valuable knowledge over years of deliveries — where
              to go, how each customer prefers deliveries to be handled, and the fastest way to
              get the job done.
            </p>
            <p>
              CNS captures that knowledge and makes it instantly available to every driver,
              reducing wasted time, simplifying operations, and delivering a more consistent
              customer experience.
            </p>
            <div className="hero-ctas">
              <button className="btn btn-primary btn-lg">
                Book a Free Trial <ArrowRight size={18} />
              </button>
            </div>
            <div className="hero-trust">
              <div className="trust-item">
                <span className="trust-num mono">$9.99</span>
                <span className="trust-label">per driver / month</span>
              </div>
              <div className="trust-divider" />
              <div className="trust-item">
                <span className="trust-num mono">20 min</span>
                <span className="trust-label">to break even</span>
              </div>
              <div className="trust-divider" />
              <div className="trust-item">
                <span className="trust-num mono">$0</span>
                <span className="trust-label">setup or mapping fees</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <svg className="hero-orbit-road" viewBox="0 0 400 400">
              <circle cx="200" cy="200" r="150" fill="none" stroke="rgba(255,255,255,0.28)" strokeDasharray="6 10" />
            </svg>
            <div className="hero-pin-glow">
              <LogoMark size={116} />
            </div>
            <div className="knowledge-card card-1"><MapPin size={14} /> Rear loading dock, gate 3</div>
            <div className="knowledge-card card-2"><Package size={14} /> Leave with concierge, ask for Sam</div>
            <div className="knowledge-card card-3"><Ban size={14} /> Skip reception — too slow</div>
            <div className="knowledge-card card-4"><Navigation size={14} /> Enter via loading bay, not front</div>
          </div>
        </div>

        <button
          className="hero-scroll-cue"
          aria-label="Scroll to learn more"
          onClick={() => document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" })}
        >
          <span />
        </button>
      </header>

      {/* THE PROBLEM */}
      <SectionBlock id="problem" eyebrow="The Problem" title="Every time a driver has to ask, your business loses time.">
        <ul>
          <IconRow icon={Phone}>Every phone call to dispatch.</IconRow>
          <IconRow icon={PhoneCall}>Every call to a customer.</IconRow>
          <IconRow icon={MapPin}>Every minute spent looking for the right delivery point.</IconRow>
          <IconRow icon={UserX}>Every experienced driver interrupted for directions.</IconRow>
        </ul>
        <p style={{ marginTop: 18 }}>
          Individually, they're small delays. Collectively, they create a slower, more difficult
          delivery operation.
        </p>
        <ul>
          <IconRow icon={Frown}>Drivers become frustrated.</IconRow>
          <IconRow icon={Clock}>Dispatch spends time solving navigation problems instead of managing deliveries.</IconRow>
          <IconRow icon={Route}>Covering routes becomes harder.</IconRow>
          <IconRow icon={UserPlus}>New drivers take longer to become productive.</IconRow>
          <IconRow icon={Users}>Customers receive an inconsistent delivery experience.</IconRow>
        </ul>
        <p style={{ marginTop: 18 }}>
          The information to prevent these delays already exists — but it's scattered across your
          workforce.
        </p>
        <ul>
          <IconRow icon={Store}>One driver knows the correct loading dock for a customer.</IconRow>
          <IconRow icon={Navigation}>Another knows the quickest entrance.</IconRow>
          <IconRow icon={Package}>Someone else knows the customer prefers deliveries taken directly to their storage room.</IconRow>
          <IconRow icon={Ban}>Another driver knows not to use reception because it slows everything down.</IconRow>
        </ul>
        <p style={{ marginTop: 18 }}>
          Every driver builds knowledge through experience, but that knowledge is rarely
          documented, shared, or accessible to the rest of the team.
        </p>
        <p>As a result, drivers keep solving the same problems over and over again.</p>
        <div className="callout">
          CNS brings all of that knowledge together into one place, giving every driver access to
          the experience of the entire fleet before they even arrive.
        </div>
      </SectionBlock>

      {/* SHARED KNOWLEDGE */}
      <SectionBlock id="shared" tone="alt" eyebrow="The Shift" title="One driver's experience becomes everyone's experience.">
        <p className="lead">Every delivery completed using CNS makes your business smarter.</p>
        <p>
          Instead of each driver learning customers independently, every driver contributes to a
          shared knowledge base that benefits the entire fleet.
        </p>
        <p>
          When one driver discovers a better entrance, safer parking location, or a faster delivery
          process, everyone benefits immediately.
        </p>
        <ul>
          <IconRow icon={CheckCircle2}>No repeated mistakes.</IconRow>
          <IconRow icon={CheckCircle2}>No relearning the same customer.</IconRow>
          <IconRow icon={CheckCircle2}>No relying on "the driver who knows that run."</IconRow>
        </ul>
      </SectionBlock>

      {/* ANY DRIVER ANY ROUTE */}
      <SectionBlock id="any-driver" title="Any Driver. Any Route. Any Time.">
        <ul>
          <IconRow icon={CalendarDays}>A driver calls in sick.</IconRow>
          <IconRow icon={CalendarDays}>Someone goes on annual leave.</IconRow>
          <IconRow icon={UserPlus}>A new employee starts next week.</IconRow>
        </ul>
        <p style={{ marginTop: 18 }}>
          Normally, this means rearranging delivery runs around whoever knows the customers.
        </p>
        <p>
          With CNS, any driver can confidently take over a route they've never driven before
          because every customer instruction is already available.
        </p>
        <div className="callout">
          You're no longer managing around people's memory. You're managing around accurate
          information.
        </div>
      </SectionBlock>

      {/* ELIMINATE TRAINING COST */}
      <SectionBlock id="training" tone="dark" eyebrow="Onboarding" title="Eliminate the cost of driver training.">
        <p>
          Traditional driver training means riding with experienced drivers, asking questions,
          making mistakes, and gradually learning hundreds of customer locations.
        </p>
        <p>With CNS, that knowledge already exists.</p>
        <p>
          If a driver knows how to drive, understands the job, and can follow instructions, they
          already have access to the information they need for every customer.
        </p>
        <p>
          Instead of spending days or weeks learning routes, your experienced drivers simply do
          what they've always done — while CNS captures that knowledge for everyone else.
        </p>
        <ul>
          <IconRow icon={GraduationCap}>Less training.</IconRow>
          <IconRow icon={DollarSign}>Lower costs.</IconRow>
          <IconRow icon={Zap}>Drivers become productive faster.</IconRow>
        </ul>
        <p style={{ marginTop: 10 }}>
          Training becomes faster, more consistent, and significantly less expensive.
        </p>
      </SectionBlock>

      {/* LESS FRUSTRATION */}
      <SectionBlock id="frustration" tone="alt" title="Less frustration. Better drivers.">
        <p>
          Drivers don't enjoy wasting time trying to find the correct delivery location, searching
          for the right entrance, or walking around unfamiliar locations looking for where the
          delivery actually needs to go.
        </p>
        <p>
          They don't enjoy calling dispatch. They don't enjoy interrupting other drivers. They
          don't enjoy ringing customers just to ask where the delivery entrance is.
        </p>
        <p>
          CNS removes that frustration by putting the correct information in front of them before
          they arrive.
        </p>
        <div className="callout">
          Confident drivers work more efficiently. Less stress leads to better customer
          interactions and more consistent service.
        </div>
      </SectionBlock>

      {/* CONSISTENT EXPERIENCE */}
      <SectionBlock id="consistent" title="Consistent Customer Experience">
        <p className="lead">Your customers shouldn't notice when a different driver turns up.</p>
        <p>
          Whether it's your most experienced driver or someone covering the run for the first
          time, the delivery experience should remain exactly the same.
        </p>
        <p>
          CNS helps standardize every delivery so customers receive the same level of service
          every time.
        </p>
      </SectionBlock>

      {/* BUILD KNOWLEDGE BASE */}
      <SectionBlock id="setup" tone="alt" eyebrow="Getting Started" title="We build your knowledge base with you.">
        <div className="grid-3">
          <div className="fee-card">
            <div className="badge"><CheckCircle2 size={20} /></div>
            <strong>No implementation fees.</strong>
          </div>
          <div className="fee-card">
            <div className="badge"><CheckCircle2 size={20} /></div>
            <strong>No setup fees.</strong>
          </div>
          <div className="fee-card">
            <div className="badge"><CheckCircle2 size={20} /></div>
            <strong>No mapping costs.</strong>
          </div>
        </div>
        <p style={{ marginTop: 26 }}>
          We'll work directly with your drivers and sales representatives to map your customer
          locations and build your delivery knowledge base at no additional cost.
        </p>
        <p className="lead">You simply subscribe and start using it.</p>
      </SectionBlock>

      {/* ROI */}
      <SectionBlock id="roi" tone="dark" eyebrow="The Numbers" title="The return on investment is obvious.">
        <div className="roi-visual">
          <div className="roi-stats">
            <div className="roi-stat">
              <span className="roi-num mono">10,000</span>
              <span className="roi-label">minutes worked, per driver, per month</span>
            </div>
            <ArrowRight className="roi-arrow" size={22} />
            <div className="roi-stat roi-stat-accent">
              <span className="roi-num mono">20</span>
              <span className="roi-label">minutes saved to break even on CNS</span>
            </div>
          </div>
          <div className="roi-bar">
            <div className="roi-bar-fill" />
            <div className="roi-bar-pointer">
              <span className="roi-bar-pointer-label">≈ 20 of 10,000 min</span>
              <span className="roi-bar-pointer-line" />
            </div>
          </div>
          <p className="roi-bar-caption">
            CNS costs $9.99 per driver, per month. That means a driver only needs to save
            approximately 20 minutes out of the 10,000 minutes they work over an entire month for
            the software to pay for itself. Everything after that is pure productivity and money
            saved.
          </p>
        </div>

        <div className="roi-extra">
          <p style={{ color: "rgba(255,255,255,0.85)" }}>And that's before considering:</p>
          <ul>
            <IconRow icon={TrendingUp}>Less management time coordinating drivers</IconRow>
            <IconRow icon={Phone}>Fewer calls to dispatch</IconRow>
            <IconRow icon={CalendarDays}>Less disruption when drivers are absent</IconRow>
            <IconRow icon={Zap}>Faster deliveries</IconRow>
            <IconRow icon={Users}>More consistent customer service</IconRow>
            <IconRow icon={GraduationCap}>Reduced driver training</IconRow>
            <IconRow icon={ShieldCheck}>Reduced operational stress</IconRow>
          </ul>
          <p style={{ marginTop: 14, color: "rgba(255,255,255,0.85)" }}>
            The operational benefits quickly become clear when you look at the numbers.
          </p>
        </div>
      </SectionBlock>

      {/* MAKE LOGISTICS EASIER */}
      <SectionBlock id="logistics" eyebrow="For Dispatch" title="Make logistics easier to manage.">
        <p>
          Managing deliveries shouldn't depend on remembering which driver knows which customer.
        </p>
        <p>With CNS, your logistics team doesn't have to constantly ask:</p>
        <div className="bubble-list">
          <div className="bubble"><MessageCircle size={16} /> Who knows this run?</div>
          <div className="bubble"><MessageCircle size={16} /> Who can cover today?</div>
          <div className="bubble"><MessageCircle size={16} /> Which driver knows this customer?</div>
          <div className="bubble"><MessageCircle size={16} /> Who should I call for directions?</div>
        </div>
        <p style={{ marginTop: 22 }}>The information is already there.</p>
        <div className="callout">
          Your dispatch team spends less time solving navigation problems and more time keeping
          deliveries moving.
        </div>
      </SectionBlock>

      {/* PROVE IT */}
      <SectionBlock id="proof" tone="alt" eyebrow="See It Work" title="We prove it on your own routes.">
        <p>
          We're so confident in CNS that we'll demonstrate it inside your own business.
        </p>
        <p>
          We'll map one of your existing delivery runs and have a driver who has never completed
          that run before use CNS to complete it.
        </p>
        <div className="neg-list">
          <div className="neg-item">
            <XCircle size={18} className="muted" /> No special preparation.
          </div>
          <div className="neg-item">
            <XCircle size={18} className="muted" /> No carefully selected route.
          </div>
          <div className="neg-item positive">
            <CheckCircle2 size={18} className="accent" /> Just a real-world demonstration using
            your customers.
          </div>
        </div>
        <p style={{ marginTop: 20 }}>
          See firsthand how quickly knowledge can be transferred from one experienced driver to
          another.
        </p>
      </SectionBlock>

      {/* FOOTER / FINAL CTA */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-mark"><LogoMark size={54} /></div>
          <h2>Most logistics software manages deliveries. CNS manages delivery knowledge.</h2>
          <p>
            Your drivers already know the answers. CNS makes sure your business never loses them.
          </p>
          <p>
            Start building a delivery operation where every driver has the experience of your best
            driver.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 16 }}>
            Book a free demo today <ArrowRight size={16} />
          </button>
          <div className="footer-fine mono">CNS — Courier Navigator System</div>
        </div>
      </footer>
    </div>
  );
}