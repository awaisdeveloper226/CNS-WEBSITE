import React, { useEffect, useRef, useState, useCallback } from 'react';
import './LandingScreen.css';

/* ────────────────────────────────────────────────────────────────────────
   Small inline icon set — no external icon library dependency, so this
   file drops into any React/React-Native-web setup as-is.
   ──────────────────────────────────────────────────────────────────── */
const iconProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

const IconNetwork = (p) => (
  <svg {...iconProps} width={p.size || 20} height={p.size || 20}>
    <circle cx="12" cy="5" r="2.4" /><circle cx="5" cy="19" r="2.4" /><circle cx="19" cy="19" r="2.4" />
    <path d="M12 7.4 L6.2 17.1 M12 7.4 L17.8 17.1 M7.4 19 L16.6 19" />
  </svg>
);
const IconRoute = (p) => (
  <svg {...iconProps} width={p.size || 20} height={p.size || 20}>
    <circle cx="5" cy="6" r="2.2" /><circle cx="19" cy="18" r="2.2" />
    <path d="M5 8.2 C5 13 8 11 12 13 C16 15 19 13 19 15.8" />
  </svg>
);
const IconCapOff = (p) => (
  <svg {...iconProps} width={p.size || 20} height={p.size || 20}>
    <path d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5Z" />
    <path d="M7 11.6v4c0 1.4 2.2 2.9 5 2.9s5-1.5 5-2.9v-4" />
    <path d="M3 15V9.5" strokeDasharray="1 3" />
  </svg>
);
const IconPhoneOff = (p) => (
  <svg {...iconProps} width={p.size || 20} height={p.size || 20}>
    <path d="M9.5 5.3 7.7 4a1.7 1.7 0 0 0-2.3.3L4.2 6.1c-.5.6-.5 1.5.1 2.4a17 17 0 0 0 3.9 4.2" />
    <path d="M11.4 12.9a17 17 0 0 0 4.2 3.9c.9.6 1.8.6 2.4.1l1.8-1.2a1.7 1.7 0 0 0 .3-2.3l-1.3-1.8" />
    <path d="M3 3l18 18" />
  </svg>
);
const IconSmile = (p) => (
  <svg {...iconProps} width={p.size || 20} height={p.size || 20}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 13.5c1 1.6 2.4 2.4 4 2.4s3-.8 4-2.4" />
    <path d="M8.5 9.5h.01M15.5 9.5h.01" />
  </svg>
);
const IconRefresh = (p) => (
  <svg {...iconProps} width={p.size || 20} height={p.size || 20}>
    <path d="M20 11a8 8 0 0 0-14.6-4.4M4 4v4h4" />
    <path d="M4 13a8 8 0 0 0 14.6 4.4M20 20v-4h-4" />
  </svg>
);
const IconCheck = (p) => (
  <svg {...iconProps} width={p.size || 16} height={p.size || 16}>
    <path d="M4 12.5 9 17.5 20 6.5" />
  </svg>
);
const IconArrowRight = (p) => (
  <svg {...iconProps} width={p.size || 16} height={p.size || 16}>
    <path d="M4 12h16M13 5l7 7-7 7" />
  </svg>
);
const IconClock = (p) => (
  <svg {...iconProps} width={p.size || 18} height={p.size || 18}>
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" />
  </svg>
);
const IconTrend = (p) => (
  <svg {...iconProps} width={p.size || 18} height={p.size || 18}>
    <path d="M3 17l6-6 4 4 8-9" /><path d="M15 6h6v6" />
  </svg>
);
const IconShield = (p) => (
  <svg {...iconProps} width={p.size || 18} height={p.size || 18}>
    <path d="M12 3l7 3v6c0 5-3.5 7.7-7 9-3.5-1.3-7-4-7-9V6l7-3Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const IconShieldSm = (p) => <IconShield size={16} {...p} />;
const IconClockSm = (p) => <IconClock size={16} {...p} />;

/* ────────────────────────────────────────────────────────────────────────
   Hooks
   ──────────────────────────────────────────────────────────────────── */

/** Fades/rises every .ls-reveal element into view once, on first intersect. */
function useScrollReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll('.ls-reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

/** Animates a number from 0 → target the first time the element scrolls into view. */
function useCountUp(target, { duration = 1200, decimals = 0 } = {}) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const start = performance.now();
          const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(Number((target * eased).toFixed(decimals)));
            if (t < 1) raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          io.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [target, duration, decimals]);

  return [ref, value];
}

/** Subtle perspective tilt on a card, following the cursor. */
function useTilt(maxDeg = 6) {
  const ref = useRef(null);
  const onMouseMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--tiltY', `${(px * maxDeg * 2).toFixed(2)}deg`);
    el.style.setProperty('--tiltX', `${(-py * maxDeg * 2).toFixed(2)}deg`);
  }, [maxDeg]);
  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--tiltX', '0deg');
    el.style.setProperty('--tiltY', '0deg');
  }, []);
  return { ref, onMouseMove, onMouseLeave };
}

/* ────────────────────────────────────────────────────────────────────────
   Hero visual — an animated "knowledge network": one hub, every driver
   connected to it and to each other's knowledge, pulses of information
   travelling the lines on loop.
   ──────────────────────────────────────────────────────────────────── */
function KnowledgeMap() {
  const nodes = [
    { x: 110, y: 78 }, { x: 486, y: 78 }, { x: 86, y: 258 },
    { x: 300, y: 292 }, { x: 512, y: 258 },
  ];
  const hub = { x: 300, y: 176 };
  const paths = nodes.map((n) => `M${hub.x} ${hub.y} L${n.x} ${n.y}`);

  return (
    <svg className="ls-knowledge-map" viewBox="0 0 600 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Network showing every driver connected to a shared knowledge hub">
      {paths.map((d, i) => (
        <path key={`line-${i}`} className="ls-km-line" d={d} style={{ animationDelay: `${i * -0.4}s` }} />
      ))}
      {paths.map((d, i) => (
        <circle key={`pulse-${i}`} className="ls-km-pulse" r="4"
          style={{ offsetPath: `path('${d}')`, animationDelay: `${i * 0.55}s` }} />
      ))}
      {nodes.map((n, i) => (
        <g key={`node-${i}`} className="ls-km-node" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
          <circle cx={n.x} cy={n.y} r="22" style={{ animationDelay: `${0.15 + i * 0.12}s` }} />
          <circle className="ls-km-node-dot" cx={n.x} cy={n.y} r="4.5" style={{ animationDelay: `${0.15 + i * 0.12}s` }} />
        </g>
      ))}
      <circle className="ls-km-hub-ring" cx={hub.x} cy={hub.y} r="34" />
      <circle className="ls-km-hub-ring ls-km-hub-ring--2" cx={hub.x} cy={hub.y} r="34" />
      <circle className="ls-km-hub-fill" cx={hub.x} cy={hub.y} r="30" stroke="var(--route-glow)" strokeWidth="2" />
      <text className="ls-km-hub-label" x={hub.x} y={hub.y + 4} textAnchor="middle">CNS</text>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Static content
   ──────────────────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: IconNetwork, title: 'One network, every driver', body: "Every delivery entry point, gate code, and instruction any driver has ever learned is available to every other driver — instantly, not eventually." },
  { icon: IconRoute, title: 'No more matching driver to run', body: "You no longer need to send a specific driver to a specific run. Any driver on the network can pick up any route." },
  { icon: IconCapOff, title: 'Training costs, gone', body: 'If a driver can drive and knows what to do, that\'s enough — he already has the same knowledge as your most experienced trainer.' },
  { icon: IconPhoneOff, title: 'Fewer calls to dispatch', body: "When a driver already knows what to do, he doesn't need to ring dispatch or the customer to find out." },
  { icon: IconSmile, title: 'Happier drivers, happier customers', body: 'A driver who always knows where to go isn\'t frustrated by a bad delivery, and the customer gets a seamless one.' },
  { icon: IconRefresh, title: 'Always current', body: 'Every week, we re-map your customer base and add or update instructions, so the network stays 100% accurate.' },
];

const STEPS = [
  { title: 'We map your customers', body: 'We work with your drivers and sales reps to map every customer with complete, accurate delivery instructions.' },
  { title: 'You run a free trial', body: "Hand a route only your best driver knows to someone unfamiliar with it — no cost, no commitment, no setup fee." },
  { title: 'See it, then decide', body: 'Compare the results for yourself. If you like what you see, subscribe — if not, walk away, no strings attached.' },
];

/* ────────────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────────── */
export default function LandingScreen() {
  const rootRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [showFloatingCta, setShowFloatingCta] = useState(false);

  useScrollReveal(rootRef);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      setShowFloatingCta(window.scrollY > 620);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [minutesRef, minutesVal] = useCountUp(200, { duration: 1100 });
  const [hoursRef, hoursVal] = useCountUp(3, { duration: 900 });
  const [roiRef, roiVal] = useCountUp(10, { duration: 1300 });

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="ls-root" ref={rootRef}>
      <div className="ls-aurora" aria-hidden="true" />

      {/* ── Nav ── */}
      <nav className={`ls-nav ${scrolled ? 'ls-nav--scrolled' : ''}`}>
        <div className="ls-nav-inner">
          <div className="ls-wordmark">
            <span className="ls-wordmark-dot" />
            CNS
          </div>
          <div className="ls-nav-links">
            <button className="ls-nav-link" onClick={scrollTo('how-it-works')}>How it works</button>
            <button className="ls-nav-link" onClick={scrollTo('features')}>Features</button>
            <button className="ls-nav-link" onClick={scrollTo('roi')}>ROI</button>
            <button className="ls-nav-link" onClick={scrollTo('pricing')}>Pricing</button>
          </div>
          <div className="ls-nav-actions">
            <button className="ls-btn-ghost" onClick={scrollTo('contact')}>Talk to us</button>
            <span className="ls-cta-pulse">
              <button className="ls-btn-primary" onClick={scrollTo('trial')}>Start free trial</button>
            </span>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="ls-hero">
        <div className="ls-hero-ambient" aria-hidden="true" />
        <div className="ls-hero-copy ls-reveal">
          <span className="ls-eyebrow"><span className="ls-eyebrow-dot" />The last 100 metres, solved</span>
          <h1 className="ls-headline">
            Every driver knows <span className="ls-headline-gradient">every delivery.</span>
          </h1>
          <p className="ls-subhead">
            CNS gives your whole fleet the collective knowledge of your most experienced driver —
            entry points, gate codes, and instructions for every customer — so any driver can run
            any route, from day one.
          </p>
          <div className="ls-hero-actions">
            <span className="ls-cta-pulse">
              <button className="ls-btn-primary ls-btn-large" onClick={scrollTo('trial')}>
                Start your free trial <IconArrowRight />
              </button>
            </span>
            <button className="ls-btn-ghost ls-btn-large" onClick={scrollTo('how-it-works')}>See how it works</button>
          </div>
          <p className="ls-hero-fineprint"><IconShieldSm /> No upfront cost. No commitment. Cancel anytime.</p>
        </div>

        <div className="ls-hero-visual ls-reveal ls-reveal--scale">
          <div className="ls-console">
            <div className="ls-console-head">
              <span className="ls-console-live"><span className="ls-console-live-dot" />LIVE NETWORK</span>
              <span className="ls-console-label">5 drivers · 1 hub</span>
            </div>
            <KnowledgeMap />
            <span className="ls-console-caption">Every driver's knowledge, shared with every other driver — in real time.</span>
          </div>
        </div>
      </section>

      {/* ── Trial ── */}
      <section className="ls-trial" id="trial">
        <div className="ls-trial-card ls-reveal">
          <div className="ls-trial-copy">
            <span className="ls-trial-tag">Free trial</span>
            <h2>Try it before you trust it.</h2>
            <p>
              Give one of your experienced driver's runs to a driver who's never done it — with CNS.
              See the difference for yourself. If you like what you see, subscribe. If you don't, you've lost nothing.
            </p>
            <span className="ls-cta-pulse">
              <button className="ls-btn-primary" onClick={scrollTo('contact')}>Start my free trial <IconArrowRight /></button>
            </span>
          </div>
          <div className="ls-trial-compare">
            <div className="ls-trial-row">
              <span className="ls-trial-avatar ls-trial-avatar--vet">JD</span>
              <div className="ls-trial-row-body">
                <div className="ls-trial-row-name">Experienced driver</div>
                <div className="ls-trial-row-sub">Knows the run by heart</div>
              </div>
              <span className="ls-trial-row-badge ls-trial-row-badge--match">Baseline run</span>
            </div>
            <span className="ls-trial-vs">shares knowledge with →</span>
            <div className="ls-trial-row">
              <span className="ls-trial-avatar ls-trial-avatar--new">AK</span>
              <div className="ls-trial-row-body">
                <div className="ls-trial-row-name">New driver, same run</div>
                <div className="ls-trial-row-sub">Never done this route before</div>
              </div>
              <span className="ls-trial-row-badge ls-trial-row-badge--match">On CNS</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="ls-section ls-section--tint" id="features">
        <div className="ls-section-head ls-reveal">
          <h2>Built to remove the guesswork</h2>
          <p className="ls-section-sub">Everything a driver needs to know, already known — before the run starts.</p>
        </div>
        <div className="ls-feature-grid">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <FeatureCard key={title} Icon={Icon} title={title} body={body} delay={i * 0.06} />
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="ls-section" id="how-it-works">
        <div className="ls-section-head ls-reveal">
          <h2>From first route to full rollout</h2>
          <p className="ls-section-sub">Three steps, starting with a trial you can walk away from.</p>
        </div>
        <div className="ls-step-grid">
          {STEPS.map((s, i) => (
            <div className="ls-step-card ls-reveal" key={s.title} style={{ transitionDelay: `${i * 0.08}s` }}>
              <span className="ls-step-index">{String(i + 1).padStart(2, '0')}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              {i < STEPS.length - 1 && <span className="ls-step-connector" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </section>

      {/* ── ROI ── */}
      <section className="ls-section ls-section--tint" id="roi">
        <div className="ls-section-head ls-reveal">
          <h2>The math behind the trial</h2>
          <p className="ls-section-sub">Based on an 8-hour driver day — see what a shared knowledge network gives back.</p>
        </div>
        <div className="ls-roi-panel ls-reveal">
          <div className="ls-roi-bars">
            <RoiBar label="Monthly capacity" value="9,600 min / driver" widthTarget={100} variant="dark" sub="480 min/day × 5 days × 4 weeks" />
            <RoiBar label="Time reclaimed" value="~200 min / driver" widthTarget={9} variant="route" sub="from shared knowledge alone" />
          </div>
          <div className="ls-roi-stats">
            <RoiStat icon={<IconClock />} valueRef={minutesRef} value={minutesVal} suffix=" min" label="reclaimed per driver, every month" />
            <RoiStat icon={<IconClockSm />} valueRef={hoursRef} value={hoursVal} suffix=" hrs" label="of driver time, back in the schedule" />
            <RoiStat icon={<IconTrend />} valueRef={roiRef} value={roiVal} suffix="x" prefix="up to " label="return on investment" />
          </div>
          <p className="ls-roi-footnote">
            A driver working an 8-hour day covers about 9,600 minutes a month. A shared knowledge network that keeps every
            customer's instructions current reclaims an estimated 200 of those minutes — before counting the training costs
            it removes entirely. That's up to a 10x return on investment.
          </p>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="ls-section" id="pricing">
        <div className="ls-section-head ls-reveal">
          <h2>Simple, honest pricing</h2>
          <p className="ls-section-sub">No implementation charges. No upfront costs. No hidden fees.</p>
        </div>
        <div className="ls-pricing-card ls-reveal ls-reveal--scale">
          <span className="ls-pricing-badge">Per driver, per month</span>
          <div className="ls-pricing-price">
            <span className="ls-pricing-amount">$0.00</span>
            <span className="ls-pricing-period">/ driver / month</span>
          </div>
          <ul className="ls-pricing-list">
            <li><IconCheck /> No implementation charges</li>
            <li><IconCheck /> No upfront costs or hidden fees</li>
            <li><IconCheck /> Every driver, every route, always on</li>
            <li><IconCheck /> Customer knowledge refreshed weekly</li>
          </ul>
          <span className="ls-cta-pulse" style={{ width: '100%' }}>
            <button className="ls-btn-primary" onClick={scrollTo('contact')}>Start free trial <IconArrowRight /></button>
          </span>
          <p className="ls-pricing-fineprint">No credit card required to trial.</p>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="ls-contact" id="contact">
        <div className="ls-contact-glow" aria-hidden="true" />
        <div className="ls-contact-inner ls-reveal">
          <h2>Ready to see it for yourself?</h2>
          <p>Give one route to one driver who's never run it. We'll handle the rest — free, with no commitment.</p>
          <div className="ls-contact-actions">
            <span className="ls-cta-pulse">
              <button className="ls-btn-primary ls-btn-large">Start free trial <IconArrowRight /></button>
            </span>
            <button className="ls-btn-ghost ls-btn-large ls-btn-on-dark">Talk to us</button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="ls-footer">
        <div className="ls-footer-inner">
          <div className="ls-footer-brand">
            <div className="ls-wordmark">
              <span className="ls-wordmark-dot" />
              CNS
            </div>
            <p>Courier Navigator System — solving the last 100 metres.</p>
          </div>
          <div className="ls-footer-legal">
            <button className="ls-footer-legal-link">Privacy</button>
            <span className="ls-footer-dot" />
            <button className="ls-footer-legal-link">Terms</button>
          </div>
        </div>
      </footer>

      <button className={`ls-floating-cta ${showFloatingCta ? 'is-visible' : ''}`} onClick={scrollTo('trial')}>
        Start free trial <IconArrowRight size={14} />
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Small pieces
   ──────────────────────────────────────────────────────────────────── */
function FeatureCard({ Icon, title, body, delay }) {
  const { ref, onMouseMove, onMouseLeave } = useTilt(5);
  return (
    <div className="ls-tilt ls-reveal" ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} style={{ transitionDelay: `${delay}s` }}>
      <div className="ls-feature-card">
        <div className="ls-feature-icon"><Icon /></div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </div>
  );
}

function RoiBar({ label, value, widthTarget, variant, sub }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          el.style.width = `${widthTarget}%`;
          io.unobserve(el);
        }
      });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [widthTarget]);

  return (
    <div className="ls-roi-bar-row">
      <span className="ls-roi-bar-label">{label}</span>
      <span className="ls-roi-bar-track">
        <span ref={ref} className={`ls-roi-bar-fill ls-roi-bar-fill--${variant}`} />
      </span>
      <span className="ls-roi-bar-value">{value}<br />{sub}</span>
    </div>
  );
}

function RoiStat({ icon, valueRef, value, suffix = '', prefix = '', label }) {
  return (
    <div className="ls-roi-stat" ref={valueRef}>
      <span className="ls-roi-stat-icon">{icon}</span>
      <div className="ls-roi-stat-text">
        <span className="ls-roi-stat-value">{prefix}{value}{suffix}</span>
        <span className="ls-roi-stat-label">{label}</span>
      </div>
    </div>
  );
}