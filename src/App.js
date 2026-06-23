import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuthContext } from "./context/AuthContext";
import { API_ENDPOINTS } from "./constants/network";

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

// ── Inner app — needs AuthContext ─────────────────────────────────────────────
function AppInner() {
  const { user, isLoading } = useAuthContext();

  const [tab, setTab]                           = useState("home");
  const [homeBusinesses, setHomeBusinesses]     = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showUploadFlow, setShowUploadFlow]     = useState(false);
  const [selectedInstruction, setSelectedInstruction] = useState(null); // { instructionId, businessId }
  const homeScrollOffsetRef = useRef(0);

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

  // ── Reset state when user changes ──
  useEffect(() => {
    setTab("home");
    setSelectedBusiness(null);
    setShowUploadFlow(false);
    setSelectedInstruction(null);
  }, [user]);

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

  // ── Loading splash ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: "100vh", backgroundColor: "#f9fafb", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          border: "3px solid #e5e7eb", borderTopColor: "#2563eb",
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ color: "#6b7280", margin: 0 }}>Loading…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) return <AuthScreen />;

  // ── Pick the active screen ─────────────────────────────────────────────────
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