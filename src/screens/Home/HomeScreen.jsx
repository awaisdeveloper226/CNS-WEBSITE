import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Settings, Plus, CheckCircle2, MapPin, ArrowUpRight } from "lucide-react";
import { API_ENDPOINTS } from "../../constants/network";
import "./HomeScreen.css";

// ── Config (mirrors RN constants) ────────────────────────────────────────────
const INITIAL_BATCH = 5;
const LOAD_BATCH = 25;
const BATCH_DELAY_MS = 50;

// ── RouteDivider — the recurring "waypoint" signature element ───────────────
function RouteDivider() {
  return (
    <div className="route-divider" aria-hidden="true">
      <svg viewBox="0 0 400 16" preserveAspectRatio="none">
        <line x1="0" y1="8" x2="400" y2="8" />
      </svg>
      <span className="route-dot" />
      <span className="route-dot" />
      <span className="route-dot" />
    </div>
  );
}

// ── BusinessCard ─────────────────────────────────────────────────────────────
function BusinessCard({ business, onNavigate }) {
  const initial = (business.name || "?").trim().charAt(0).toUpperCase();

  return (
    <button className="biz-card" onClick={() => onNavigate(business)}>
      <div className="biz-card-top">
        <span className="biz-avatar" aria-hidden="true">{initial}</span>
        {business.isVerified && (
          <span className="biz-badge">
            <CheckCircle2 size={13} strokeWidth={2.5} />
            Verified
          </span>
        )}
      </div>

      <h3 className="biz-name">{business.name}</h3>

      <p className="biz-address">
        <MapPin size={14} strokeWidth={2} />
        <span>{business.address}</span>
      </p>

      <span className="biz-cta">
        View directions <ArrowUpRight size={14} strokeWidth={2.5} />
      </span>
    </button>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="biz-card biz-skeleton" aria-hidden="true">
      <div className="skeleton skeleton-avatar" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-row" />
    </div>
  );
}

// ── HomeScreen ────────────────────────────────────────────────────────────────
export default function HomeScreen({
  onNavigate,
  onSearchPress,
  onProfilePress,
  onContributePress,
  businesses,
  setBusinesses,
}) {
  const [initialLoading, setInitialLoading] = useState(false);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  // ── helpers ────────────────────────────────────────────────────────────────
  const buildUrl = (skip, limit) =>
    `${API_ENDPOINTS.BUSINESSES}?skip=${skip}&limit=${limit}`;

  const fetchBatch = async (skip, limit) => {
    const res = await fetch(buildUrl(skip, limit));
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch businesses.");
    }
    const data = await res.json();
    return Array.isArray(data)
      ? { businesses: data, total: data.length }
      : data;
  };

  // ── main load ──────────────────────────────────────────────────────────────
  const fetchLocations = useCallback(async () => {
    setInitialLoading(true);
    setError(null);
    setBusinesses([]);

    try {
      const first = await fetchBatch(0, INITIAL_BATCH);
      if (!isMounted.current) return;

      setBusinesses(first.businesses);
      setInitialLoading(false);

      const total = first.total;
      if (total <= INITIAL_BATCH) return;

      setBackgroundLoading(true);
      let skip = INITIAL_BATCH;
      let accumulated = [...first.businesses];

      while (skip < total) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        if (!isMounted.current) return;

        const chunk = await fetchBatch(skip, LOAD_BATCH);
        if (!isMounted.current) return;

        accumulated = [...accumulated, ...chunk.businesses];
        setBusinesses([...accumulated]);
        skip += LOAD_BATCH;
      }
    } catch (err) {
      if (!isMounted.current) return;
      setError(`Could not load popular locations: ${err.message}`);
      setBusinesses([]);
      setInitialLoading(false);
    } finally {
      if (isMounted.current) setBackgroundLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    if (businesses.length === 0) fetchLocations();
    return () => { isMounted.current = false; };
  }, []);

  const verifiedCount = businesses.filter((b) => b.isVerified).length;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="hs-root">

      {/* ── Top nav ── */}
      <header className="hs-nav">
        <div className="hs-nav-inner">
          <div className="hs-wordmark">
            <span className="hs-wordmark-dot" aria-hidden="true" />
            CNS
          </div>

          <nav className="hs-nav-links" aria-label="Primary">
            <button className="hs-nav-link" onClick={onSearchPress}>Search</button>
            <button className="hs-nav-link" onClick={onContributePress}>Contribute</button>
          </nav>

          <button className="hs-nav-icon" onClick={onProfilePress} aria-label="Settings">
            <Settings size={20} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="hs-hero">
        <div className="hs-hero-inner">
          <span className="hs-eyebrow">Community-mapped delivery guides</span>
          <h1 className="hs-headline">
            Find the door<br />couriers actually use.
          </h1>
          <p className="hs-subhead">
            CNS is a courier-verified map of real entry points &mdash; loading
            docks, side gates, and back entrances that a pin on a map will
            never show you.
          </p>

          <button className="hs-search-box" onClick={onSearchPress} aria-label="Open search">
            <Search size={18} strokeWidth={2} />
            <span className="hs-search-placeholder">Search a business, area, or address&hellip;</span>
            <span className="hs-search-kbd">Enter</span>
          </button>

          <div className="hs-hero-actions">
            <button className="hs-btn-primary" onClick={onContributePress}>
              <Plus size={18} strokeWidth={2.5} />
              Start contributing
            </button>
            <span className="hs-hero-stat">
              {businesses.length > 0
                ? `${businesses.length} businesses mapped${verifiedCount ? ` · ${verifiedCount} verified` : ""}`
                : "Community verified, always growing"}
            </span>
          </div>
        </div>

        <svg className="hs-hero-route" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">
          <path d="M -20 160 C 250 40, 500 220, 750 90 S 1150 30, 1230 100" />
        </svg>
      </section>

      <div className="hs-content">
        <RouteDivider />

        {/* ── Section heading ── */}
        <div className="hs-section-row">
          <div>
            <h2 className="hs-section-title">Popular businesses</h2>
            <p className="hs-section-sub">Entry points near you, contributed by the community</p>
          </div>
          {backgroundLoading && (
            <span className="hs-bg-pill" role="status">
              <span className="hs-bg-dot" />
              Loading more
            </span>
          )}
        </div>

        {/* ── Error ── */}
        {error && <p className="hs-error">{error}</p>}

        {/* ── Skeletons while initial load ── */}
        {initialLoading && (
          <div className="hs-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Empty state ── */}
        {!initialLoading && !error && businesses.length === 0 && (
          <div className="hs-empty">
            <MapPin size={22} strokeWidth={1.75} />
            <p>No popular businesses found yet.</p>
            <button className="hs-empty-link" onClick={onContributePress}>Be the first to add one</button>
          </div>
        )}

        {/* ── Business grid ── */}
        {!initialLoading && businesses.length > 0 && (
          <div className="hs-grid">
            {businesses.map((b) => (
              <BusinessCard key={b.id ?? b._id} business={b} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="hs-footer">
        <div className="hs-footer-inner">
          <div className="hs-wordmark hs-wordmark-footer">
            <span className="hs-wordmark-dot" aria-hidden="true" />
            CNS
          </div>
          <p>Built by couriers, for couriers.</p>
          <button className="hs-footer-link" onClick={onContributePress}>
            Add a business <ArrowUpRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </footer>
    </div>
  );
}