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
  clearShareHash(); // otherwise the reload just re-reads the hash and logs the same guest back in
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
        This link only gives access to this one business. Create an account for full access to CNS.
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
  const { user, isLoading, setSession, completePaymentReturn } = useAuthContext();
  const isGuestUser = !!user?.isGuest;

  const [tab, setTab]                           = useState("home");
  const [homeBusinesses, setHomeBusinesses]     = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showUploadFlow, setShowUploadFlow]     = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState(null); // { instructionId, businessId }
  const [guestShowExit, setGuestShowExit]       = useState(false);
  const homeScrollOffsetRef = useRef(0);

  // ── Share-link state ─────────────────────────────────────────────────────
  // status: 'idle' | 'loading' | 'ready' | 'done' | 'error'
  // 'done' means "a share business was folded into selectedBusiness" — kept
  // distinct from 'idle' on purpose (see effect #2b below) so that finishing
  // the fold-in doesn't itself look like "no share flow ever happened" and
  // re-trigger the plain login/logout reset.
  const [shareStatus, setShareStatus] = useState("idle");
  const [shareBusiness, setShareBusinessState] = useState(null);
  const [shareToken, setShareToken] = useState(null);
  const [shareError, setShareError] = useState(null);
  const guestLoginAttempted = useRef(false);
  // Tracks the last user id we ran the "login/logout reset" for, so that
  // effect #2b only fires on an actual identity change — not on every
  // shareStatus/shareBusiness tick coming out of effect #2a.
  const prevUserIdRef = useRef(undefined);
  const paymentReturnHandled = useRef(false);

  // 0) Detect a #/payment-success hash from Stripe Checkout returning here.
  //    Runs once, independent of auth/user state — the AuthScreen (rendered
  //    below whenever !user) reads mode/otpContext off the same AuthContext
  //    instance, so setting them here is enough for it to land on the
  //    "Set Your Password" screen without any prop drilling.
  useEffect(() => {
    if (paymentReturnHandled.current) return;
    if (!window.location.hash.startsWith("#/payment-success")) return;
    paymentReturnHandled.current = true;

    completePaymentReturn();
    clearShareHash(); // reuses the same hash-clearing helper, name aside
  }, [completePaymentReturn]);

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

  // 2a) Fold a resolved share business into state once we have a user.
  //     Split out from the reset effect below on purpose: this effect writes
  //     shareStatus, and if the reset effect also depended on shareStatus
  //     and treated "not ready" as "reset", the two would ping-pong —
  //     fold in, re-render, reset effect sees shareStatus change and wipes
  //     selectedBusiness right back out. Setting shareStatus to "done"
  //     (instead of "idle") plus gating the reset on user-id change instead
  //     of on shareStatus removes that loop entirely.
  useEffect(() => {
    if (isLoading) return;
    if (!(user && shareStatus === "ready" && shareBusiness)) return;

    setSelectedBusiness(shareBusiness);
    setShareStatus("done");
    setShareBusinessState(null);
    // Real users have the whole site to fall back on, so it's safe (and
    // nicer) to clean up the URL/session once they're folded in. Guests
    // have nothing else to fall back on — keeping the hash + pending
    // token alive is what lets a refresh recover the same business
    // instead of dead-ending on "session ended".
    if (!user.isGuest) {
      clearShareHash();
      clearShareSessionKeys();
    }
  }, [user, isLoading, shareStatus, shareBusiness]);

  // 2b) Normal reset on an actual login/logout/user-switch. Gated on
  //     user?._id changing (via prevUserIdRef) rather than on shareStatus,
  //     so it no longer re-fires as a side effect of 2a completing. Still
  //     skips the reset while a share flow is actively resolving, so it
  //     doesn't stomp on a business that's about to be folded in.
  useEffect(() => {
    if (isLoading) return;

    const currentUserId = user?._id ?? null;
    if (prevUserIdRef.current === currentUserId) return;
    prevUserIdRef.current = currentUserId;

    if (shareStatus === "loading" || shareStatus === "ready") return;

    setTab("home");
    setSelectedBusiness(null);
    setShowUploadFlow(false);
    setSelectedInstruction(null);
    setGuestShowExit(false);
  }, [user, isLoading, shareStatus]);

  // 3) If the visitor is NOT logged in, silently sign them in as a guest
  //    scoped to this specific link (view/edit/upload all just work
  //    afterward, since every screen only checks for a valid token).
  //    setSession populates auth state directly from the guest-login
  //    response — no page reload and no extra AUTH_ME round-trip needed,
  //    since the endpoint already returns both the token and the user.
  //    Once `user` is set here, effect #2a picks up on the very next
  //    render and folds shareBusiness straight into selectedBusiness.
  useEffect(() => {
    if (isLoading) return;
    if (user) return; // handled by effect #2a above
    if (shareStatus !== "ready" || !shareBusiness || !shareToken) return;
    if (guestLoginAttempted.current) return;
    guestLoginAttempted.current = true;

    (async () => {
      try {
        const res = await fetch(API_ENDPOINTS.SHARE_GUEST_LOGIN(shareToken), { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not open this link.");
        setSession(data.token, data.user);
      } catch (err) {
        setShareError(err.message || "Could not open this link.");
        setShareStatus("error");
        clearShareSessionKeys();
        guestLoginAttempted.current = false;
      }
    })();
  }, [isLoading, user, shareStatus, shareBusiness, shareToken, setSession]);

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
  // Covers both "resolving the link" and "signing the guest in" — these used
  // to be two visibly different screens because guest sign-in triggered a
  // full page reload; now it's all in-memory, so one steady message spans
  // the whole thing instead of flashing between two.
  if (shareStatus === "loading" || (shareStatus === "ready" && !user && !isLoading)) {
    return (
      <CenteredMessage>
        <Spinner />
        <p style={{ color: "#6b7280", margin: 0 }}>Opening business…</p>
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
      // out to "session ended" while effect #2a catches up.
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