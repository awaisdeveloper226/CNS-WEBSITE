import React, { useState, useEffect, useRef } from "react";
import { API_ENDPOINTS } from "../../constants/network";
import "./UploadFlowScreen.css";

// ─────────────────────────────────────────────
// ICONS (inline SVG replacements for lucide-react-native)
// ─────────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor", strokeWidth = 2, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
  </svg>
);

const Icons = {
  ArrowLeft: ({ size, color }) => <Icon size={size} color={color} d="M19 12H5M12 19l-7-7 7-7" />,
  Package: ({ size, color }) => <Icon size={size} color={color} d={["M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z", "M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"]} />,
  UtensilsCrossed: ({ size, color }) => <Icon size={size} color={color} d={["M3 2l7.5 7.5", "M7.5 9.5L2 15l5 5 6-6", "M21 2l-7.5 7.5", "M16.5 9.5L22 15l-5 5-6-6", "M12 12l2-2"]} />,
  Camera: ({ size, color }) => <Icon size={size} color={color} d={["M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"]}><circle cx="12" cy="13" r="4" stroke={color} strokeWidth="2" fill="none" /></Icon>,
  Upload: ({ size, color }) => <Icon size={size} color={color} d={["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"]} />,
  User: ({ size, color }) => <Icon size={size} color={color} d={["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"]}><circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" fill="none" /></Icon>,
  Video: ({ size, color }) => <Icon size={size} color={color} d={["M23 7l-7 5 7 5V7z", "M1 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V5z"]} />,
  X: ({ size, color }) => <Icon size={size} color={color} d={["M18 6L6 18", "M6 6l12 12"]} />,
  Mic: ({ size, color }) => <Icon size={size} color={color} d={["M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z", "M19 10v2a7 7 0 01-14 0v-2", "M12 19v4", "M8 23h8"]} />,
  Lock: ({ size, color }) => <Icon size={size} color={color} d={["M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z"]}><path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth="2" fill="none" /></Icon>,
  Send: ({ size, color }) => <Icon size={size} color={color} d={["M22 2L11 13", "M22 2L15 22 11 13 2 9l20-7z"]} />,
  Trash2: ({ size, color }) => <Icon size={size} color={color} d={["M3 6h18", "M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2", "M10 11v6", "M14 11v6"]} />,
  Search: ({ size, color }) => <Icon size={size} color={color} d={["M11 19a8 8 0 100-16 8 8 0 000 16z", "M21 21l-4.35-4.35"]} />,
  MapPin: ({ size, color }) => <Icon size={size} color={color} d={["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"]}><circle cx="12" cy="10" r="3" stroke={color} strokeWidth="2" fill="none" /></Icon>,
  Building2: ({ size, color }) => <Icon size={size} color={color} d={["M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18z", "M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h2", "M18 9h2a2 2 0 012 2v9a2 2 0 01-2 2h-2", "M10 6h4", "M10 10h4", "M10 14h4", "M10 18h4"]} />,
  ChevronRight: ({ size, color }) => <Icon size={size} color={color} d="M9 18l6-6-6-6" />,
  Map: ({ size, color }) => <Icon size={size} color={color} d={["M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z", "M8 2v16", "M16 6v16"]} />,
  Navigation: ({ size, color }) => <Icon size={size} color={color} d="M3 11l19-9-9 19-2-8-8-2z" />,
  CheckCircle: ({ size, color }) => <Icon size={size} color={color} d={["M22 11.08V12a10 10 0 11-5.93-9.14", "M22 4L12 14.01l-3-3"]} />,
  ShieldCheck: ({ size, color }) => <Icon size={size} color={color} d={["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M9 12l2 2 4-4"]} />,
  ParkingSquare: ({ size, color }) => <Icon size={size} color={color} d={["M3 3h18v18H3z", "M9 17V7h4a3 3 0 010 6H9"]} />,
  Compass: ({ size, color }) => <Icon size={size} color={color} d={["M12 22a10 10 0 100-20 10 10 0 000 20z", "M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"]} />,
};

// ─────────────────────────────────────────────
// CONFIG — Cloudinary (same account the app uploads to)
// ─────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dvmoaqsdb";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const fmtDuration = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

// Auth token — matches key used by SearchScreen.jsx on the website
const getToken = () => {
  try {
    return localStorage.getItem("courierNavigatorToken");
  } catch {
    return null;
  }
};

// Real Cloudinary upload — takes an actual browser File/Blob, not a uri string.
async function uploadToCloudinary(file, resourceType) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("resource_type", resourceType);
  const res = await fetch(CLOUDINARY_API_URL, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    let message = "Upload failed";
    try {
      const err = await res.json();
      message = err.error?.message || message;
    } catch (_) {}
    throw new Error(message);
  }
  const data = await res.json();
  return data.secure_url;
}

// A business is "unregistered" (needs to be POST'd first) when it has a
// placeId from an external search but no local MongoDB _id/id yet — same
// rule the app uses.
const getBusinessId = (b) => b?.id || b?._id || null;
const isUnregisteredBusiness = (b) => {
  if (!b) return false;
  const hasPlaceId = !!b.placeId;
  const hasLocalId = !!(b.id || b._id);
  return hasPlaceId && !hasLocalId;
};

// ── Category mapping — EXACT copy of the app's mapCategoryToBackend ─────────
// category: "parking" | "navigation" | "delivery"
// deliveryType: "Courier/Parcel Delivery" | "Food Delivery" | "Both"
const mapCategoryToBackend = (category, deliveryType) => {
  if (category === "parking") return "Parking / Entry Points";
  if (category === "navigation") return "Navigation to Store Inside Mall";
  if (deliveryType === "Food Delivery") return "Food Delivery Instructions";
  if (deliveryType === "Courier/Parcel Delivery") return "Courier/Parcel Delivery Instructions";
  return "Delivery Procedure";
};

// ─────────────────────────────────────────────
// SPINNER
// ─────────────────────────────────────────────
const Spinner = ({ className = "" }) => <div className={`spinner ${className}`} />;

// ─────────────────────────────────────────────
// MAP PICKER MODAL
// ─────────────────────────────────────────────
const MapPickerModal = ({ visible, onClose, onConfirm }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [pickedResult, setPickedResult] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setMapLoaded(false);
      setPickedResult(null);
      setGeocoding(false);
    }
  }, [visible]);

  // ── Real reverse geocode via backend (same endpoint the app uses) ─────────
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`${API_ENDPOINTS.GEOCODE}?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.status !== "OK" || !data.results?.length) {
        setGeocoding(false);
        setPickedResult({
          name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          lat,
          lng,
        });
        return;
      }
      const results = data.results;
      const best = results[0];
      const displayAddress = best.formatted_address;
      let displayName = data.nearbyName ?? "";
      if (!displayName) {
        const comps = best.address_components || [];
        const get = (...types) =>
          comps.find((c) => types.some((t) => c.types?.includes(t)))?.long_name ?? "";
        const streetNumber = get("street_number");
        const route = get("route");
        const sublocality = get("sublocality_level_1", "sublocality", "neighborhood");
        const locality = get("locality", "postal_town");
        if (streetNumber && route) displayName = `${streetNumber} ${route}`;
        else if (route && sublocality) displayName = `${route}, ${sublocality}`;
        else if (route) displayName = route;
        else if (sublocality) displayName = sublocality;
        else if (locality) displayName = locality;
        else displayName = displayAddress.split(",")[0].trim();
      }
      const safeName = displayName || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setGeocoding(false);
      setPickedResult({ name: safeName, address: displayAddress, lat, lng });
    } catch (err) {
      setGeocoding(false);
      setPickedResult({
        name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        lat,
        lng,
      });
    }
  };

  useEffect(() => {
    const handler = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "MAP_TAPPED" && msg.lat != null && msg.lng != null) {
          setGeocoding(true);
          setPickedResult(null);
          reverseGeocode(msg.lat, msg.lng);
        }
      } catch (_) {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const mapHtml = `<!DOCTYPE html><html><head>
  <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
  <style>*{margin:0;padding:0;box-sizing:border-box}html,body,#map{width:100%;height:100%}
  #hint{position:absolute;top:14px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.95);border-radius:24px;padding:10px 20px;font-family:-apple-system,sans-serif;font-size:13px;font-weight:600;color:#1f2937;box-shadow:0 2px 12px rgba(0,0,0,.18);white-space:nowrap;z-index:10;pointer-events:none;transition:opacity .3s}
  #hint.faded{opacity:.35}</style></head><body>
  <div id="map"></div><div id="hint">📍 Tap anywhere to drop a pin</div>
  <script>
  var map,marker;
  function initMap(){
    var def={lat:-33.8688,lng:151.2093};
    map=new google.maps.Map(document.getElementById('map'),{center:def,zoom:14,disableDefaultUI:true,zoomControl:true,gestureHandling:'greedy'});
    marker=new google.maps.Marker({position:def,map:map,draggable:true,animation:google.maps.Animation.DROP,visible:false});
    map.addListener('click',function(e){placePin(e.latLng);});
    marker.addListener('dragend',function(){var p=marker.getPosition();notifyParent(p.lat(),p.lng());});
    if(navigator.geolocation){navigator.geolocation.getCurrentPosition(function(p){map.setCenter({lat:p.coords.latitude,lng:p.coords.longitude});},function(){});}
  }
  function placePin(ll){
    marker.setPosition(ll);marker.setVisible(true);
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function(){marker.setAnimation(null);},700);
    document.getElementById('hint').classList.add('faded');
    notifyParent(ll.lat(),ll.lng());
  }
  function notifyParent(lat,lng){
    window.parent.postMessage(JSON.stringify({type:'MAP_TAPPED',lat:lat,lng:lng}),'*');
  }
  <\/script>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCU3bIIYCB3jNeMFZGz-UIgmj5Hj78z82g&callback=initMap" async defer><\/script>
  </body></html>`;

  if (!visible) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="map-modal">
        <div className="map-modal-header">
          <div className="map-modal-header-left">
            <div className="map-modal-icon">
              <Icons.Navigation size={16} color="#2563eb" />
            </div>
            <div>
              <div className="map-modal-title">Pick on Map</div>
              <div className="map-modal-sub">Tap any location to autofill details</div>
            </div>
          </div>
          <button className="map-close-btn" onClick={onClose}>
            <Icons.X size={18} color="#6b7280" />
          </button>
        </div>

        <div className="map-iframe-wrap">
          {!mapLoaded && (
            <div className="map-loading-overlay">
              <Spinner className="blue" />
              <div className="map-loading-text">Loading map…</div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            className="map-iframe"
            srcDoc={mapHtml}
            onLoad={() => setMapLoaded(true)}
            title="Map Picker"
          />
          {geocoding && (
            <div className="map-geocoding-overlay">
              <div className="map-geocoding-pill">
                <Spinner className="blue sm" />
                Looking up location…
              </div>
            </div>
          )}
        </div>

        <div className="map-bottom">
          {pickedResult ? (
            <>
              <div className="map-location-row">
                <div className="map-location-icon">
                  <Icons.MapPin size={18} color="#2563eb" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="map-location-name">{pickedResult.name}</div>
                  <div className="map-location-addr">{pickedResult.address}</div>
                </div>
              </div>
              <button
                className="map-confirm-btn"
                onClick={() => { onConfirm(pickedResult); onClose(); }}
              >
                <Icons.CheckCircle size={18} color="#fff" />
                Confirm This Location
              </button>
            </>
          ) : !geocoding && mapLoaded ? (
            <div className="map-hint-card">👆 Tap anywhere on the map to select a location</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// WHATSAPP VOICE RECORDER
// ─────────────────────────────────────────────
const WhatsAppVoiceRecorder = ({ onAudioReady, disabled = false }) => {
  const [voiceState, setVoiceState] = useState("idle"); // idle | holding | locked | cancelled
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const holdTimerRef = useRef(null);
  const durationRef = useRef(0);
  const isCancelledRef = useRef(false);
  const isLockedRef = useRef(false);
  const voiceStateRef = useRef("idle");
  const isMouseDownRef = useRef(false);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const streamRef = useRef(null);

  const syncState = (s) => { voiceStateRef.current = s; setVoiceState(s); };

  const clearTimers = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const beginRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start();
      mediaRecorderRef.current = recorder;
      durationRef.current = 0;
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setRecordingDuration(durationRef.current);
      }, 1000);
    } catch (err) {
      syncState("idle");
      alert("Microphone access denied. Please allow microphone access.");
    }
  };

  // ── Real upload: the recorded blob is pushed to Cloudinary (resource_type
  // "video", same as the app does for its .m4a voice notes) so audioUrl is a
  // real, persistable URL instead of a local blob: URL that dies on refresh.
  const finishAndUpload = () => {
    if (!mediaRecorderRef.current) return;
    const finalDuration = durationRef.current;
    clearTimers();
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      stopStream();
      if (!isCancelledRef.current) {
        setUploading(true);
        try {
          const file = new File([blob], `voice_${Date.now()}.webm`, { type: "audio/webm" });
          const url = await uploadToCloudinary(file, "video");
          onAudioReady(url, finalDuration);
        } catch (err) {
          alert(`Upload failed: ${err.message}`);
        } finally {
          setUploading(false);
        }
      }
      mediaRecorderRef.current = null;
    };
    mediaRecorderRef.current.stop();
  };

  const discardRecording = () => {
    isCancelledRef.current = true;
    clearTimers();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = () => { mediaRecorderRef.current = null; };
      mediaRecorderRef.current.stop();
    }
    stopStream();
    durationRef.current = 0;
    setRecordingDuration(0);
  };

  const onPointerDown = async (e) => {
    if (disabled) return;
    e.preventDefault();
    isMouseDownRef.current = true;
    isCancelledRef.current = false;
    isLockedRef.current = false;
    startYRef.current = e.clientY || (e.touches?.[0]?.clientY ?? 0);
    startXRef.current = e.clientX || (e.touches?.[0]?.clientX ?? 0);
    holdTimerRef.current = setTimeout(async () => {
      holdTimerRef.current = null;
      syncState("holding");
      await beginRecording();
    }, 150);
  };

  const onPointerMove = (e) => {
    if (!isMouseDownRef.current || voiceStateRef.current !== "holding") return;
    const currentX = e.clientX || (e.touches?.[0]?.clientX ?? startXRef.current);
    const currentY = e.clientY || (e.touches?.[0]?.clientY ?? startYRef.current);
    const dx = currentX - startXRef.current;
    const dy = currentY - startYRef.current;
    if (dx < -80) {
      isCancelledRef.current = true;
      syncState("cancelled");
      discardRecording();
      isMouseDownRef.current = false;
      return;
    }
    if (dy < -80) {
      isLockedRef.current = true;
      syncState("locked");
      isMouseDownRef.current = false;
    }
  };

  const onPointerUp = () => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    const s = voiceStateRef.current;
    if (s === "holding") {
      syncState("idle");
      finishAndUpload();
    } else if (s === "cancelled") {
      syncState("idle");
    }
  };

  const handleLockedSend = () => {
    isLockedRef.current = false;
    syncState("idle");
    finishAndUpload();
  };

  const handleLockedCancel = () => {
    isLockedRef.current = false;
    syncState("idle");
    discardRecording();
  };

  if (uploading) {
    return (
      <div className="wa-uploading">
        <Spinner className="blue sm" />
        Processing voice note…
      </div>
    );
  }

  if (voiceState === "locked") {
    return (
      <div className="wa-locked">
        <div className="wa-locked-top">
          <div className="wa-locked-timer-row">
            <div className="wa-recording-pulse" />
            <span className="wa-locked-timer">{fmtDuration(recordingDuration)}</span>
          </div>
          <div className="wa-locked-badge">
            <Icons.Lock size={13} color="#2563eb" />
            <span className="wa-locked-badge-text">Locked</span>
          </div>
        </div>
        <div className="wa-locked-actions">
          <button className="wa-cancel-locked-btn" onClick={handleLockedCancel}>
            <Icons.Trash2 size={20} color="#ef4444" />
            Cancel
          </button>
          <button className="wa-send-locked-btn" onClick={handleLockedSend}>
            <Icons.Send size={20} color="#fff" />
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="wa-wrapper"
      onMouseMove={onPointerMove}
      onMouseUp={onPointerUp}
      onMouseLeave={onPointerUp}
      onTouchMove={onPointerMove}
      onTouchEnd={onPointerUp}
    >
      {voiceState === "holding" && (
        <div className="wa-lock-hint">
          <Icons.Lock size={14} color="#fff" />
          <span className="wa-lock-hint-text">↑ Lock</span>
        </div>
      )}
      <div className={`wa-bar${voiceState === "holding" ? " active" : ""}`}>
        {voiceState === "holding" ? (
          <div className="wa-holding-left">
            <div className="wa-pulse" />
            <span className="wa-timer">{fmtDuration(recordingDuration)}</span>
            <span className="wa-cancel-hint">← Slide to cancel</span>
          </div>
        ) : (
          <span className="wa-idle-label">Hold to record</span>
        )}
        <button
          className={`wa-mic-btn${voiceState === "holding" ? " active" : ""}`}
          onMouseDown={onPointerDown}
          onTouchStart={onPointerDown}
          disabled={disabled}
          style={{ userSelect: "none", touchAction: "none" }}
        >
          <Icons.Mic size={26} color="#fff" />
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// CREATE BUSINESS FORM
// ─────────────────────────────────────────────
const CreateBusinessForm = ({ onBusinessCreated }) => {
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [pickedFromMap, setPickedFromMap] = useState(false);
  const [pickedCoords, setPickedCoords] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const debouncedSearch = useDebounce(searchText, 350);
  const abortRef = useRef(null);
  const hasSelection = !!(businessName && businessAddress);

  // ── Real suggestions via our own backend (same PLACES_SEARCH endpoint the
  // app and the site's SearchScreen use) instead of calling Nominatim
  // directly from the browser.
  useEffect(() => {
    const query = debouncedSearch.trim();
    if (!query || hasSelection) { setSuggestions([]); setShowDropdown(false); return; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoadingSuggestions(true);
    setSearchError(null);
    fetch(`${API_ENDPOINTS.PLACES_SEARCH}?q=${encodeURIComponent(query)}`, {
      signal: abortRef.current.signal,
    })
      .then(r => r.json())
      .then(data => {
        setSuggestions(Array.isArray(data) ? data : []);
        setShowDropdown(true);
      })
      .catch(err => { if (err?.name === "AbortError") return; setSearchError("Could not fetch suggestions. Try again."); })
      .finally(() => setLoadingSuggestions(false));
  }, [debouncedSearch, hasSelection]);

  const handleSelectSuggestion = (place) => {
    setBusinessName(place.name);
    setBusinessAddress(place.address);
    setSelectedPlaceId(place.placeId);
    setSelectedCoords(
      place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : null
    );
    setPickedFromMap(false);
    setSearchText(place.name);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleMapConfirm = (result) => {
    setBusinessName(result.name);
    setBusinessAddress(result.address);
    setSelectedPlaceId(null);
    setPickedFromMap(true);
    setPickedCoords({ lat: result.lat, lng: result.lng });
    setSearchText(result.name);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    setBusinessName(""); setBusinessAddress(""); setSelectedPlaceId(null);
    setSelectedCoords(null); setPickedFromMap(false); setPickedCoords(null);
    setSearchText(""); setSuggestions([]); setShowDropdown(false);
  };

  // ── Real create — POSTs to the backend, just like the app does. ───────────
  const handleSubmit = async () => {
    if (!hasSelection) { alert("Please select a business first."); return; }
    const token = getToken();
    if (!token) { alert("Authentication token missing. Please log in."); return; }

    setIsCreating(true);
    try {
      const syntheticPlaceId = pickedFromMap && !selectedPlaceId && pickedCoords
        ? `map_${pickedCoords.lat.toFixed(5)}_${pickedCoords.lng.toFixed(5)}`
        : null;

      const payload = {
        name: businessName,
        address: businessAddress,
        type: "Standalone",
        source: "nominatim",
        placeId: selectedPlaceId || syntheticPlaceId,
        lat: pickedCoords?.lat ?? selectedCoords?.lat ?? null,
        lng: pickedCoords?.lng ?? selectedCoords?.lng ?? null,
      };

      const response = await fetch(API_ENDPOINTS.BUSINESSES, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to register business.");

      onBusinessCreated({
        id: data._id || data.id,
        _id: data._id,
        name: data.name,
        address: data.address,
        type: data.type,
        totalContributions: data.totalContributions,
        isVerified: data.isVerified,
      });
    } catch (err) {
      alert(`Failed to add business: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <MapPickerModal visible={showMapPicker} onClose={() => setShowMapPicker(false)} onConfirm={handleMapConfirm} />

      <div className="upload-content">
        <div className="section-title">Find a Business</div>
        <div className="form-subtitle">Search by name or address, or pin a spot on the map.</div>

        <div className="search-wrapper">
          <div className={`search-box${showDropdown ? " open" : ""}`}>
            <Icons.Search size={18} color="#2563eb" />
            <input
              className="search-input"
              placeholder="e.g. KFC, 149 Mitchell Rd…"
              value={searchText}
              onChange={e => { setSearchText(e.target.value); if (hasSelection) handleClear(); }}
              autoComplete="off"
            />
            {loadingSuggestions ? (
              <Spinner className="blue sm" />
            ) : searchText.length > 0 ? (
              <button className="search-clear" onClick={handleClear}>
                <Icons.X size={16} color="#9ca3af" />
              </button>
            ) : null}
          </div>

          {showDropdown && suggestions.length > 0 && (
            <div className="dropdown">
              {suggestions.map((place, idx) => (
                <button key={place.placeId || idx} className="suggestion-row" onClick={() => handleSelectSuggestion(place)}>
                  <div className="suggestion-icon"><Icons.MapPin size={15} color="#2563eb" /></div>
                  <div className="suggestion-text">
                    <div className="suggestion-name">{place.name}</div>
                    <div className="suggestion-address">{place.address}</div>
                  </div>
                  <Icons.ChevronRight size={15} color="#d1d5db" />
                </button>
              ))}
            </div>
          )}

          {showDropdown && !loadingSuggestions && suggestions.length === 0 && debouncedSearch.trim().length > 1 && (
            <div className="dropdown">
              <div className="no-results-row">No places found. Try a different search or use the map below.</div>
            </div>
          )}
        </div>

        {searchError && <div className="search-error">{searchError}</div>}

        <div className="divider-row">
          <div className="divider-line" />
          <span className="divider-text">or</span>
          <div className="divider-line" />
        </div>

        <button className="map-picker-btn" onClick={() => setShowMapPicker(true)}>
          <div className="map-picker-icon"><Icons.Map size={20} color="#2563eb" /></div>
          <div className="map-picker-text">
            <div className="map-picker-title">Pick on Map</div>
            <div className="map-picker-sub">Tap any location to autofill</div>
          </div>
          <Icons.ChevronRight size={18} color="#93c5fd" />
        </button>

        {hasSelection && (
          <div className={`confirmed-card${pickedFromMap ? " map" : ""}`}>
            <div className="confirmed-icon">
              {pickedFromMap ? <Icons.Navigation size={20} color="#059669" /> : <Icons.Building2 size={20} color="#2563eb" />}
            </div>
            <div className="confirmed-info">
              <div className="confirmed-name-row">
                <span className="confirmed-name">{businessName}</span>
                {pickedFromMap && (
                  <div className="map-badge">
                    <Icons.Map size={10} color="#059669" />
                    <span className="map-badge-text">Map</span>
                  </div>
                )}
              </div>
              <div className="confirmed-address">{businessAddress}</div>
            </div>
            <button className="confirmed-clear" onClick={handleClear}>
              <Icons.X size={16} color="#6b7280" />
            </button>
          </div>
        )}
      </div>

      <div className="fixed-bottom">
        <button
          className="primary-btn"
          onClick={handleSubmit}
          disabled={!hasSelection || isCreating}
        >
          {isCreating ? <Spinner /> : "Continue & Add Instructions"}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN UPLOAD FLOW SCREEN
// ─────────────────────────────────────────────
export default function UploadFlowScreen({ onBack, onComplete, initialBusiness = null }) {
  const [step, setStep] = useState(initialBusiness ? "details" : "create-business");
  const [selectedBusiness, setSelectedBusiness] = useState(initialBusiness);
  const [deliveryType, setDeliveryType] = useState("Courier/Parcel Delivery");
  // ── Category — matches the app's ClientInstructionCategory: "parking" | "navigation" | "delivery" ──
  const [category, setCategory] = useState("parking");
  const [notes, setNotes] = useState("");
  const [mediaItems, setMediaItems] = useState([]);
  const [instructionMode, setInstructionMode] = useState("write");
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioDuration, setAudioDuration] = useState(null);
  const [uploadingFileAudio, setUploadingFileAudio] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);

  const user = { name: "You", level: 1 };

  // ── Media handlers — real Cloudinary uploads, tracked per-item like the app ─
  const handlePhotoUpload = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      const keys = files.map((_, i) => `ph_${Date.now()}_${i}`);
      setMediaItems(prev => [
        ...prev,
        ...files.map((f, i) => ({
          url: URL.createObjectURL(f),
          localUri: URL.createObjectURL(f),
          type: "image",
          uploading: true,
          _key: keys[i],
        })),
      ]);
      await Promise.all(files.map(async (file, i) => {
        const key = keys[i];
        try {
          const url = await uploadToCloudinary(file, "image");
          setMediaItems(prev => prev.map(m => m._key === key ? { ...m, url, uploading: false } : m));
        } catch (err) {
          setMediaItems(prev => prev.filter(m => m._key !== key));
          alert(`Upload Failed: ${err.message}`);
        }
      }));
    };
    input.click();
  };

  // "capture" launches the device camera directly on mobile browsers.
  const handleCameraCapture = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const key = `ph_${Date.now()}`;
      const localUrl = URL.createObjectURL(file);
      setMediaItems(prev => [...prev, { url: localUrl, localUri: localUrl, type: "image", uploading: true, _key: key }]);
      try {
        const url = await uploadToCloudinary(file, "image");
        setMediaItems(prev => prev.map(m => m._key === key ? { ...m, url, uploading: false } : m));
      } catch (err) {
        setMediaItems(prev => prev.filter(m => m._key !== key));
        alert(`Upload Failed: ${err.message}`);
      }
    };
    input.click();
  };

  const handleVideoUpload = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "video/*";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const key = `vid_${Date.now()}`;
      const localUrl = URL.createObjectURL(file);
      setMediaItems(prev => [...prev, { url: localUrl, localUri: localUrl, type: "video", uploading: true, _key: key }]);
      try {
        const url = await uploadToCloudinary(file, "video");
        setMediaItems(prev => prev.map(m => m._key === key ? { ...m, url, uploading: false } : m));
      } catch (err) {
        setMediaItems(prev => prev.filter(m => m._key !== key));
        alert(`Upload Failed: ${err.message}`);
      }
    };
    input.click();
  };

  const removeMediaItem = (index) => {
    if (window.confirm("Remove this media item?")) {
      setMediaItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleAudioFromStorage = async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "audio/*";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingFileAudio(true);
      try {
        const url = await uploadToCloudinary(file, "video");
        setAudioUrl(url);
        setAudioDuration(null);
      } catch (err) {
        alert(`Upload failed: ${err.message}`);
      } finally {
        setUploadingFileAudio(false);
      }
    };
    input.click();
  };

  // ── Real submission — registers the business first if it's still
  // unregistered, then POSTs the contribution with the correct category.
  const handleSubmitContribution = async () => {
    const token = getToken();
    if (!token) { alert("Authentication missing. Please log in."); return; }
    if (!selectedBusiness) { alert("No business selected."); return; }
    if (instructionMode === "write" && !notes) { alert("Please provide written instructions."); return; }
    if (instructionMode === "record" && !audioUrl) { alert("Please record or upload audio."); return; }
    if (mediaItems.some(m => m.uploading)) { alert("Some media is still uploading."); return; }

    setIsSubmitting(true);
    try {
      let businessId = null;

      if (isUnregisteredBusiness(selectedBusiness)) {
        const r = await fetch(API_ENDPOINTS.BUSINESSES, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: selectedBusiness.name,
            address: selectedBusiness.address,
            type: "Standalone",
            placeId: selectedBusiness.placeId,
            lat: selectedBusiness.lat ?? null,
            lng: selectedBusiness.lng ?? null,
            source: ["manual", "foursquare", "nominatim"].includes(selectedBusiness.source)
              ? selectedBusiness.source
              : "nominatim",
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || "Failed to register business.");
        businessId = d._id || d.id;
        setSelectedBusiness(prev => prev ? { ...prev, _id: d._id, id: d.id } : prev);
      } else {
        businessId = getBusinessId(selectedBusiness);
      }

      if (!businessId) throw new Error("Could not resolve business ID.");

      const response = await fetch(API_ENDPOINTS.CONTRIBUTIONS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId,
          notes: instructionMode === "write" ? notes : "",
          audioUrl: instructionMode === "record" ? audioUrl : null,
          audioDuration: instructionMode === "record" ? audioDuration : null,
          type: deliveryType,
          category: mapCategoryToBackend(category, deliveryType),
          tags: [],
          photos: mediaItems.filter(m => m.type === "image").map(m => m.url),
          videos: mediaItems.filter(m => m.type === "video").map(m => m.url),
          isVerifiedBusinessInstruction: isBusinessOwner,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Submission failed.");

      alert("Your contribution has been submitted!");
      if (onComplete) onComplete({ ...selectedBusiness, _id: businessId, id: businessId });
    } catch (err) {
      alert(`Failed to submit: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── CREATE BUSINESS STEP ──────────────────────────────────────────────────
  if (step === "create-business") {
    return (
      <div className="upload-shell">
        <div className="upload-container">
          <div className="upload-header">
            <button className="upload-header-back" onClick={onBack}>
              <Icons.ArrowLeft size={24} color="#1f2937" />
            </button>
            <div className="upload-title">Add Business</div>
            <div className="upload-header-spacer" />
          </div>
          <CreateBusinessForm
            onBusinessCreated={(b) => { setSelectedBusiness(b); setStep("details"); }}
          />
        </div>
      </div>
    );
  }

  // ── DETAILS STEP ──────────────────────────────────────────────────────────
  if (step === "details") {
    const detailsReady = (instructionMode === "write" && !!notes) || (instructionMode === "record" && !!audioUrl);

    return (
      <div className="upload-shell">
        <div className="upload-container">
          <div className="upload-header">
            <button className="upload-header-back" onClick={() => initialBusiness ? onBack?.() : setStep("create-business")}>
              <Icons.ArrowLeft size={24} color="#1f2937" />
            </button>
            <div className="upload-title">Add Details</div>
            <div className="upload-header-spacer" />
          </div>

          <div className="upload-content">
            <div className="selected-business-name">{selectedBusiness?.name}</div>

            {/* DELIVERY TYPE */}
            <label className="form-label">Delivery Type *</label>
            <div className="delivery-type-buttons">
              {["Courier/Parcel Delivery", "Food Delivery", "Both"].map(dt => (
                <button
                  key={dt}
                  className={`delivery-type-btn${deliveryType === dt ? " active" : ""}`}
                  onClick={() => setDeliveryType(dt)}
                >
                  {dt === "Courier/Parcel Delivery" && <Icons.Package size={18} color={deliveryType === dt ? "#fff" : "#6b7280"} />}
                  {dt === "Food Delivery" && <Icons.UtensilsCrossed size={18} color={deliveryType === dt ? "#fff" : "#6b7280"} />}
                  <span>{dt === "Courier/Parcel Delivery" ? "Courier" : dt === "Food Delivery" ? "Food" : "Both"}</span>
                </button>
              ))}
            </div>

            {/* CATEGORY — matches the app's Parking / Navigation / Delivery selector */}
            <label className="form-label">Instruction Category *</label>
            <div className="delivery-type-buttons">
              {[
                { key: "parking", label: "Parking", icon: Icons.ParkingSquare },
                { key: "navigation", label: "Navigation", icon: Icons.Compass },
                { key: "delivery", label: "Delivery", icon: Icons.Package },
              ].map(({ key, label, icon: CatIcon }) => (
                <button
                  key={key}
                  className={`category-btn delivery-type-btn${category === key ? " active" : ""}`}
                  onClick={() => setCategory(key)}
                >
                  <CatIcon size={18} color={category === key ? "#fff" : "#6b7280"} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* MEDIA */}
            <label className="form-label">Media (Optional)</label>
            <div className="media-upload-buttons">
              <button className="media-btn" onClick={handlePhotoUpload}>
                <Icons.Camera size={18} color="#6b7280" />
                Gallery
              </button>
              <button className="media-btn" onClick={handleCameraCapture}>
                <Icons.Camera size={18} color="#6b7280" />
                Camera
              </button>
              <button className="media-btn" onClick={handleVideoUpload}>
                <Icons.Video size={18} color="#6b7280" />
                Video
              </button>
            </div>

            {mediaItems.length > 0 && (
              <div className="media-preview-scroll">
                {mediaItems.map((item, idx) => (
                  <div key={item._key || idx} className="media-preview-item">
                    {item.type === "image" ? (
                      <img src={item.localUri || item.url} alt="" className="media-preview-img" />
                    ) : (
                      <div className="video-placeholder">
                        <Icons.Video size={28} color="#fff" />
                      </div>
                    )}
                    {item.uploading && (
                      <div className="media-uploading-overlay"><Spinner /></div>
                    )}
                    {!item.uploading && (
                      <button className="media-remove-btn" onClick={() => removeMediaItem(idx)}>
                        <Icons.X size={14} color="#fff" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* INSTRUCTION TYPE */}
            <label className="form-label">Instructions *</label>
            <div className="instruction-type-buttons">
              {["write", "record"].map(mode => (
                <button
                  key={mode}
                  className={`instruction-type-btn${instructionMode === mode ? " active" : ""}`}
                  onClick={() => setInstructionMode(mode)}
                >
                  {mode === "write" ? "✍️ Write" : "🎤 Record"}
                </button>
              ))}
            </div>

            {instructionMode === "write" && (
              <textarea
                className="notes-input"
                placeholder="Describe parking, navigation steps, delivery procedures…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={6}
              />
            )}

            {instructionMode === "record" && (
              <div className="audio-section">
                {audioUrl ? (
                  <div className="audio-preview">
                    <div className="audio-preview-header">
                      <span className="audio-preview-title">🎵 Audio Instruction</span>
                      <button className="audio-preview-remove" onClick={() => { setAudioUrl(null); setAudioDuration(null); }}>
                        <Icons.X size={20} color="#ef4444" />
                      </button>
                    </div>
                    <div className="audio-filename">
                      {audioDuration ? `Duration: ${audioDuration}s` : "Audio ready"}
                    </div>
                  </div>
                ) : (
                  <>
                    <WhatsAppVoiceRecorder
                      onAudioReady={(url, dur) => { setAudioUrl(url); setAudioDuration(dur); }}
                    />
                    <div className="audio-divider-row">
                      <div className="audio-divider-line" />
                      <span className="audio-divider-text">or</span>
                      <div className="audio-divider-line" />
                    </div>
                    {uploadingFileAudio ? (
                      <div className="uploading-indicator">
                        <Spinner className="blue sm" />
                        <span style={{ marginLeft: 10, fontSize: 14, color: "#2563eb", fontWeight: 600 }}>Uploading…</span>
                      </div>
                    ) : (
                      <button className="audio-upload-file-btn" onClick={handleAudioFromStorage}>
                        <Icons.Upload size={18} color="#6b7280" />
                        Upload audio file
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* OWNER CHECKBOX */}
            <div
              className={`owner-row${isBusinessOwner ? " active" : ""}`}
              onClick={() => setIsBusinessOwner(v => !v)}
              role="checkbox"
              aria-checked={isBusinessOwner}
              tabIndex={0}
              onKeyDown={e => e.key === " " && setIsBusinessOwner(v => !v)}
            >
              <div className={`owner-checkbox${isBusinessOwner ? " active" : ""}`}>
                {isBusinessOwner && <Icons.CheckCircle size={16} color="#fff" />}
              </div>
              <div className="owner-text">
                <div className="owner-label-row">
                  <Icons.ShieldCheck size={14} color={isBusinessOwner ? "#059669" : "#6b7280"} />
                  <span className="owner-label">I am the business owner</span>
                </div>
                <div className="owner-sublabel">
                  Your instruction will show a "Business Owner" badge so couriers know it's official.
                </div>
              </div>
            </div>

            <div style={{ height: 100 }} />
          </div>

          <div className="fixed-bottom">
            <button
              className="primary-btn"
              onClick={() => detailsReady && setStep("preview")}
              disabled={!detailsReady}
            >
              Preview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PREVIEW STEP ──────────────────────────────────────────────────────────
  if (step === "preview") {
    return (
      <div className="upload-shell">
        <div className="upload-container">
          <div className="upload-header">
            <button className="upload-header-back" onClick={() => setStep("details")}>
              <Icons.ArrowLeft size={24} color="#1f2937" />
            </button>
            <div className="upload-title">Preview</div>
            <div className="upload-header-spacer" />
          </div>

          <div className="upload-content">
            <div className="preview-label">Your contribution will appear like this:</div>

            <div className="contribution-card">
              <div className="contribution-header">
                <div className="contribution-user">
                  <Icons.User size={20} color="#2563eb" />
                  <div style={{ marginLeft: 10 }}>
                    <div className="contribution-user-name">{user.name}</div>
                    <div className="contribution-user-level">Level {user.level}</div>
                  </div>
                </div>
                <div className="delivery-type-badges">
                  {(deliveryType === "Courier/Parcel Delivery" || deliveryType === "Both") && (
                    <Icons.Package size={16} color="#2563eb" />
                  )}
                  {(deliveryType === "Food Delivery" || deliveryType === "Both") && (
                    <Icons.UtensilsCrossed size={16} color="#f59e0b" />
                  )}
                </div>
              </div>

              {isBusinessOwner && (
                <div className="owner-preview-badge">
                  <Icons.ShieldCheck size={13} color="#059669" />
                  <span className="owner-preview-badge-text">Business Owner instruction</span>
                </div>
              )}

              {mediaItems.length > 0 && (
                <div className="preview-media-scroll">
                  {mediaItems.filter(m => m.type === "image").map((m, i) => (
                    <img key={i} src={m.localUri || m.url} alt="" className="preview-media-img" />
                  ))}
                  {mediaItems.filter(m => m.type === "video").map((_, i) => (
                    <div key={i} className="preview-video-placeholder">
                      <Icons.Video size={28} color="#fff" />
                    </div>
                  ))}
                </div>
              )}

              {instructionMode === "write" && notes && (
                <div className="contribution-notes">{notes}</div>
              )}

              {instructionMode === "record" && audioUrl && (
                <div className="audio-preview-in-card">
                  <span className="audio-preview-in-card-text">🎵 Audio Instruction</span>
                  {audioDuration && <span className="audio-preview-duration">{audioDuration}s</span>}
                </div>
              )}
            </div>

            <div style={{ height: 100 }} />
          </div>

          <div className="fixed-bottom">
            <button
              className="primary-btn"
              onClick={handleSubmitContribution}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Spinner />
              ) : (
                <>
                  <Icons.Upload size={18} color="#fff" />
                  <span style={{ marginLeft: 8 }}>Submit Contribution</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}