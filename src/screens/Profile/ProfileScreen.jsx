import { useState, useEffect } from "react";
import { User, LogOut, XCircle } from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";
import { API_ENDPOINTS } from "../../constants/network";
import "./ProfileScreen.css";

const FIFTEEN_SECONDS = 0.25 * 60 * 1000;

const getLevelTitle = (level) => {
  if (level >= 10) return "Master Mapper";
  if (level >= 5)  return "Local Guide";
  if (level >= 3)  return "Expert Navigator";
  return "Rookie Courier";
};

const formatEndDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

export default function ProfileScreen({ onBack }) {
  const { user, token, logout } = useAuthContext();
  const [profile, setProfile] = useState(user);
  const [error, setError]     = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Cancel-subscription flow ────────────────────────────────────────────
  // step: 'idle' | 'confirm' | 'otp'
  // 'confirm' just asks "are you sure" before we even send a code.
  // 'otp' is shown only after request-cancellation-otp has succeeded, and
  // is the only step that can actually cancel anything (via confirm-cancellation).
  const [cancelStep, setCancelStep] = useState("idle");
  const [cancelOtp, setCancelOtp] = useState("");
  const [cancelError, setCancelError] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelInfo, setCancelInfo] = useState(null); // e.g. "Code sent, check your email"

  const PROFILE_CACHE_KEY = `profile_${user?.id || user?._id}`;

  // ── Step 1: load from localStorage cache immediately ──────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setProfile(parsed.data ?? parsed);
      }
    } catch (_) {}
  }, []);

  // ── Step 2: fetch fresh data if cache is stale ────────────────────────────
  useEffect(() => {
    if (!token || !user) return;

    const fetchProfile = async () => {
      try {
        const raw = localStorage.getItem(PROFILE_CACHE_KEY);
        if (raw) {
          const { timestamp } = JSON.parse(raw);
          if (Date.now() - timestamp < FIFTEEN_SECONDS) return;
        }
      } catch (_) {}

      try {
        const res = await fetch(API_ENDPOINTS.AUTH_ME, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem(PROFILE_CACHE_KEY);
            logout();
            return;
          }
          throw new Error(data.message || "Failed to fetch profile.");
        }

        setProfile(data);
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      } catch (err) {
        setError(err.message || "Could not load profile data.");
      }
    };

    fetchProfile();
  }, [token]);

  const handleLogout = () => setShowConfirm(true);

  const confirmLogout = () => {
    localStorage.removeItem(PROFILE_CACHE_KEY);
    logout();
  };

  // Persists a patch to the cached profile (mirrors the pattern in the
  // fetch effect above) and updates local state, without waiting on a
  // full AUTH_ME refetch.
  const patchProfileCache = (patch) => {
    setProfile((prev) => {
      const updated = { ...(prev || {}), ...patch };
      try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ data: updated, timestamp: Date.now() }));
      } catch (_) {}
      return updated;
    });
  };

  const openCancelFlow = () => {
    setCancelError(null);
    setCancelInfo(null);
    setCancelOtp("");
    setCancelStep("confirm");
  };

  const closeCancelFlow = () => {
    setCancelStep("idle");
    setCancelError(null);
    setCancelInfo(null);
    setCancelOtp("");
  };

  // Step 1 of 2: user has confirmed intent — send them a code, don't cancel yet.
  const requestCancellationOtp = async () => {
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch(API_ENDPOINTS.REQUEST_CANCELLATION_OTP, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not send confirmation code.");
      setCancelInfo(data.message || "A confirmation code has been sent to your email.");
      setCancelStep("otp");
    } catch (err) {
      setCancelError(err.message || "Could not send confirmation code.");
    } finally {
      setCancelLoading(false);
    }
  };

  // Step 2 of 2: verify the code — this is the only call that actually cancels.
  const confirmCancellation = async () => {
    if (!cancelOtp.trim()) {
      setCancelError("Enter the code from your email.");
      return;
    }
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch(API_ENDPOINTS.CONFIRM_CANCELLATION, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp: cancelOtp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not confirm cancellation.");

      patchProfileCache({
        subscriptionStatus: data.subscriptionStatus || "canceled",
        subscriptionEndsAt: data.subscriptionEndsAt || null,
      });
      closeCancelFlow();
    } catch (err) {
      setCancelError(err.message || "Could not confirm cancellation.");
    } finally {
      setCancelLoading(false);
    }
  };

  if (!user) return null;

  const dp = profile || user;
  const contributions = dp.contributions || 0;
  const likesReceived = dp.totalLikesReceived || 0;
  const isActiveSubscription = dp.subscriptionStatus === "active";
  const isCanceledSubscription = dp.subscriptionStatus === "canceled";

  return (
    <div className="ps-root">

      {/* Confirm logout dialog */}
      {showConfirm && (
        <div className="ps-overlay">
          <div className="ps-dialog">
            <h3 className="ps-dialog-title">Logout</h3>
            <p className="ps-dialog-msg">Are you sure you want to logout?</p>
            <div className="ps-dialog-actions">
              <button className="ps-dialog-cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="ps-dialog-confirm" onClick={confirmLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel-subscription flow: step 1 — are you sure */}
      {cancelStep === "confirm" && (
        <div className="ps-overlay">
          <div className="ps-dialog">
            <h3 className="ps-dialog-title">Cancel Subscription</h3>
            <p className="ps-dialog-msg">
              We'll email you a confirmation code first — your subscription won't be
              canceled until you enter it.
            </p>
            {cancelError && (
              <p style={{ color: "#dc3545", fontSize: 14, margin: "8px 0 0" }}>{cancelError}</p>
            )}
            <div className="ps-dialog-actions">
              <button className="ps-dialog-cancel" onClick={closeCancelFlow} disabled={cancelLoading}>
                Never mind
              </button>
              <button className="ps-dialog-confirm" onClick={requestCancellationOtp} disabled={cancelLoading}>
                {cancelLoading ? "Sending…" : "Send code"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel-subscription flow: step 2 — enter the code */}
      {cancelStep === "otp" && (
        <div className="ps-overlay">
          <div className="ps-dialog">
            <h3 className="ps-dialog-title">Enter Confirmation Code</h3>
            {cancelInfo && (
              <p className="ps-dialog-msg">{cancelInfo}</p>
            )}
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={cancelOtp}
              onChange={(e) => setCancelOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="6-digit code"
              style={{
                width: "100%", boxSizing: "border-box", fontSize: 18, letterSpacing: 4,
                textAlign: "center", padding: "10px 12px", marginTop: 8,
                border: "1px solid #dee2e6", borderRadius: 8,
              }}
            />
            {cancelError && (
              <p style={{ color: "#dc3545", fontSize: 14, margin: "8px 0 0" }}>{cancelError}</p>
            )}
            <div className="ps-dialog-actions">
              <button className="ps-dialog-cancel" onClick={closeCancelFlow} disabled={cancelLoading}>
                Never mind
              </button>
              <button className="ps-dialog-confirm" onClick={confirmCancellation} disabled={cancelLoading}>
                {cancelLoading ? "Confirming…" : "Confirm Cancellation"}
              </button>
            </div>
            <button
              onClick={requestCancellationOtp}
              disabled={cancelLoading}
              style={{
                marginTop: 12, background: "none", border: "none", color: "#2563eb",
                fontSize: 13, cursor: "pointer", textDecoration: "underline",
              }}
            >
              Resend code
            </button>
          </div>
        </div>
      )}

      <div className="ps-inner">
        <h1 className="ps-screen-title">My Profile</h1>

        {error && <div className="ps-error-banner">{error}</div>}

        {/* ── Avatar card ── */}
        <div className="ps-profile-summary">
          <div className="ps-avatar">
            <User size={60} color="#2563eb" />
          </div>
          <p className="ps-name">{dp.name}</p>
          <p className="ps-level">Level {dp.level}: {getLevelTitle(dp.level)}</p>
          <p className="ps-email">{dp.email || ""}</p>
        </div>

        {/* ── Stats ── */}
        <h2 className="ps-section-title" style={{ marginTop: 20 }}>Contribution Statistics</h2>
        <div className="ps-stats">
          <div className="ps-stat-box">
            <span className="ps-stat-number">{contributions}</span>
            <span className="ps-stat-label">Contributions</span>
          </div>
          <div className="ps-stat-box">
            <span className="ps-stat-number">{dp.level}</span>
            <span className="ps-stat-label">Current Level</span>
          </div>
          <div className="ps-stat-box">
            <span className="ps-stat-number">{likesReceived}</span>
            <span className="ps-stat-label">Likes Received</span>
          </div>
        </div>

        {/* ── Badges ── */}
        {dp.badges && dp.badges.length > 0 && (
          <>
            <h2 className="ps-section-title">Earned Badges</h2>
            <div className="ps-badges">
              {dp.badges.map((badge, i) => (
                <span key={i} className="ps-badge">{badge}</span>
              ))}
            </div>
          </>
        )}

        {/* ── Subscription ── */}
        {(isActiveSubscription || isCanceledSubscription) && (
          <>
            <h2 className="ps-section-title" style={{ marginTop: 20 }}>Subscription</h2>
            {isCanceledSubscription ? (
              <p style={{ color: "#6b7280", fontSize: 14 }}>
                Your subscription has been canceled.
                {formatEndDate(dp.subscriptionEndsAt)
                  ? ` You will continue to have full access to the app until the end of your current billing cycle on ${formatEndDate(dp.subscriptionEndsAt)}.`
                  : " You will continue to have full access to the app until the end of your current billing cycle."}
              </p>
            ) : (
              <button
                onClick={openCancelFlow}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 16px", backgroundColor: "#fff", color: "#dc3545",
                  border: "1px solid #dc3545", borderRadius: 8, fontWeight: 600,
                  cursor: "pointer", marginTop: 4,
                }}
              >
                <XCircle size={18} color="#dc3545" />
                <span>Cancel Subscription</span>
              </button>
            )}
          </>
        )}

        {/* ── Logout ── */}
        <button className="ps-logout-btn" onClick={handleLogout}>
          <LogOut size={20} color="#fff" />
          <span>Logout</span>
        </button>

        <div style={{ height: 50 }} />
      </div>
    </div>
  );
}