import { useState, useEffect } from "react";
import { User, LogOut } from "lucide-react";
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

export default function ProfileScreen({ onBack }) {
  const { user, token, logout } = useAuthContext();
  const [profile, setProfile] = useState(user);
  const [error, setError]     = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

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

  if (!user) return null;

  const dp = profile || user;
  const contributions = dp.contributions || 0;
  const likesReceived = dp.totalLikesReceived || 0;

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