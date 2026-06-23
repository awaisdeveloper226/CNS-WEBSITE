// screens/Detail/EntryPinWidget.jsx

import React, { useState, useEffect, useRef } from "react";
import {
  Crosshair,
  Edit3,
  MapPin,
  X,
  Check,
  Trash2,
  Navigation,
  LocateFixed,
} from "lucide-react";
import { API_ENDPOINTS } from "../../constants/network";
import "./EntryPinWidget.css";

const GOOGLE_MAPS_JS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_JS_API_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// Load Google Maps JS API once
// ─────────────────────────────────────────────────────────────────────────────
let gmapsLoadPromise = null;

function loadGoogleMapsApi() {
  if (window.google?.maps) return Promise.resolve();
  if (gmapsLoadPromise) return gmapsLoadPromise;

  gmapsLoadPromise = new Promise((resolve, reject) => {
    const callbackName = "__epw_gmaps_init__";
    window[callbackName] = () => { resolve(); delete window[callbackName]; };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_JS_API_KEY}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });

  return gmapsLoadPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
async function geocodeAddress(address) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { "User-Agent": "CNS-CourierNavigatorSystem/1.0" } }
    );
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm Dialog (replaces Alert.alert for destructive actions)
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <div className="epw-confirm-overlay" role="dialog" aria-modal="true">
      <div className="epw-confirm-box">
        <p className="epw-confirm-title">{title}</p>
        <p className="epw-confirm-message">{message}</p>
        <div className="epw-confirm-actions">
          <button className="epw-confirm-cancel" onClick={onCancel}>Cancel</button>
          <button className="epw-confirm-destructive" onClick={onConfirm}>Remove</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview Map (read-only mini-map shown on the card)
// ─────────────────────────────────────────────────────────────────────────────
function PreviewMap({ lat, lng }) {
  const mapRef = useRef(null);

  useEffect(() => {
    let map;
    loadGoogleMapsApi()
      .then(() => {
        if (!mapRef.current) return;
        const pos = { lat, lng };
        map = new window.google.maps.Map(mapRef.current, {
          center: pos,
          zoom: 17,
          disableDefaultUI: true,
          gestureHandling: "none",
        });
        new window.google.maps.Marker({ position: pos, map });
      })
      .catch(console.error);
    return () => { map = null; };
  }, [lat, lng]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor Map (interactive — click to place / drag to move)
// ─────────────────────────────────────────────────────────────────────────────
function EditorMap({ centerLat, centerLng, existingLat, existingLng, onMove, onReady }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    loadGoogleMapsApi()
      .then(() => {
        if (!mapRef.current) return;

        const center = { lat: centerLat, lng: centerLng };
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 17,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: "greedy",
        });
        mapInstanceRef.current = map;

        const placeOrMove = (latLng) => {
          if (markerRef.current) {
            markerRef.current.setPosition(latLng);
          } else {
            markerRef.current = new window.google.maps.Marker({
              position: latLng,
              map,
              draggable: true,
              animation: window.google.maps.Animation.DROP,
            });
            markerRef.current.addListener("dragend", () => {
              const p = markerRef.current.getPosition();
              onMove({ lat: p.lat(), lng: p.lng() });
            });
          }
          map.panTo(latLng);
          map.setZoom(18);
          onMove({ lat: latLng.lat(), lng: latLng.lng() });
        };

        // Restore existing pin if present
        if (existingLat != null && existingLng != null) {
          const latLng = new window.google.maps.LatLng(existingLat, existingLng);
          placeOrMove(latLng);
        }

        map.addListener("click", (e) => placeOrMove(e.latLng));

        onReady();
      })
      .catch(console.error);

    return () => {
      markerRef.current = null;
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // mount-once; centerLat/Lng are stable per open

  return <div ref={mapRef} className="epw-map-div" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// EntryPinWidget
// ─────────────────────────────────────────────────────────────────────────────
const EntryPinWidget = ({
  businessId,
  businessAddress,
  businessCoordinates,
  initialPin,
  userName,
  isGlobal = false,
  globalMeta,
  onGlobalClaimed,
}) => {
  const [pin, setPin] = useState(initialPin);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingCoord, setPendingCoord] = useState(null);
  const [labelInput, setLabelInput] = useState(initialPin?.label || "");
  const [mapCenter, setMapCenter] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const claimedBusinessIdRef = useRef(null);

  // ── Resolve map center ─────────────────────────────────────────────────
  useEffect(() => {
    if (pin?.lat != null) {
      setMapCenter({ lat: pin.lat, lng: pin.lng });
      return;
    }
    if (businessCoordinates?.lat != null && businessCoordinates?.lng != null) {
      setMapCenter({ lat: businessCoordinates.lat, lng: businessCoordinates.lng });
      return;
    }
    if (globalMeta?.coordinates?.lat != null) {
      setMapCenter({ lat: globalMeta.coordinates.lat, lng: globalMeta.coordinates.lng });
      return;
    }
    setGeocoding(true);
    geocodeAddress(businessAddress)
      .then((c) => { if (c) setMapCenter(c); })
      .finally(() => setGeocoding(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close modal on Escape
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e) => { if (e.key === "Escape") setModalOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalOpen]);

  const openModal = () => {
    setPendingCoord(pin?.lat != null ? { lat: pin.lat, lng: pin.lng } : null);
    setLabelInput(pin?.label || "");
    setEditorReady(false);
    setSaveError(null);
    setModalOpen(true);
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        setPendingCoord({ lat, lng });
        setLocating(false);
        // Pan the map instance if available
        if (window.__epwEditorMap) {
          const latLng = new window.google.maps.LatLng(lat, lng);
          window.__epwEditorMap.panTo(latLng);
        }
      },
      () => { setLocating(false); }
    );
  };

  const handleSave = async () => {
    if (!pendingCoord) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (isGlobal && !claimedBusinessIdRef.current) {
        if (!globalMeta?.placeId) throw new Error("Missing placeId — cannot create local record.");
        const response = await fetch(API_ENDPOINTS.BUSINESS_FROM_GLOBAL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            placeId: globalMeta.placeId,
            name: globalMeta.name,
            address: businessAddress,
            type: globalMeta.type ?? "Other",
            source: "nominatim",
            coordinates: globalMeta.coordinates ?? null,
            entryPin: {
              lat: pendingCoord.lat,
              lng: pendingCoord.lng,
              label: labelInput.trim() || "Courier Entry",
              updatedBy: userName || "Anonymous Courier",
            },
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to save");
        claimedBusinessIdRef.current = String(data._id || data.id);
        setPin(data.entryPin);
        setMapCenter({ lat: data.entryPin.lat, lng: data.entryPin.lng });
        setModalOpen(false);
        onGlobalClaimed?.(claimedBusinessIdRef.current);
      } else {
        const targetId = claimedBusinessIdRef.current || businessId;
        const response = await fetch(API_ENDPOINTS.ENTRY_PIN(targetId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: pendingCoord.lat,
            lng: pendingCoord.lng,
            label: labelInput.trim() || "Courier Entry",
            updatedBy: userName || "Anonymous Courier",
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to save pin");
        setPin(data.entryPin);
        setMapCenter({ lat: data.entryPin.lat, lng: data.entryPin.lng });
        setModalOpen(false);
      }
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearConfirmed = async () => {
    setShowConfirm(false);
    if (isGlobal && !claimedBusinessIdRef.current) { setModalOpen(false); return; }
    setSaving(true);
    try {
      const targetId = claimedBusinessIdRef.current || businessId;
      const response = await fetch(API_ENDPOINTS.ENTRY_PIN(targetId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: null, lng: null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setPin(null);
      setLabelInput("");
      setPendingCoord(null);
      setModalOpen(false);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNavigate = () => {
    if (pin?.lat == null || pin?.lng == null) return;
    setNavLoading(true);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${pin.lat},${pin.lng}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => setNavLoading(false), 800);
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Entry Pin Card ─────────────────────────────────────────────── */}
      <div className="epw-card">
        <div className="epw-card-header">
          <div className="epw-header-left">
            <div className="epw-icon-wrap">
              <Crosshair size={16} />
            </div>
            <p className="epw-card-title">Courier Entry Point</p>
          </div>
          <div className="epw-header-actions">
            {pin?.lat != null && (
              <button
                className="epw-nav-button"
                onClick={handleNavigate}
                disabled={navLoading}
              >
                {navLoading
                  ? <span className="epw-spinner" />
                  : <><Navigation size={13} /> Navigate</>}
              </button>
            )}
            <button className="epw-edit-button" onClick={openModal}>
              <Edit3 size={13} />
              {pin?.lat != null ? "Edit" : "Add Pin"}
            </button>
          </div>
        </div>

        {pin?.lat != null ? (
          <>
            <div className="epw-pin-info-row">
              <div className="epw-pin-dot" />
              <div>
                <p className="epw-pin-label">{pin.label || "Courier Entry"}</p>
                {pin.updatedBy && (
                  <p className="epw-pin-meta">
                    Marked by {pin.updatedBy}
                    {formatDate(pin.updatedAt) ? ` · ${formatDate(pin.updatedAt)}` : ""}
                  </p>
                )}
              </div>
            </div>
            <div className="epw-mini-map-wrap" onClick={openModal} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && openModal()}>
              <PreviewMap lat={pin.lat} lng={pin.lng} />
              <div className="epw-tile-edit-nudge">
                <Navigation size={11} />
                <span className="epw-tile-edit-nudge-text">Tap to edit</span>
              </div>
            </div>
          </>
        ) : (
          <div className="epw-no-pin-state">
            <MapPin size={22} />
            <p className="epw-no-pin-text">
              No entry point marked yet.{"\n"}
              Be the first to pin the courier entrance.
            </p>
            <button className="epw-add-pin-cta" onClick={openModal}>
              <MapPin size={14} />
              Mark Entry Point
            </button>
          </div>
        )}
      </div>

      {/* ── Editor Modal ───────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="epw-modal-overlay" role="dialog" aria-modal="true" aria-label="Pin courier entry point">
          {/* Header */}
          <div className="epw-modal-header">
            <div className="epw-modal-header-left">
              <div className="epw-modal-header-icon">
                <Crosshair size={16} />
              </div>
              <div>
                <p className="epw-modal-header-title">Pin Courier Entry Point</p>
                <p className="epw-modal-header-subtitle">Click map · drag pin · save</p>
              </div>
            </div>
            <button className="epw-modal-close-btn" onClick={() => setModalOpen(false)} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {/* Map */}
          <div className="epw-map-wrap">
            {geocoding || !mapCenter ? (
              <div className="epw-map-loading">
                <span className="epw-spinner red large" />
                <p className="epw-map-loading-text">Locating address…</p>
              </div>
            ) : (
              <>
                {!editorReady && (
                  <div className="epw-map-loading">
                    <span className="epw-spinner red large" />
                  </div>
                )}
                <EditorMap
                  centerLat={mapCenter.lat}
                  centerLng={mapCenter.lng}
                  existingLat={pin?.lat ?? null}
                  existingLng={pin?.lng ?? null}
                  onMove={setPendingCoord}
                  onReady={() => setEditorReady(true)}
                />
                <button
                  className="epw-my-location-btn"
                  onClick={handleMyLocation}
                  disabled={locating}
                >
                  {locating
                    ? <span className="epw-spinner blue" />
                    : <LocateFixed size={16} />}
                  {locating ? "Locating…" : "My Location"}
                </button>
              </>
            )}
          </div>

          {/* Bottom panel */}
          <div className="epw-bottom-panel">
            {/* Coord feedback */}
            {pendingCoord ? (
              <div className="epw-coord-row">
                <div className="epw-coord-dot" />
                <p className="epw-coord-text">
                  {pendingCoord.lat.toFixed(6)}, {pendingCoord.lng.toFixed(6)}
                </p>
                <div className="epw-coord-ready">
                  <span className="epw-coord-ready-text">Pin placed ✓</span>
                </div>
              </div>
            ) : (
              <div className="epw-coord-row">
                <MapPin size={14} color="#9ca3af" />
                <p className="epw-coord-placeholder">
                  Click map or use "My Location" to drop a pin
                </p>
              </div>
            )}

            {/* Label input */}
            <div className="epw-label-row">
              <MapPin size={14} />
              <input
                className="epw-label-input"
                type="text"
                placeholder="Label (e.g. Loading dock, Side gate…)"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                maxLength={80}
              />
            </div>

            {/* Save error */}
            {saveError && (
              <p style={{ color: "#ef4444", fontSize: 13, margin: 0, fontWeight: 600 }}>
                {saveError}
              </p>
            )}

            {/* Actions */}
            <div className="epw-actions">
              {pin?.lat != null && (
                <button
                  className="epw-clear-btn"
                  onClick={() => setShowConfirm(true)}
                  disabled={saving}
                >
                  <Trash2 size={15} />
                  Remove
                </button>
              )}
              <button
                className="epw-save-btn"
                onClick={handleSave}
                disabled={!pendingCoord || saving}
              >
                {saving
                  ? <span className="epw-spinner" />
                  : <><Check size={16} /> Save Pin</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm remove dialog ──────────────────────────────────────── */}
      {showConfirm && (
        <ConfirmDialog
          title="Remove Pin"
          message="Remove the entry pin for this location?"
          onConfirm={handleClearConfirmed}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
};

export default EntryPinWidget;