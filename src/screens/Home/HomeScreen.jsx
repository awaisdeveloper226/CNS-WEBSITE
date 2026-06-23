import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Settings, Plus, CheckCircle, MapPin } from "lucide-react";
import { API_ENDPOINTS } from "../../constants/network";
import "./HomeScreen.css";

// ── Config (mirrors RN constants) ────────────────────────────────────────────
const INITIAL_BATCH = 5;
const LOAD_BATCH = 25;
const BATCH_DELAY_MS = 50;

// ── BusinessCard ─────────────────────────────────────────────────────────────
function BusinessCard({ business, onNavigate }) {
  return (
    <button className="card" onClick={() => onNavigate(business)}>
      <div className="card-header">
        <span className="card-title">{business.name}</span>
        {business.isVerified && (
          <CheckCircle size={16} color="#10b981" aria-label="Verified" />
        )}
      </div>
      <div className="card-row">
        <MapPin size={14} color="#6b7280" />
        <span className="card-text">{business.address}</span>
      </div>
    </button>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card skeleton-card" aria-hidden="true">
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

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="hs-root">
      <div className="hs-inner">

        {/* ── Header ── */}
        <header className="hs-header">
          <div>
            <h1 className="hs-title">CNS</h1>
            <p className="hs-subtitle">Community powered delivery guides</p>
          </div>
          <button
            className="hs-profile-btn"
            onClick={onProfilePress}
            aria-label="Settings"
          >
            <Settings size={24} color="#6b7280" />
          </button>
        </header>

        {/* ── Search box ── */}
        <button className="hs-search-box" onClick={onSearchPress} aria-label="Open search">
          <Search size={18} color="#9ca3af" />
          <span className="hs-search-placeholder">Search businesses...</span>
        </button>

        {/* ── Contribute CTA ── */}
        <button className="hs-contribute-btn" onClick={onContributePress}>
          <Plus size={22} color="#fff" />
          <span>Start Contributing</span>
        </button>

        {/* ── Section heading ── */}
        <div className="hs-section-row">
          <h2 className="hs-section-title">Popular Businesses</h2>
          {backgroundLoading && (
            <span className="hs-bg-dot" title="Loading more…" aria-label="Loading more businesses" />
          )}
        </div>

        {/* ── Error ── */}
        {error && <p className="hs-error">{error}</p>}

        {/* ── Skeletons while initial load ── */}
        {initialLoading && (
          <div className="hs-list">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Empty state ── */}
        {!initialLoading && !error && businesses.length === 0 && (
          <p className="hs-empty">
            No popular businesses found. Try searching or creating one!
          </p>
        )}

        {/* ── Business list ── */}
        {!initialLoading && businesses.length > 0 && (
          <div className="hs-list">
            {businesses.map((b) => (
              <BusinessCard key={b.id ?? b._id} business={b} onNavigate={onNavigate} />
            ))}
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}