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
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./LandingScreen.css";

/* ---------- real photography (Unsplash, free license) ---------- */
const IMG = {
  hero: "https://www.shutterstock.com/image-photo/ryder-truck-on-street-wilmington-260nw-2465376487.jpg",
  road: "https://images.unsplash.com/photo-1696330538770-165cab1f5313?auto=format&fit=crop&w=1400&q=80",
  warehouse:
    "https://images.unsplash.com/photo-1749244768351-2726dc23d26c?auto=format&fit=crop&w=1400&q=80",
  team: "https://images.unsplash.com/photo-1758873268745-dd2cf0d677b5?auto=format&fit=crop&w=1400&q=80",
};

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
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ---------- small reusable logomark (recreates the pin/road motif) ---------- */
function LogoMark({ size = 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
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
    <section
      id={id}
      ref={ref}
      className={`sb tone-${tone} ${visible ? "is-visible" : ""}`}
    >
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

/* ---------- photo-and-copy split section (image reveals with a soft zoom) ---------- */
function PhotoSplit({
  id,
  eyebrow,
  title,
  tone = "light",
  image,
  alt,
  caption,
  reverse,
  children,
}) {
  const [ref, visible] = useReveal();
  return (
    <section
      id={id}
      ref={ref}
      className={`sb ps tone-${tone} ${visible ? "is-visible" : ""}`}
    >
      <div className="sb-spine" aria-hidden="true">
        <span className="sb-pin" />
        <span className="sb-line" />
      </div>
      <div className={`ps-grid ${reverse ? "ps-reverse" : ""}`}>
        <div className="ps-copy">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          {title && <h2 className="sb-title">{title}</h2>}
          {children}
        </div>
        <div className="ps-media">
          <div className="photo-frame">
            <img src={image} alt={alt} loading="lazy" />
            <div className="photo-frame-shine" aria-hidden="true" />
          </div>
          {caption && (
            <div className="photo-caption">
              <MapPin size={13} /> {caption}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- full-bleed duotone photo band, used as a rhythm break between sections ---------- */
function PhotoBand({ image, label, sub }) {
  const [ref, visible] = useReveal(0.1);
  return (
    <div ref={ref} className={`photo-band ${visible ? "is-visible" : ""}`}>
      <img src={image} alt="" aria-hidden="true" loading="lazy" />
      <div className="photo-band-overlay" />
      <div className="photo-band-text">
        <span className="mono">{label}</span>
        <strong>{sub}</strong>
      </div>
    </div>
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

// ── LandingScreen ──────────────────────────────────────────────────────────
// Public marketing page shown to signed-out visitors (see App.jsx). Login /
// Sign up route into the real auth flow via props; Terms / Privacy route the
// same way the logged-in HomeScreen footer does.
export default function LandingScreen({
  onLoginClick,
  onSignupClick,
  onTermsPress,
  onPrivacyPress,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "#shared", label: "How It Works" },
    { href: "#training", label: "Onboarding" },
    { href: "#roi", label: "Pricing & ROI" },
    { href: "#proof", label: "Proof" },
  ];

  const scrollToId = (id) => (e) => {
    e.preventDefault();
    setNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="cns">
      {/* NAV */}
      <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-top">
          <div className="nav-brand">
            <img src="/icon.png" alt="Logo" width={32} height={32} />
            <span>
              CNS
              <small>Courier Navigator System</small>
            </span>
          </div>

          <div className="nav-links" role="navigation" aria-label="Sections">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={scrollToId(l.href.slice(1))}
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="nav-actions">
            <button className="btn btn-text" onClick={onLoginClick}>
              Login
            </button>
            <button className="btn btn-sm btn-primary" onClick={onSignupClick}>
              Sign up
            </button>
            <button
              className="nav-burger"
              aria-label="Toggle menu"
              aria-expanded={navOpen}
              onClick={() => setNavOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {navOpen && (
          <div className="nav-mobile">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={scrollToId(l.href.slice(1))}
              >
                {l.label}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* HERO — single clean photo, no overlaid text */}
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
              Every experienced driver builds valuable knowledge over years of
              deliveries — where to go, how each customer prefers deliveries to
              be handled, and the fastest way to get the job done.
            </p>
            <p>
              CNS captures that knowledge and makes it instantly available to
              every driver, reducing wasted time, simplifying operations, and
              delivering a more consistent customer experience.
            </p>
            <div className="hero-ctas">
              <button
                className="btn btn-primary btn-lg"
                onClick={() =>
                  (window.location.href = "mailto:support@cnsroute.com")
                }
              >
                Book a demo <ArrowRight size={18} />
              </button>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-photo-wrap">
              <img src={IMG.hero} alt="" />
            </div>
          </div>
        </div>

        <button
          className="hero-scroll-cue"
          aria-label="Scroll to learn more"
          onClick={() =>
            document
              .getElementById("problem")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          <span />
        </button>
      </header>

      {/* THE PROBLEM */}
      <SectionBlock
        id="problem"
        eyebrow="The Problem"
        title="Every time a driver has to ask, your business loses time."
      >
        <ul>
          <IconRow icon={Phone}>Every phone call to dispatch.</IconRow>
          <IconRow icon={PhoneCall}>Every call to a customer.</IconRow>
          <IconRow icon={MapPin}>
            Every minute spent looking for the right delivery point.
          </IconRow>
          <IconRow icon={UserX}>
            Every experienced driver interrupted for directions.
          </IconRow>
        </ul>
        <p style={{ marginTop: 18 }}>
          Individually, they're small delays. Collectively, they create a
          slower, more difficult delivery operation.
        </p>
        <ul>
          <IconRow icon={Frown}>Drivers become frustrated.</IconRow>
          <IconRow icon={Clock}>
            Dispatch spends time solving navigation problems instead of managing
            deliveries.
          </IconRow>
          <IconRow icon={Route}>Covering routes becomes harder.</IconRow>
          <IconRow icon={UserPlus}>
            New drivers take longer to become productive.
          </IconRow>
          <IconRow icon={Users}>
            Customers receive an inconsistent delivery experience.
          </IconRow>
        </ul>
        <p style={{ marginTop: 18 }}>
          The information to prevent these delays already exists — but it's
          scattered across your workforce.
        </p>
        <ul>
          <IconRow icon={Store}>
            One driver knows the correct loading dock for a customer.
          </IconRow>
          <IconRow icon={Navigation}>
            Another knows the quickest entrance.
          </IconRow>
          <IconRow icon={Package}>
            Someone else knows the customer prefers deliveries taken directly to
            their storage room.
          </IconRow>
          <IconRow icon={Ban}>
            Another driver knows not to use reception because it slows
            everything down.
          </IconRow>
        </ul>
        <p style={{ marginTop: 18 }}>
          Every driver builds knowledge through experience, but that knowledge
          is rarely documented, shared, or accessible to the rest of the team.
        </p>
        <p>
          As a result, drivers keep solving the same problems over and over
          again.
        </p>
        <div className="callout">
          CNS brings all of that knowledge together into one place, giving every
          driver access to the experience of the entire fleet before they even
          arrive.
        </div>
      </SectionBlock>

      {/* SHARED KNOWLEDGE — photo split, warehouse/knowledge-base imagery */}
      <PhotoSplit
        id="shared"
        tone="alt"
        eyebrow="The Shift"
        title="One driver's experience becomes everyone's experience."
        image={IMG.warehouse}
        alt="Rows of organized warehouse shelving representing a shared knowledge base"
        caption="Every stop, mapped once"
      >
        <p className="lead">
          Every delivery completed using CNS makes your business smarter.
        </p>
        <p>
          Instead of each driver learning customers independently, every driver
          contributes to a shared knowledge base that benefits the entire fleet.
        </p>
        <p>
          When one driver discovers a better entrance, safer parking location,
          or a faster delivery process, everyone benefits immediately.
        </p>
        <ul>
          <IconRow icon={CheckCircle2}>No repeated mistakes.</IconRow>
          <IconRow icon={CheckCircle2}>
            No relearning the same customer.
          </IconRow>
          <IconRow icon={CheckCircle2}>
            No relying on "the driver who knows that run."
          </IconRow>
        </ul>
      </PhotoSplit>

      {/* ANY DRIVER ANY ROUTE — photo split, road network imagery */}
      <PhotoSplit
        id="any-driver"
        title="Any Driver. Any Route. Any Time."
        image={IMG.road}
        alt="Aerial view of a city street network representing flexible delivery routing"
        caption="Any route, covered"
        reverse
      >
        <ul>
          <IconRow icon={CalendarDays}>A driver calls in sick.</IconRow>
          <IconRow icon={CalendarDays}>Someone goes on annual leave.</IconRow>
          <IconRow icon={UserPlus}>A new employee starts next week.</IconRow>
        </ul>
        <p style={{ marginTop: 18 }}>
          Normally, this means rearranging delivery runs around whoever knows
          the customers.
        </p>
        <p>
          With CNS, any driver can confidently take over a route they've never
          driven before because every customer instruction is already available.
        </p>
        <div className="callout">
          You're no longer managing around people's memory. You're managing
          around accurate information.
        </div>
      </PhotoSplit>

      {/* ELIMINATE TRAINING COST */}
      <SectionBlock
        id="training"
        tone="dark"
        eyebrow="Onboarding"
        title="Eliminate the cost of driver training."
      >
        <p>
          Traditional driver training means riding with experienced drivers,
          asking questions, making mistakes, and gradually learning hundreds of
          customer locations.
        </p>
        <p>With CNS, that knowledge already exists.</p>
        <p>
          If a driver knows how to drive, understands the job, and can follow
          instructions, they already have access to the information they need
          for every customer.
        </p>
        <p>
          Instead of spending days or weeks learning routes, your experienced
          drivers simply do what they've always done — while CNS captures that
          knowledge for everyone else.
        </p>
        <ul>
          <IconRow icon={GraduationCap}>Less training.</IconRow>
          <IconRow icon={DollarSign}>Lower costs.</IconRow>
          <IconRow icon={Zap}>Drivers become productive faster.</IconRow>
        </ul>
        <p style={{ marginTop: 10 }}>
          Training becomes faster, more consistent, and significantly less
          expensive.
        </p>
      </SectionBlock>

      {/* LESS FRUSTRATION */}
      <SectionBlock
        id="frustration"
        tone="alt"
        title="Less frustration. Better drivers."
      >
        <p>
          Drivers don't enjoy wasting time trying to find the correct delivery
          location, searching for the right entrance, or walking around
          unfamiliar locations looking for where the delivery actually needs to
          go.
        </p>
        <p>
          They don't enjoy calling dispatch. They don't enjoy interrupting other
          drivers. They don't enjoy ringing customers just to ask where the
          delivery entrance is.
        </p>
        <p>
          CNS removes that frustration by putting the correct information in
          front of them before they arrive.
        </p>
        <div className="callout">
          Confident drivers work more efficiently. Less stress leads to better
          customer interactions and more consistent service.
        </div>
      </SectionBlock>

      {/* CONSISTENT EXPERIENCE */}
      <SectionBlock id="consistent" title="Consistent Customer Experience">
        <p className="lead">
          Your customers shouldn't notice when a different driver turns up.
        </p>
        <p>
          Whether it's your most experienced driver or someone covering the run
          for the first time, the delivery experience should remain exactly the
          same.
        </p>
        <p>
          CNS helps standardize every delivery so customers receive the same
          level of service every time.
        </p>
      </SectionBlock>

      {/* BUILD KNOWLEDGE BASE */}
      <SectionBlock
        id="setup"
        tone="alt"
        eyebrow="Getting Started"
        title="We build your knowledge base with you."
      >
        <div className="grid-3">
          <div className="fee-card">
            <div className="badge">
              <CheckCircle2 size={20} />
            </div>
            <strong>No implementation fees.</strong>
          </div>
          <div className="fee-card">
            <div className="badge">
              <CheckCircle2 size={20} />
            </div>
            <strong>No setup fees.</strong>
          </div>
          <div className="fee-card">
            <div className="badge">
              <CheckCircle2 size={20} />
            </div>
            <strong>No mapping costs.</strong>
          </div>
        </div>
        <p style={{ marginTop: 26 }}>
          We'll work directly with your drivers and sales representatives to map
          your customer locations and build your delivery knowledge base at no
          additional cost.
        </p>
        <p className="lead">You simply subscribe and start using it.</p>
      </SectionBlock>

      {/* ROI */}
      <SectionBlock
        id="roi"
        tone="dark"
        eyebrow="The Numbers"
        title="The return on investment is obvious."
      >
        <div className="roi-visual">
          <div className="roi-stats">
            <div className="roi-stat">
              <span className="roi-num mono">10,000</span>
              <span className="roi-label">
                minutes worked, per driver, per month
              </span>
            </div>
            <ArrowRight className="roi-arrow" size={22} />
            <div className="roi-stat roi-stat-accent">
              <span className="roi-num mono">20</span>
              <span className="roi-label">
                minutes saved to break even on CNS
              </span>
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
            CNS costs $9.99 per driver, per month. That means a driver only
            needs to save approximately 20 minutes out of the 10,000 minutes
            they work over an entire month for the software to pay for itself.
            Everything after that is pure productivity and money saved.
          </p>
        </div>

        <div className="roi-extra">
          <p style={{ color: "rgba(255,255,255,0.85)" }}>
            And that's before considering:
          </p>
          <ul>
            <IconRow icon={TrendingUp}>
              Less management time coordinating drivers
            </IconRow>
            <IconRow icon={Phone}>Fewer calls to dispatch</IconRow>
            <IconRow icon={CalendarDays}>
              Less disruption when drivers are absent
            </IconRow>
            <IconRow icon={Zap}>Faster deliveries</IconRow>
            <IconRow icon={Users}>More consistent customer service</IconRow>
            <IconRow icon={GraduationCap}>Reduced driver training</IconRow>
            <IconRow icon={ShieldCheck}>Reduced operational stress</IconRow>
          </ul>
          <p style={{ marginTop: 14, color: "rgba(255,255,255,0.85)" }}>
            The operational benefits quickly become clear when you look at the
            numbers.
          </p>
        </div>
      </SectionBlock>

      {/* PHOTO BAND — dispatch/team rhythm break before logistics section */}
      <PhotoBand
        image={IMG.team}
        label="For Dispatch Teams"
        sub="Less time coordinating who knows what. More time keeping deliveries moving."
      />

      {/* MAKE LOGISTICS EASIER */}
      <SectionBlock
        id="logistics"
        eyebrow="For Dispatch"
        title="Make logistics easier to manage."
      >
        <p>
          Managing deliveries shouldn't depend on remembering which driver knows
          which customer.
        </p>
        <p>With CNS, your logistics team doesn't have to constantly ask:</p>
        <div className="bubble-list">
          <div className="bubble">
            <MessageCircle size={16} /> Who knows this run?
          </div>
          <div className="bubble">
            <MessageCircle size={16} /> Who can cover today?
          </div>
          <div className="bubble">
            <MessageCircle size={16} /> Which driver knows this customer?
          </div>
          <div className="bubble">
            <MessageCircle size={16} /> Who should I call for directions?
          </div>
        </div>
        <p style={{ marginTop: 22 }}>The information is already there.</p>
        <div className="callout">
          Your dispatch team spends less time solving navigation problems and
          more time keeping deliveries moving.
        </div>
      </SectionBlock>

      {/* PROVE IT */}
      <SectionBlock
        id="proof"
        tone="alt"
        eyebrow="See It Work"
        title="We prove it on your own routes."
      >
        <p>
          We're so confident in CNS that we'll demonstrate it inside your own
          business.
        </p>
        <p>
          We'll map one of your existing delivery runs and have a driver who has
          never completed that run before use CNS to complete it.
        </p>
        <div className="neg-list">
          <div className="neg-item">
            <XCircle size={18} className="muted" /> No special preparation.
          </div>
          <div className="neg-item">
            <XCircle size={18} className="muted" /> No carefully selected route.
          </div>
          <div className="neg-item positive">
            <CheckCircle2 size={18} className="accent" /> Just a real-world
            demonstration using your customers.
          </div>
        </div>
        <p style={{ marginTop: 20 }}>
          See firsthand how quickly knowledge can be transferred from one
          experienced driver to another.
        </p>
      </SectionBlock>

      {/* FOOTER / FINAL CTA — legal links wired the same way HomeScreen's footer is */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-mark">
            <img src="/icon.png" alt="Logo" width={90} height={80} />
          </div>
          <h2>
            Most logistics software manages deliveries. CNS manages delivery
            knowledge.
          </h2>
          <p>
            Your drivers already know the answers. CNS makes sure your business
            never loses them.
          </p>
          <p>
            Start building a delivery operation where every driver has the
            experience of your best driver.
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={() =>
              (window.location.href = "mailto:support@cnsroute.com")
            }
          >
            Book a demo today <ArrowRight size={16} />
          </button>

          <nav className="footer-legal" aria-label="Legal">
            <button className="footer-legal-link" onClick={onTermsPress}>
              Terms of Service
            </button>
            <span className="footer-legal-dot" aria-hidden="true" />
            <button className="footer-legal-link" onClick={onPrivacyPress}>
              Privacy Policy
            </button>
          </nav>

          <div className="footer-fine mono">CNS — Courier Navigator System</div>
        </div>
      </footer>
    </div>
  );
}
