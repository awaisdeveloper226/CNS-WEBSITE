import React, { useState, useEffect, useCallback } from "react";
import { Zap } from "lucide-react";
import { API_ENDPOINTS } from "../../constants/network";
import "./CommunityScreen.css";

const CACHE_KEY = "community_leaderboard";
const CACHE_TTL = 0.25 * 60 * 1000; // 15 seconds

export default function CommunityScreen({ onBack }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setError(null);

    // Step 1: show cache immediately
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data, timestamp } = JSON.parse(raw);
        setLeaderboard(data);
        setLoading(false);

        // Step 2: skip network if cache is fresh
        if (Date.now() - timestamp < CACHE_TTL) return;
      }
    } catch (_) {}

    // Step 3: fetch in background (silent if cache already showing)
    try {
      const response = await fetch(API_ENDPOINTS.COMMUNITY_LEADERBOARD, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Failed to fetch.");

      const ranked = json.map((item, index) => ({
        id: item._id.toString(),
        name: item.name,
        contributions: item.contributions,
        level: item.level,
        rank: index + 1,
      }));

      setLeaderboard(ranked);
      setLoading(false);
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: ranked,
        timestamp: Date.now(),
      }));
    } catch (err) {
      setLoading(false);
      // Only show error if we have nothing to display
      setError(prev =>
        leaderboard.length === 0
          ? `Could not load leaderboard: ${err.message}`
          : prev
      );
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => onBack?.();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [onBack]);

  const getRankClass = (rank) => {
    if (rank === 1) return "leaderboard-item rank-1";
    if (rank === 2) return "leaderboard-item rank-2";
    if (rank === 3) return "leaderboard-item rank-3";
    return "leaderboard-item";
  };

  return (
    <div className="community-screen">
      <div className="community-inner">
        <h1 className="community-screen-title">Community Leaderboard</h1>

        {/* Error state */}
        {error && leaderboard.length === 0 && (
          <div className="error-container">
            <p className="error-text">{error}</p>
            <button className="retry-button" onClick={fetchLeaderboard}>
              Try Again
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && leaderboard.length === 0 && !error && (
          <div className="loading-container">
            <div className="spinner" />
            <p className="loading-text">Fetching ranks...</p>
          </div>
        )}

        {/* Leaderboard list */}
        {leaderboard.length > 0 && (
          <>
            <div className="leaderboard-header">
              <h2 className="leaderboard-title">🏆 Top Contributors</h2>
            </div>

            {leaderboard.length === 0 ? (
              <p className="empty-text">No contributors found.</p>
            ) : (
              <ul className="leaderboard-list">
                {leaderboard.map((item) => (
                  <li key={item.id} className={getRankClass(item.rank)}>
                    <span className="leaderboard-rank">{item.rank}</span>
                    <div className="item-info">
                      <p className="card-title">{item.name}</p>
                      <p className="card-text">
                        Level {item.level} &mdash; {item.contributions} contributions
                      </p>
                    </div>
                    {item.rank <= 3 && (
                      <span className="item-zap">
                        <Zap size={18} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}