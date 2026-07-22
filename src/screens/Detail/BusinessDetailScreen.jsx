import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ArrowLeft, MapPin, Building, CheckCircle, Package, UtensilsCrossed,
  User, ThumbsUp, ThumbsDown, Plus, ClipboardList, Navigation, X,
  Mic, ShieldCheck, Share2, Truck,
} from "lucide-react";
import { API_ENDPOINTS } from "../../constants/network";
import { useAuthContext } from "../../context/AuthContext";
import EntryPinWidget from "./asdf";
import "./BusinessDetailScreen.css";

const GOOGLE_MAPS_EMBED_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_EMBED_API_KEY;

const isGlobalBusiness = (b) => !!b.placeId && !b._id && !b.id;

/* -------------------------------------------------------------------------- */
/* SHARE HELPER                                                                */
/* -------------------------------------------------------------------------- */

async function shareBusiness({ token, businessId, placeId, name, address, type, coordinates }) {
  const res = await fetch(API_ENDPOINTS.SHARE_CREATE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ businessId, placeId, name, address, type, coordinates }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Could not create share link");

  const shareUrl = `https://cnsroute.com/#/share/${data.token}`;
  if (navigator.share) {
    await navigator.share({ title: name, url: shareUrl });
  } else {
    await navigator.clipboard.writeText(shareUrl);
    alert("Link copied to clipboard!");
  }
}

/* -------------------------------------------------------------------------- */
/* SOURCE BADGE                                                                */
/* -------------------------------------------------------------------------- */

export const SourceBadge = ({ isOwner }) => (
  <span className={`bds-source-badge ${isOwner ? "owner" : "courier"}`}>
    {isOwner ? <ShieldCheck size={11} /> : <Truck size={11} />}
    {isOwner ? "Business Owner" : "From Courier"}
  </span>
);

/* -------------------------------------------------------------------------- */
/* MAP MODAL                                                                   */
/* -------------------------------------------------------------------------- */
// ── FIX: previously this only ever geocoded/queried `address`, so it always
// showed the business's registered street address — never the courier entry
// pin (which is frequently a different spot: a mall entrance, side gate,
// loading dock, etc). It now accepts an optional `entryPin` and, when
// present, centers/queries on the pin's actual coordinates instead.
const MapModal = ({ visible, address, businessName, entryPin, onClose }) => {
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (visible) { setMapLoading(true); setMapError(false); }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onClose]);

  const hasPin = entryPin?.lat != null && entryPin?.lng != null;
  // Prefer the actual entry pin coordinates over the plain address so the
  // map centers on where the courier should actually go.
  const mapQuery = hasPin ? `${entryPin.lat},${entryPin.lng}` : address;
  const encodedQuery = encodeURIComponent(mapQuery);
  const mapSrc = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_EMBED_API_KEY}&q=${encodedQuery}&zoom=${hasPin ? 18 : 16}`;

  const openInMaps = () => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`,
      "_blank", "noopener,noreferrer",
    );
  };

  if (!visible) return null;

  return (
    <div className="bds-map-overlay" role="dialog" aria-modal="true" aria-label="Map">
      <div className="bds-map-header">
        <div className="bds-map-header-left">
          <div className="bds-map-header-icon"><Navigation size={16} /></div>
          <div className="bds-map-header-text">
            <p className="bds-map-header-title">{businessName}</p>
            <p className="bds-map-header-subtitle">
              {hasPin ? (entryPin.label || "Courier Entry Point") : address}
            </p>
          </div>
        </div>
        <div className="bds-map-header-actions">
          <button className="bds-open-maps-button" onClick={openInMaps}>Open in Maps</button>
          <button className="bds-map-close-button" onClick={onClose} aria-label="Close map"><X size={18} /></button>
        </div>
      </div>

      {mapError ? (
        <div className="bds-map-error-overlay">
          <MapPin size={48} />
          <p className="bds-map-error-title">Map unavailable</p>
          <p className="bds-map-error-subtitle">Tap "Open in Maps" above to navigate</p>
          <button className="bds-map-error-button" onClick={openInMaps}>
            <Navigation size={16} />Open in Maps App
          </button>
        </div>
      ) : (
        <div className="bds-map-iframe-wrap">
          {mapLoading && (
            <div className="bds-map-loading-overlay">
              <div className="bds-spinner" />
              <p className="bds-loading-text">Loading map…</p>
            </div>
          )}
          <iframe
            className="bds-map-iframe"
            src={mapSrc}
            title="Business location map"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setMapLoading(false)}
            onError={() => { setMapLoading(false); setMapError(true); }}
          />
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* GLOBAL BUSINESS SCREEN                                                      */
/* -------------------------------------------------------------------------- */

const GlobalBusinessScreen = ({
  business, onBack, onAddInstructions, onViewInstruction, onViewComments, onGlobalClaimed,
}) => {
  const { user, token } = useAuthContext();
  const [showMap, setShowMap] = useState(false);
  const [claimedLocalId, setClaimedLocalId] = useState(null);
  // ── Tracks the current entry pin so MapModal can center on it. Starts
  // null (global businesses have no pin yet) and gets filled in as soon as
  // EntryPinWidget reports one back via onPinChange.
  const [currentPin, setCurrentPin] = useState(null);

  // Note: browser Back-button handling is centralized in App.js (a single
  // popstate listener there resets navigation to home/root). This screen no
  // longer listens for popstate itself — doing so here as well would fire
  // alongside App.js's handler on the same event and cause double navigation.

  if (claimedLocalId) {
    const upgradedBusiness = { ...business, _id: claimedLocalId, id: claimedLocalId, placeId: undefined };
    return (
      <BusinessDetailContent
        business={upgradedBusiness}
        onBack={onBack}
        onAddInstructions={onAddInstructions}
        onViewInstruction={onViewInstruction}
        onViewComments={onViewComments}
      />
    );
  }

  const placeId = business.placeId;
  const businessType = business.type === "Mall" || business.type === "Standalone" ? business.type : "Other";
  const resolvedCoords =
    business.coordinates?.lat != null
      ? { lat: business.coordinates.lat, lng: business.coordinates.lng }
      : business.lat != null && business.lng != null
        ? { lat: business.lat, lng: business.lng }
        : null;

  const handleShare = async () => {
    try {
      await shareBusiness({
        token,
        placeId,
        name: business.name,
        address: business.address,
        type: businessType,
        coordinates: resolvedCoords,
      });
    } catch (err) {
      if (err.name !== "AbortError") alert(err.message || "Couldn't share this business.");
    }
  };

  return (
    <div className="bds-screen">
      <MapModal
        visible={showMap}
        address={business.address}
        businessName={business.name}
        entryPin={currentPin}
        onClose={() => setShowMap(false)}
      />

      <div className="bds-header-wrap">
        <div className="bds-header">
          <button className="bds-back-button" onClick={onBack} aria-label="Go back"><ArrowLeft size={22} /></button>
          <h1 className="bds-header-title">{business.name}</h1>
          <button className="bds-back-button" onClick={handleShare} aria-label="Share"><Share2 size={22} /></button>
        </div>
      </div>

      <div className="bds-scroll-content">
        <div className="bds-info-card">
          <div className="bds-info-card-top">
            <div className="bds-business-icon-wrap"><Building size={22} /></div>
            <div>
              <p className="bds-business-name">{business.name}</p>
              <p className="bds-business-type">{business.type || "Business"}</p>
            </div>
          </div>
          <div className="bds-divider" />
          <div className="bds-address-row">
            <MapPin size={16} />
            <p className="bds-address-text">{business.address}</p>
          </div>
          <button className="bds-navigate-button" onClick={() => setShowMap(true)}>
            <Navigation size={16} />View on Map
          </button>
        </div>

        <EntryPinWidget
          businessId={placeId}
          businessAddress={business.address}
          businessCoordinates={resolvedCoords}
          initialPin={null}
          isGlobal
          globalMeta={{ placeId, name: business.name, type: businessType, coordinates: resolvedCoords }}
          onGlobalClaimed={(newId) => { setClaimedLocalId(newId); onGlobalClaimed?.(newId, business); }}
          onPinChange={setCurrentPin}
          userName={user?.name}
        />

        <div className="bds-section-header">
          <h2 className="bds-section-title">Instructions</h2>
        </div>

        <div className="bds-empty-state">
          <div className="bds-empty-icon-wrap"><ClipboardList size={36} /></div>
          <p className="bds-empty-title">No instructions yet</p>
          <p className="bds-empty-subtitle">Be the first to add delivery instructions for this location</p>
        </div>
      </div>

      {/* Global businesses never have instructions yet — always show FAB */}
      <div className="bds-fab-wrap">
        <button className="bds-fab-button" onClick={onAddInstructions}>
          <span className="bds-fab-icon-wrap"><Plus size={20} /></span>
          Add Instructions
        </button>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* CONTRIBUTION CARD                                                           */
/* -------------------------------------------------------------------------- */

const ContributionDisplay = ({ contrib, currentUserId, onVote, onPress, onComment }) => {
  const [isVoting, setIsVoting] = useState(false);

  const safeId = String(contrib.id || contrib._id || "");
  const userVote = contrib.votedUsers?.find((v) => v.userId === currentUserId);
  const isLikedByUser = userVote?.voteType === "like";
  const isDislikedByUser = userVote?.voteType === "dislike";
  const isOwner = !!contrib.isVerifiedBusinessInstruction;

  const formatDate = (dateString) => {
    if (!dateString) return "Recently";
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? "Recently" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return "Recently"; }
  };

  const handleVotePress = async (e, type) => {
    e.stopPropagation();
    if (isVoting || !safeId) return;
    setIsVoting(true);
    try { await onVote(safeId, type); } finally { setIsVoting(false); }
  };

  const deliveryTypeLabel =
    contrib.type === "Both" ? "Courier & Food"
    : contrib.type === "Courier/Parcel Delivery" ? "Courier"
    : contrib.type === "Food Delivery" ? "Food"
    : contrib.type || "";

  return (
    <button className={`bds-contribution-card${isOwner ? " is-owner" : ""}`} onClick={() => onPress(contrib)}>
      <div className="bds-contribution-header">
        <div className={`bds-avatar-wrap${isOwner ? " is-owner" : ""}`}>
          {isOwner ? <ShieldCheck size={16} /> : <User size={16} />}
        </div>
        <div className="bds-contribution-user-info">
          <p className="bds-contribution-username">{contrib.userName || "Anonymous User"}</p>
          <div className="bds-meta-row">
            <SourceBadge isOwner={isOwner} />
            {deliveryTypeLabel && (
              <span className="bds-type-pill">
                {(contrib.type === "Courier/Parcel Delivery" || contrib.type === "Both") && <Package size={11} color="#3b82f6" />}
                {(contrib.type === "Food Delivery" || contrib.type === "Both") && <UtensilsCrossed size={11} color="#f59e0b" />}
                <span className="bds-type-pill-text">{deliveryTypeLabel}</span>
              </span>
            )}
          </div>
        </div>
        <span className="bds-date-text">{formatDate(contrib.timestamp)}</span>
      </div>

      {contrib.notes?.trim() && <p className="bds-contribution-notes">{contrib.notes}</p>}

      {contrib.audioUrl && (
        <div className="bds-audio-preview">
          <Mic size={14} />
          <span className="bds-audio-preview-text">Audio Instruction</span>
        </div>
      )}

      <div className="bds-contribution-footer">
        <button className={`bds-vote-button${isLikedByUser ? " like-active" : ""}`} onClick={(e) => handleVotePress(e, "like")} disabled={isVoting}>
          <ThumbsUp size={14} color={isLikedByUser ? "#fff" : "#2563eb"} />
          <span className="bds-vote-count" style={{ color: isLikedByUser ? "#fff" : "#2563eb" }}>{contrib.likes || 0}</span>
        </button>
        <button className={`bds-vote-button${isDislikedByUser ? " dislike-active" : ""}`} onClick={(e) => handleVotePress(e, "dislike")} disabled={isVoting}>
          <ThumbsDown size={14} color={isDislikedByUser ? "#fff" : "#9ca3af"} />
          <span className="bds-vote-count" style={{ color: isDislikedByUser ? "#fff" : "#9ca3af" }}>{contrib.dislikes || 0}</span>
        </button>
      </div>
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* BUSINESS DETAIL SCREEN (router)                                             */
/* -------------------------------------------------------------------------- */

export default function BusinessDetailScreen({
  business, onBack, onAddInstructions, onViewInstruction, onViewComments, onGlobalClaimed,
}) {
  if (isGlobalBusiness(business)) {
    return (
      <GlobalBusinessScreen
        business={business} onBack={onBack} onAddInstructions={onAddInstructions}
        onViewInstruction={onViewInstruction} onViewComments={onViewComments} onGlobalClaimed={onGlobalClaimed}
      />
    );
  }
  return (
    <BusinessDetailContent
      business={business} onBack={onBack} onAddInstructions={onAddInstructions}
      onViewInstruction={onViewInstruction} onViewComments={onViewComments}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* BUSINESS DETAIL CONTENT                                                     */
/* -------------------------------------------------------------------------- */

function BusinessDetailContent({
  business, onBack, onAddInstructions, onViewInstruction, onViewComments,
}) {
  const { token, user } = useAuthContext();
  const [detailedBusiness, setDetailedBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMap, setShowMap] = useState(false);
  // ── Tracks the current entry pin so MapModal can center on it. Seeded
  // from the fetched business's entryPin once loaded, then kept in sync
  // live via EntryPinWidget's onPinChange whenever the user edits/removes it.
  const [currentPin, setCurrentPin] = useState(null);
  const pinSeededRef = useRef(false);

  const CACHE_KEY = `business_detail_${String(business.id || business._id || "")}`;
  const CACHE_TTL = 0.25 * 60 * 1000;

  const businessId = useMemo(
    () => String(business.id || business._id || ""),
    [business.id, business._id],
  );

  // Note: browser Back-button handling is centralized in App.js (a single
  // popstate listener there resets navigation to home/root). This screen no
  // longer listens for popstate itself — doing so here as well would fire
  // alongside App.js's handler on the same event and cause double navigation.

  useEffect(() => {
    if (!businessId) { setError("Invalid business ID"); setLoading(false); return; }

    const load = async () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const { data, timestamp } = JSON.parse(raw);
          setDetailedBusiness(data); setLoading(false);
          if (Date.now() - timestamp < CACHE_TTL) return;
        }
      } catch (_) {}

      try {
        const response = await fetch(API_ENDPOINTS.BUSINESS_DETAIL(businessId));
        if (!response.ok) { const err = await response.json(); throw new Error(err.message || "Failed to load business"); }
        const data = await response.json();
        setDetailedBusiness(data); setLoading(false);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      } catch (err) {
        setLoading(false);
        setDetailedBusiness((prev) => { if (!prev) setError(err.message); return prev; });
      }
    };

    load();
  }, [businessId]);

  // Seed currentPin from the fetched business exactly once — after that,
  // EntryPinWidget's onPinChange is the source of truth (so a background
  // cache/network refresh doesn't stomp a pin the user just edited).
  useEffect(() => {
    if (detailedBusiness && !pinSeededRef.current) {
      setCurrentPin(detailedBusiness.entryPin ?? null);
      pinSeededRef.current = true;
    }
  }, [detailedBusiness]);

  const handleContributionPress = (contribution) => {
    const instructionId = contribution.id || contribution._id;
    if (instructionId && businessId) onViewInstruction(String(instructionId), String(businessId));
  };

  const handleVote = useCallback(async (contributionId, type) => {
    if (!token || !user) return;
    const endpoint = type === "like"
      ? API_ENDPOINTS.CONTRIBUTION_LIKE(contributionId)
      : API_ENDPOINTS.CONTRIBUTION_DISLIKE(contributionId);
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setDetailedBusiness((prev) =>
        prev ? {
          ...prev,
          contributions: prev.contributions?.map((c) =>
            (c.id || c._id) === contributionId
              ? { ...c, likes: data.likes, dislikes: data.dislikes, votedUsers: data.votedUsers }
              : c
          ),
        } : prev
      );
    } catch (err) { console.error("Vote failed:", err.message); }
  }, [token, user]);

  const handleShare = async () => {
    if (!detailedBusiness) return;
    try {
      await shareBusiness({
        token,
        businessId,
        name: detailedBusiness.name,
        address: detailedBusiness.address,
        type: detailedBusiness.type,
        coordinates: detailedBusiness.coordinates,
      });
    } catch (err) {
      if (err.name !== "AbortError") alert(err.message || "Couldn't share this business.");
    }
  };

  if (loading && !detailedBusiness) {
    return (
      <div className="bds-centered-fill">
        <div className="bds-spinner" />
        <p className="bds-loading-text">Loading details…</p>
      </div>
    );
  }

  if (!detailedBusiness) {
    return (
      <div className="bds-centered-fill">
        <ClipboardList size={52} color="#d1d5db" />
        <p className="bds-error-state-title">{error || "Failed to load business"}</p>
        <button className="bds-retry-button" onClick={onBack}>Go Back</button>
      </div>
    );
  }

  const contributions = detailedBusiness.contributions ?? [];
  const entryPin = detailedBusiness.entryPin ?? null;

  return (
    <div className="bds-screen">
      <MapModal
        visible={showMap}
        address={detailedBusiness.address}
        businessName={detailedBusiness.name}
        entryPin={currentPin}
        onClose={() => setShowMap(false)}
      />

      <div className="bds-header-wrap">
        <div className="bds-header">
          <button className="bds-back-button" onClick={onBack} aria-label="Go back"><ArrowLeft size={22} /></button>
          <h1 className="bds-header-title">{detailedBusiness.name}</h1>
          <button className="bds-back-button" onClick={handleShare} aria-label="Share"><Share2 size={22} /></button>
        </div>
      </div>

      <div className="bds-scroll-content">
        {error && <div className="bds-error-banner"><p className="bds-error-banner-text">{error}</p></div>}

        <div className="bds-info-card">
          <div className="bds-info-card-top">
            <div className="bds-business-icon-wrap"><Building size={22} /></div>
            <div style={{ flex: 1 }}>
              <p className="bds-business-name">{detailedBusiness.name}</p>
              <p className="bds-business-type">{detailedBusiness.type}</p>
            </div>
            {detailedBusiness.isVerified && (
              <div className="bds-verified-chip">
                <CheckCircle size={13} />
                <span className="bds-verified-chip-text">Verified</span>
              </div>
            )}
          </div>
          <div className="bds-divider" />
          <div className="bds-address-row">
            <MapPin size={16} />
            <p className="bds-address-text">{detailedBusiness.address}</p>
          </div>
          <button className="bds-navigate-button" onClick={() => setShowMap(true)}>
            <Navigation size={16} />View on Map
          </button>
        </div>

        <EntryPinWidget
          businessId={businessId}
          businessAddress={detailedBusiness.address}
          businessCoordinates={detailedBusiness.coordinates ?? null}
          initialPin={entryPin}
          onPinChange={setCurrentPin}
          userName={user?.name}
        />

        <div className="bds-section-header">
          <h2 className="bds-section-title">Instructions</h2>
        </div>

        {contributions.length === 0 ? (
          <div className="bds-empty-state">
            <div className="bds-empty-icon-wrap"><ClipboardList size={36} /></div>
            <p className="bds-empty-title">No instructions yet</p>
            <p className="bds-empty-subtitle">Be the first to add delivery instructions for this location</p>
          </div>
        ) : (
          contributions.map((c) => (
            <ContributionDisplay
              key={c.id || c._id}
              contrib={c}
              currentUserId={user?._id || user?.id}
              onVote={handleVote}
              onPress={handleContributionPress}
              onComment={onViewComments}
            />
          ))
        )}
      </div>

      {/* FAB — only show if no instruction exists yet */}
      {contributions.length === 0 && (
        <div className="bds-fab-wrap">
          <button className="bds-fab-button" onClick={onAddInstructions}>
            <span className="bds-fab-icon-wrap"><Plus size={20} /></span>
            Add Instructions
          </button>
        </div>
      )}
    </div>
  );
}