import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuthContext } from "./context/AuthContext";
import { API_ENDPOINTS, AUTH_TOKEN_KEY } from "./constants/network";

import NavBar from "./components/Navbar/Navbar";
import HomeScreen from "./screens/Home/HomeScreen";
import AuthScreen from "./screens/Auth/AuthScreen";
import ProfileScreen from "./screens/Profile/ProfileScreen";
import SearchScreen from "./screens/Search/SearchScreen";
import InstructionDetailScreen from "./screens/Instructions/InstructionDetailScreen";
import CommunityScreen from "./screens/Community/CommunityScreen";
import BusinessDetailScreen from "./screens/Detail/BusinessDetailScreen";
import UploadFlowScreen from "./screens/Upload/UploadFlowScreen";


// Warm up the backend
fetch(`${API_ENDPOINTS.BUSINESSES}?skip=0&limit=1`).catch(() => {});

// ── Share-flow sessionStorage keys ────────────────────────────────────────────
// Kept separate from the URL hash on purpose: the hash is the primary source,
// but if anything clears/loses it (a redirect, a reload, another part of the
// app touching window.location), these let the flow recover instead of
// silently dead-ending on "session ended".
const SHARE_PENDING_TOKEN_KEY = "cns_share_pending_token";
const SHARE_DEEPLINK_ATTEMPTED_KEY = "cns_share_deeplink_attempted";

function clearShareSessionKeys() {
  sessionStorage.removeItem(SHARE_PENDING_TOKEN_KEY);
  sessionStorage.removeItem(SHARE_DEEPLINK_ATTEMPTED_KEY);
}

// ── Simple full-screen loading/message UI shared by the share-link flow ──────
function CenteredMessage({ children }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "100vh", backgroundColor: "#f9fafb", gap: 12, padding: 24, textAlign: "center",
    }}>
      {children}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      border: "3px solid #e5e7eb", borderTopColor: "#2563eb",
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

function clearShareHash() {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

function exitGuestSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  clearShareSessionKeys();
  window.location.reload();
}

// ── Shown when a guest backs out of their shared business — they don't get
//    the normal app to fall back into, just a clear explanation + a way out.
function GuestExitScreen({ businessName, onReturnToBusiness }) {
  return (
    <CenteredMessage>
      <p style={{ color: "#374151", margin: 0, fontWeight: 600 }}>
        You're viewing {businessName || "this business"} through a shared link.
      </p>
      <p style={{ color: "#6b7280", margin: 0, fontSize: 14, maxWidth: 320 }}>
        This link only gives access to this one business. Create a free account for full access to CNS.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={onReturnToBusiness}
          style={{ padding: "10px 20px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
        >
          Back to business
        </button>
        <button
          onClick={exitGuestSession}
          style={{ padding: "10px 20px", backgroundColor: "#fff", color: "#2563eb", border: "1px solid #2563eb", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
        >
          Create a full account
        </button>
      </div>
    </CenteredMessage>
  );
}

// ── Inner app — needs AuthContext ─────────────────────────────────────────────
function AppInner() {
  const { user, isLoading } = useAuthContext();
  const isGuestUser = !!user?.isGuest;

  const [tab, setTab]                           = useState("home");
  const [homeBusinesses, setHomeBusinesses]     = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showUploadFlow, setShowUploadFlow]     = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState(null); // { instructionId, businessId }
  const [guestShowExit, setGuestShowExit]       = useState(false);
  const homeScrollOffsetRef = useRef(0);

  // ── Share-link state ─────────────────────────────────────────────────────
  // status: 'idle' | 'loading' | 'ready' | 'error'
  const [shareStatus, setShareStatus] = useState("idle");
  const [shareBusiness, setShareBusinessState] = useState(null);
  const [shareToken, setShareToken] = useState(null);
  const [shareError, setShareError] = useState(null);
  const guestLoginAttempted = useRef(false);

  // 1) On first load, detect a #/share/:token hash — try to hand off to the
  //    installed app, then fall back to fetching a public preview here.
  //    Falls back to a sessionStorage-remembered token if the hash itself
  //    is missing (e.g. after the guest-login reload), so the flow can
  //    recover instead of dead-ending.
  useEffect(() => {
    const hashMatch = window.location.hash.match(/^#\/share\/([^/?]+)/);
    const pendingToken = sessionStorage.getItem(SHARE_PENDING_TOKEN_KEY);
    const token = hashMatch ? hashMatch[1] : pendingToken;
    if (!token) return;

    sessionStorage.setItem(SHARE_PENDING_TOKEN_KEY, token);
    setShareToken(token);
    setShareStatus("loading");

    // Only attempt the app hand-off once per token per browser session — if
    // we already tried (e.g. this is the reload right after guest sign-in),
    // skip straight to fetching the preview with no artificial delay.
    const alreadyAttempted = sessionStorage.getItem(SHARE_DEEPLINK_ATTEMPTED_KEY) === token;
    if (!alreadyAttempted) {
      sessionStorage.setItem(SHARE_DEEPLINK_ATTEMPTED_KEY, token);
      window.location.href = `cns://share/${token}`;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(API_ENDPOINTS.SHARE_RESOLVE(token));
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setShareError(data.message || "This link has expired.");
          setShareStatus("error");
          clearShareSessionKeys();
          return;
        }
        const business = data.businessId
          ? { _id: data.businessId, id: data.businessId, ...data.business }
          : { placeId: data.placeId, ...data.business };
        setShareBusinessState(business);
        setShareStatus("ready");
      } catch (_) {
        setShareError("Something went wrong loading this link.");
        setShareStatus("error");
        clearShareSessionKeys();
      }
    }, alreadyAttempted ? 0 : 1500);

    return () => clearTimeout(timer);
  }, []);

  // 2) SINGLE effect owning both "fold a shared business in" and "reset
  //    state on user change" — these used to be two separate effects that
  //    both fired on the same user transition, and since the reset effect
  //    was declared after the fold-in effect, it ran second and wiped the
  //    business right back out. Merging them removes the ordering race.
  useEffect(() => {
    if (isLoading) return;

    if (user && shareStatus === "ready" && shareBusiness) {
      setSelectedBusiness(shareBusiness);
      setShareStatus("idle");
      setShareBusinessState(null);
      clearShareHash();
      clearShareSessionKeys();
      return;
    }

    // Normal reset on login/logout — only when there's no share flow in
    // progress (shareStatus is "idle" the entire time for ordinary
    // sessions, so this behaves exactly as before for everyone else).
    if (shareStatus === "idle") {
      setTab("home");
      setSelectedBusiness(null);
      setShowUploadFlow(false);
      setSelectedInstruction(null);
      setGuestShowExit(false);
    }
  }, [user, isLoading, shareStatus, shareBusiness]);

  // 3) If the visitor is NOT logged in, silently sign them in as a guest
  //    scoped to this specific link (view/edit/upload all just work
  //    afterward, since every screen only checks for a valid token). A full
  //    reload is used so the existing auth hook re-initializes from the
  //    freshly-stored token without needing to know its internals.
  useEffect(() => {
    if (isLoading) return;
    if (user) return; // handled by effect #2 above
    if (shareStatus !== "ready" || !shareBusiness || !shareToken) return;
    if (guestLoginAttempted.current) return;
    guestLoginAttempted.current = true;

    (async () => {
      try {
        const res = await fetch(API_ENDPOINTS.SHARE_GUEST_LOGIN(shareToken), { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not open this link.");
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        window.location.reload();
      } catch (err) {
        setShareError(err.message || "Could not open this link.");
        setShareStatus("error");
        clearShareSessionKeys();
      }
    })();
  }, [isLoading, user, shareStatus, shareBusiness, shareToken]);

  // ── Load cached businesses from localStorage on start ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem("home_businesses_v2");
      if (raw) {
        const { data, timestamp } = JSON.parse(raw);
        const TEN_MINUTES = 10 * 60 * 1000;
        if (Date.now() - timestamp < TEN_MINUTES) setHomeBusinesses(data);
      }
    } catch (_) {}
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleNavigate       = (business) => setSelectedBusiness(business);
  const handleSearchPress    = () => setTab("search");
  const handleProfilePress   = () => setTab("profile");
  const handleBusinessSelect = (business) => setSelectedBusiness(business);

  const handleTabChange = (newTab) => {
    if (newTab === "add") {
      setShowUploadFlow(true);
    } else {
      setTab(newTab);
      setSelectedBusiness(null);
      setShowUploadFlow(false);
      setSelectedInstruction(null);
    }
  };

  const handleUploadComplete = (resolvedBusiness) => {
    setShowUploadFlow(false);
    if (resolvedBusiness?._id || resolvedBusiness?.id) {
      setSelectedBusiness(resolvedBusiness);
    } else {
      setTab("home");
    }
  };

  const handleGlobalBusinessClaimed = (newId, originalBusiness) => {
    setSelectedBusiness({ ...originalBusiness, _id: newId, id: newId, placeId: undefined });
  };

  const handleViewInstruction = (instructionId, businessId) => {
    setSelectedInstruction({ instructionId, businessId });
  };

  const handleBackFromInstruction = () => {
    setSelectedInstruction(null);
  };

  const handleViewComments = (instructionId) => {
    // TODO: build CommentsScreen and wire up here
    console.log("View comments:", instructionId);
  };

  // ── Share-link loading / error states — take priority over everything ─────
  if (shareStatus === "loading" || (shareStatus === "ready" && !user && !isLoading)) {
    return (
      <CenteredMessage>
        <Spinner />
        <p style={{ color: "#6b7280", margin: 0 }}>
          {shareStatus === "loading" ? "Opening business…" : "Setting things up…"}
        </p>
      </CenteredMessage>
    );
  }

  if (shareStatus === "error") {
    return (
      <CenteredMessage>
        <p style={{ color: "#b91c1c", margin: 0, fontWeight: 600 }}>{shareError}</p>
        <button
          onClick={() => { setShareStatus("idle"); clearShareHash(); clearShareSessionKeys(); }}
          style={{
            marginTop: 8, padding: "10px 24px", backgroundColor: "#2563eb",
            color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer",
          }}
        >
          Go to CNS
        </button>
      </CenteredMessage>
    );
  }

  // ── Loading splash (auth) ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <CenteredMessage>
        <Spinner />
        <p style={{ color: "#6b7280", margin: 0 }}>Loading…</p>
      </CenteredMessage>
    );
  }

  // ── Not logged in (and no share link in play) ──────────────────────────────
  if (!user) return <AuthScreen />;

  // ── Guest (share-link) sessions get a locked-down experience: only their
  //    claimed business, its instructions, and nothing else — no navbar,
  //    no other tabs, no way to browse the rest of the app.
  if (isGuestUser) {
    let guestContent;

    if (guestShowExit) {
      guestContent = (
        <GuestExitScreen
          businessName={selectedBusiness?.name}
          onReturnToBusiness={() => setGuestShowExit(false)}
        />
      );
    } else if (selectedInstruction) {
      guestContent = (
        <InstructionDetailScreen
          instructionId={selectedInstruction.instructionId}
          businessId={selectedInstruction.businessId}
          onBack={handleBackFromInstruction}
        />
      );
    } else if (showUploadFlow) {
      guestContent = (
        <UploadFlowScreen
          onBack={() => setShowUploadFlow(false)}
          onComplete={handleUploadComplete}
          initialBusiness={selectedBusiness}
        />
      );
    } else if (selectedBusiness) {
      guestContent = (
        <BusinessDetailScreen
          business={selectedBusiness}
          onBack={() => setGuestShowExit(true)}
          onAddInstructions={() => setShowUploadFlow(true)}
          onViewInstruction={handleViewInstruction}
          onViewComments={handleViewComments}
          onGlobalClaimed={handleGlobalBusinessClaimed}
        />
      );
    } else if (shareStatus === "loading" || shareStatus === "ready") {
      // Fold-in is still in flight (e.g. auth just resolved a beat before
      // the share-resolve fetch did) — show a spinner instead of bailing
      // out to "session ended" while effect #2 catches up.
      guestContent = (
        <CenteredMessage>
          <Spinner />
          <p style={{ color: "#6b7280", margin: 0 }}>Loading…</p>
        </CenteredMessage>
      );
    } else {
      // No business in hand and no share flow running at all — e.g. a
      // guest refreshed the page with no token recoverable from the hash
      // or sessionStorage.
      guestContent = (
        <CenteredMessage>
          <p style={{ color: "#374151", margin: 0, fontWeight: 600 }}>This shared link session has ended.</p>
          <button
            onClick={exitGuestSession}
            style={{ marginTop: 8, padding: "10px 20px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}
          >
            Go to CNS
          </button>
        </CenteredMessage>
      );
    }

    return <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>{guestContent}</div>;
  }

  // ── Pick the active screen (real, non-guest users) ─────────────────────────
  let screenContent;

  // Instruction detail — highest priority overlay
  if (selectedInstruction) {
    screenContent = (
      <InstructionDetailScreen
        instructionId={selectedInstruction.instructionId}
        businessId={selectedInstruction.businessId}
        onBack={handleBackFromInstruction}
      />
    );
  } else if (showUploadFlow) {
    screenContent = (
      <UploadFlowScreen
        onBack={() => setShowUploadFlow(false)}
        onComplete={handleUploadComplete}
        initialBusiness={selectedBusiness}
      />
    );
  } else if (selectedBusiness) {
    screenContent = (
      <BusinessDetailScreen
        business={selectedBusiness}
        onBack={() => setSelectedBusiness(null)}
        onAddInstructions={() => setShowUploadFlow(true)}
        onViewInstruction={handleViewInstruction}
        onViewComments={handleViewComments}
        onGlobalClaimed={handleGlobalBusinessClaimed}
      />
    );
  } else {
    switch (tab) {
      case "search":
        screenContent = (
          <SearchScreen
            onBusinessSelect={handleBusinessSelect}
            onBack={() => setTab("home")}
          />
        );
        break;
      case "community":
        screenContent = <CommunityScreen onBack={() => setTab("home")} />;
        break;
      case "profile":
        screenContent = <ProfileScreen onBack={() => setTab("home")} />;
        break;
      default: // "home"
        screenContent = (
          <HomeScreen
            onNavigate={handleNavigate}
            onSearchPress={handleSearchPress}
            onProfilePress={handleProfilePress}
            onContributePress={() => handleTabChange("add")}
            businesses={homeBusinesses}
            setBusinesses={setHomeBusinesses}
            scrollOffsetRef={homeScrollOffsetRef}
          />
        );
    }
  }

  // Hide navbar when any overlay is active
  const showNavBar = !showUploadFlow && !selectedBusiness && !selectedInstruction;

  return (
    <div key={user?._id || "logged-out"} style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      <main style={{ flex: 1, paddingBottom: showNavBar ? 72 : 0 }}>
        {screenContent}
      </main>
      {showNavBar && <NavBar active={tab} onChange={handleTabChange} />}
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}