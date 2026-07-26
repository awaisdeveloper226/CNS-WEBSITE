import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Package,
  UtensilsCrossed,
  User,
  Video as VideoIcon,
  X,
  Play,
  Pause,
  Volume2,
  Send,
  MessageCircle,
  Edit2,
  Save,
  Camera,
  Images,
  Mic,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";
import { API_ENDPOINTS } from "../../constants/network";
import "./InstructionDetailScreen.css";

// ── Cloudinary ────────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dvmoaqsdb";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

// ── Image compression (client-side, before upload) ────────────────────────
// Camera photos are frequently 8-12MB at full sensor resolution. Resizing to
// a sane max dimension and re-encoding as JPEG *before* it ever leaves the
// device cuts upload size — and therefore upload time — by roughly 80-95% in
// typical cases, with no visible quality loss for in-app viewing. This is
// the single biggest lever on perceived "upload speed".
function compressImage(file, maxDim = 1920, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file.type?.startsWith("image/") || file.type === "image/gif") {
      resolve(file); // leave animated GIFs / non-images untouched
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve(file); // already small enough, don't bother re-encoding
        return;
      }
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(
            new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
              type: "image/jpeg",
            }),
          );
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fall back to the original on any decode error
    };
    img.src = objectUrl;
  });
}

// ── Cloudinary upload with real progress ───────────────────────────────────
// fetch() exposes zero progress until the whole response arrives, which is
// why the old spinner just sat there with no feedback. XMLHttpRequest gives
// real upload.onprogress events, so the UI can show an actual percentage.
function uploadToCloudinary(file, resourceType, { signal, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", CLOUDINARY_API_URL);
    xhr.responseType = "json";

    if (signal) {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => xhr.abort());
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response?.secure_url);
      } else {
        reject(new Error(xhr.response?.error?.message || "Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("resource_type", resourceType);
    xhr.send(formData);
  });
}

// ── Cloudinary video URL, transformed to a small preview size ─────────────
// IMPORTANT: this is only used for the invisible off-screen thumbnail
// capture in VideoThumbnail below, never for actual visible playback. A
// transformed video that Cloudinary hasn't transcoded before yet gets
// transcoded live and streamed back with no known final size, which reads
// to the browser as duration climbing / a jumpy scrubber — fine for a
// hidden capture element nobody watches, but not acceptable for the real
// player (see LightboxOverlay, which intentionally uses the raw URL).
function optimizedVideoUrl(url, width = 960) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/q_auto,f_auto,w_${width},c_limit/`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatTime = (millis) => {
  const s = Math.floor(millis / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
};
const fmtSecs = (secs) =>
  `${Math.floor(secs / 60)
    .toString()
    .padStart(2, "0")}:${(secs % 60).toString().padStart(2, "0")}`;
const formatDate = (d) => {
  if (!d) return "Recently";
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime())
      ? "Recently"
      : dt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  } catch {
    return "Recently";
  }
};

// ── SourceBadge ───────────────────────────────────────────────────────────────
function SourceBadge({ isOwner }) {
  return isOwner ? (
    <span className="ids-badge ids-badge-owner">✓ Verified Business</span>
  ) : (
    <span className="ids-badge ids-badge-community">Community</span>
  );
}

// ── Video Thumbnail (canvas-captured frame, rendered as a plain <img>) ────────
// Using a live <video> element as a thumbnail causes Chrome/Edge to render
// native video hover UI (including the Picture-in-Picture icon) regardless of
// disablePictureInPicture/pointer-events — it's browser chrome, not a DOM
// event. Instead we load the video off-screen just long enough to capture one
// frame onto a canvas, then swap in a plain <img>. An <img> can never trigger
// any native video affordances.
//
// crossOrigin="anonymous" is required here: Cloudinary URLs are cross-origin,
// and canvas.toDataURL() throws a SecurityError on a "tainted" canvas unless
// the source <video> was loaded with CORS permission. Without this attribute
// the frame capture silently fails (caught below) and the thumbnail stays
// blank forever — it has nothing to do with local blob: URLs, which aren't
// cross-origin and work either way.
//
// We also request a small, optimized transform of the source video for the
// off-screen capture — the thumbnail only needs a few hundred pixels, so
// there's no reason to pull down the full-resolution file just to grab one
// frame from it. This makes thumbnails appear noticeably faster too.
function VideoThumbnail({
  url,
  iconSize = 28,
  className = "ids-media-video-thumb",
  style,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [thumbUrl, setThumbUrl] = useState(null);
  const [captureFailed, setCaptureFailed] = useState(false);

  const captureSrc = url?.startsWith("blob:") ? url : optimizedVideoUrl(url, 480);

  useEffect(() => {
    setThumbUrl(null);
    setCaptureFailed(false);
  }, [url]);

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    try {
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 320;
      canvas
        .getContext("2d")
        .drawImage(video, 0, 0, canvas.width, canvas.height);
      setThumbUrl(canvas.toDataURL("image/jpeg", 0.82));
    } catch {
      // CORS-tainted canvas or decode failure — fall back to icon-only box.
      setCaptureFailed(true);
    }
  };

  return (
    <div
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
    >
      {thumbUrl && (
        <img
          src={thumbUrl}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      )}

      {/* Off-screen video used only to grab a single frame — never visible/hoverable */}
      {!thumbUrl && !captureFailed && (
        <video
          ref={videoRef}
          src={captureSrc}
          crossOrigin="anonymous"
          muted
          playsInline
          preload="metadata"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: "none",
          }}
          onLoadedMetadata={(e) => {
            e.currentTarget.currentTime = 0.1;
          }}
          onSeeked={captureFrame}
          onError={() => setCaptureFailed(true)}
        />
      )}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="ids-media-play-btn">
        <VideoIcon size={iconSize} color="#fff" />
      </div>
    </div>
  );
}

// ── Web Voice Recorder ───────────────────────────────────────────────────────
// Records audio and hands the raw File up to the parent via onAudioReady —
// it does NOT upload anything itself. Just like photos/videos, the audio is
// only staged locally; the parent uploads it to Cloudinary inside
// handleSaveEdit, only once Save is actually pressed.
function VoiceRecorder({ onAudioReady, disabled }) {
  const [state, setState] = useState("idle"); // idle | recording
  const [duration, setDuration] = useState(0);
  const mediaRecRef = useRef(null);
  const timerRef = useRef(null);
  const durationRef = useRef(0);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice_${Date.now()}.webm`, {
          type: "audio/webm",
        });
        // Staged locally only — no network call here.
        onAudioReady(file, durationRef.current);
        setState("idle");
        durationRef.current = 0;
        setDuration(0);
      };
      mr.start();
      mediaRecRef.current = mr;
      durationRef.current = 0;
      setDuration(0);
      timerRef.current = setInterval(() => {
        durationRef.current++;
        setDuration(durationRef.current);
      }, 1000);
      setState("recording");
    } catch {
      alert(
        "Microphone access denied. Please allow microphone in your browser.",
      );
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive")
      mediaRecRef.current.stop();
  };

  const cancelRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecRef.current) {
      mediaRecRef.current.ondataavailable = null;
      mediaRecRef.current.onstop = null;
      if (mediaRecRef.current.state !== "inactive") mediaRecRef.current.stop();
      mediaRecRef.current = null;
    }
    setState("idle");
    durationRef.current = 0;
    setDuration(0);
  };

  if (state === "recording")
    return (
      <div className="ids-voice-recording">
        <div className="ids-voice-rec-left">
          <span className="ids-voice-pulse" />
          <span className="ids-voice-timer">{fmtSecs(duration)}</span>
        </div>
        <div className="ids-voice-actions">
          <button className="ids-voice-cancel" onClick={cancelRecording}>
            <Trash2 size={18} color="#ef4444" />
          </button>
          <button className="ids-voice-send" onClick={stopRecording}>
            <Send size={18} color="#fff" />
          </button>
        </div>
      </div>
    );

  return (
    <div className="ids-voice-idle">
      <span className="ids-voice-idle-label">Click to record</span>
      <button
        className="ids-voice-mic-btn"
        onClick={startRecording}
        disabled={disabled}
        aria-label="Record audio"
      >
        <Mic size={24} color="#fff" />
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOM IN-BROWSER CAMERA (multi-shot session, stays open across captures)
// ══════════════════════════════════════════════════════════════════════════════
// Why this exists: a plain <input type="file" accept="image/*" capture> hands
// control to the OS/browser camera UI and closes back to the file picker after
// every single shot — there's no way to keep it open for multiple photos.
// This component opens the camera stream directly via getUserMedia and keeps
// it running inside our own overlay, so the shutter button can be tapped as
// many times as needed — with a running thumbnail strip and counter, just
// like a native multi-shot camera screen — until the user taps "Done".
//
// NOTE: capturing a shot here only stages it locally (via onCapture, which
// hands the raw File up to the parent). Nothing is uploaded to Cloudinary at
// this point — upload only happens later, when the parent's Save button is
// pressed. See addPhotoFile / handleSaveEdit in the main component.
function CustomCameraModal({ visible, onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [sessionShots, setSessionShots] = useState([]);
  const [permissionError, setPermissionError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isStarting, setIsStarting] = useState(true);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!visible) return;
    setSessionShots([]);
    setPermissionError(null);
    setIsStarting(true);
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsStarting(false);
      } catch (err) {
        if (!cancelled) {
          setPermissionError(
            err.name === "NotAllowedError"
              ? "Camera access was denied. Please allow camera access in your browser's site settings and try again."
              : err.message || "Could not access the camera.",
          );
          setIsStarting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
      // Revoke any local preview blob URLs from this session.
      setSessionShots((prev) => {
        prev.forEach((s) => URL.revokeObjectURL(s.previewUrl));
        return [];
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleShutter = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || isCapturing) return;
    setIsCapturing(true);
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(video, 0, 0, width, height);
    canvas.toBlob(
      (blob) => {
        setIsCapturing(false);
        if (!blob) return;
        const file = new File([blob], `camera_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const previewUrl = URL.createObjectURL(blob);
        setSessionShots((prev) => [
          ...prev,
          { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, previewUrl },
        ]);
        onCapture(file); // parent stages it locally — no upload happens yet
      },
      "image/jpeg",
      0.85,
    );
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {permissionError ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            padding: 32,
            gap: 8,
            textAlign: "center",
          }}
        >
          <Camera size={48} color="#9ca3af" />
          <p style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>
            Camera access needed
          </p>
          <p style={{ fontSize: 14, color: "#9ca3af", maxWidth: 320 }}>
            {permissionError}
          </p>
          <button
            onClick={handleClose}
            style={{
              marginTop: 14,
              padding: "10px 24px",
              borderRadius: 10,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      ) : (
        <>
          {isStarting && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1,
              }}
            >
              <span className="ids-spinner ids-spinner-white ids-spinner-lg" />
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              background: "#000",
            }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Top bar: close + running counter */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 16px",
            }}
          >
            <button
              onClick={handleClose}
              aria-label="Close camera"
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                background: "rgba(0,0,0,0.45)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={20} color="#fff" />
            </button>
            {sessionShots.length > 0 && (
              <div
                style={{
                  background: "rgba(37,99,235,0.9)",
                  padding: "7px 14px",
                  borderRadius: 20,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {sessionShots.length} photo{sessionShots.length > 1 ? "s" : ""} saved
              </div>
            )}
            <div style={{ width: 38 }} />
          </div>

          {/* Bottom bar: thumbnail strip + shutter + Done */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingBottom: 20,
            }}
          >
            {sessionShots.length > 0 && (
              <div
                style={{
                  display: "flex",
                  overflowX: "auto",
                  gap: 8,
                  padding: "0 16px 14px",
                }}
              >
                {sessionShots.map((s) => (
                  <img
                    key={s.id}
                    src={s.previewUrl}
                    alt=""
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 8,
                      objectFit: "cover",
                      border: "2px solid #fff",
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 24px",
              }}
            >
              <div style={{ width: 74 }} />
              <button
                onClick={handleShutter}
                disabled={isCapturing || isStarting}
                aria-label="Take photo"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  background: "#fff",
                  border: "4px solid rgba(255,255,255,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isCapturing || isStarting ? "default" : "pointer",
                  opacity: isCapturing || isStarting ? 0.6 : 1,
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    background: "#fff",
                    border: "2px solid #1f2937",
                  }}
                />
              </button>
              <button
                onClick={handleClose}
                style={{
                  width: 74,
                  textAlign: "right",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function InstructionDetailScreen({
  instructionId,
  businessId,
  onBack,
}) {
  const { token, user } = useAuthContext();

  const [instruction, setInstruction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Media lightbox — index into the combined photos+videos array below, so
  // switching between items never has to close/reopen the overlay.
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const touchStartXRef = useRef(null);

  // Audio player (view mode — plays the already-saved instruction.audioUrl)
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPos, setAudioPos] = useState(0);
  const [audioDur, setAudioDur] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");
  const [editedType, setEditedType] = useState("");
  // editedPhotos items:
  //   { id, localUrl, file, url, uploading, progress }
  // - localUrl: blob: preview URL (new picks) or the real Cloudinary URL
  //   (existing photos loaded from the saved instruction) — always used for
  //   the <img> preview.
  // - file: the raw File object for a newly picked/captured photo that
  //   hasn't been uploaded yet. null for photos that already existed on the
  //   saved instruction.
  // - url: the Cloudinary URL, set only once the photo has actually been
  //   uploaded (which now only happens inside handleSaveEdit, on Save).
  // Mirrors editedVideos below. Nothing with `file` set and no `url` is ever
  // sent to Cloudinary until Save is pressed.
  const [editedPhotos, setEditedPhotos] = useState([]);
  const [editedVideos, setEditedVideos] = useState([]);

  // Audio, staged the same way as photos/videos:
  // - editedAudioUrl: the Cloudinary URL, set for audio that already existed
  //   on the saved instruction, or after a freshly-recorded clip has been
  //   uploaded (on Save).
  // - editedAudioFile: the raw recorded File, set the moment recording
  //   finishes, cleared once it's been uploaded. Nothing is uploaded until
  //   Save is pressed.
  // - editedAudioLocalUrl: blob: preview URL for a freshly-recorded (not yet
  //   uploaded) clip.
  const [editedAudioUrl, setEditedAudioUrl] = useState(null);
  const [editedAudioFile, setEditedAudioFile] = useState(null);
  const [editedAudioLocalUrl, setEditedAudioLocalUrl] = useState(null);
  const [editedAudioDuration, setEditedAudioDuration] = useState(null);

  const [editedMode, setEditedMode] = useState("write");
  const [savingEdit, setSavingEdit] = useState(false);

  // In-app multi-shot camera session (photos only — see CustomCameraModal above)
  const [cameraModalVisible, setCameraModalVisible] = useState(false);

  const editedPhotosRef = useRef([]);
  useEffect(() => {
    editedPhotosRef.current = editedPhotos;
  }, [editedPhotos]);

  const editedVideosRef = useRef([]);
  useEffect(() => {
    editedVideosRef.current = editedVideos;
  }, [editedVideos]);

  const editedAudioLocalUrlRef = useRef(null);
  useEffect(() => {
    editedAudioLocalUrlRef.current = editedAudioLocalUrl;
  }, [editedAudioLocalUrl]);

  // Revokes any blob: preview URLs currently staged in the edit form (photos,
  // videos, and audio). Called whenever those local previews are no longer
  // needed — on Cancel (nothing was ever uploaded, so we just drop the local
  // files), after a successful Save (the real Cloudinary URLs take over),
  // and on unmount.
  const revokeStagedPreviews = () => {
    editedPhotosRef.current.forEach((p) => {
      if (p.localUrl?.startsWith("blob:")) URL.revokeObjectURL(p.localUrl);
    });
    editedVideosRef.current.forEach((v) => {
      if (v.localUrl?.startsWith("blob:")) URL.revokeObjectURL(v.localUrl);
    });
    if (editedAudioLocalUrlRef.current) {
      URL.revokeObjectURL(editedAudioLocalUrlRef.current);
    }
  };

  useEffect(() => {
    return () => {
      revokeStagedPreviews();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch instruction ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!instructionId) {
      setLoading(false);
      setError("Invalid instruction ID.");
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          API_ENDPOINTS.CONTRIBUTION_DETAIL(instructionId),
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to fetch.");
        setInstruction(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [instructionId]);

  // ── Fetch comments ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!instructionId) return;
    setCommentsLoading(true);
    fetch(API_ENDPOINTS.INSTRUCTION_COMMENTS(instructionId))
      .then((r) => r.json())
      .then((data) => {
        setComments(Array.isArray(data) ? data : []);
        setCommentsLoading(false);
      })
      .catch((err) => {
        setCommentsError(err.message);
        setCommentsLoading(false);
      });
  }, [instructionId]);

  // ── Audio player (view mode) ────────────────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    setAudioPos(audioRef.current.currentTime);
    setAudioDur(audioRef.current.duration || 0);
  }, []);

  const togglePlay = () => {
    if (!audioRef.current || !instruction?.audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime =
      parseFloat(e.target.value) * (audioRef.current.duration || 0);
  };

  const changeRate = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  // ── Comments ──────────────────────────────────────────────────────────────
  const handleSubmitComment = async () => {
    if (!token || !user) {
      alert("Please login to comment.");
      return;
    }
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        API_ENDPOINTS.INSTRUCTION_COMMENTS(instructionId),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: commentText.trim() }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to post comment.");
      setComments((prev) => [data, ...prev]);
      setCommentText("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Staging new photos/videos/audio (NO upload happens here) ────────────────
  // Adds an instant local-preview placeholder for a newly picked/captured
  // photo. The raw File is kept on the item and is only ever uploaded inside
  // handleSaveEdit, once Save is actually pressed. Cancelling the edit form
  // or simply navigating away means this file is never sent anywhere.
  const addPhotoFile = (file) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const localUrl = URL.createObjectURL(file);
    setEditedPhotos((prev) => [
      ...prev,
      { id, localUrl, file, url: null, uploading: false, progress: 0 },
    ]);
  };

  // Same idea for video — see addPhotoFile above.
  const addVideoFile = (file) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const localUrl = URL.createObjectURL(file);
    setEditedVideos((prev) => [
      ...prev,
      { id, localUrl, file, url: null, uploading: false, progress: 0 },
    ]);
  };

  // Called the moment a recording finishes. Only stages the file + a local
  // preview — no upload until Save. If an older staged (not-yet-uploaded)
  // recording exists, its blob URL is revoked first.
  const addAudioFile = (file, dur) => {
    if (editedAudioLocalUrl) URL.revokeObjectURL(editedAudioLocalUrl);
    const localUrl = URL.createObjectURL(file);
    setEditedAudioFile(file);
    setEditedAudioLocalUrl(localUrl);
    setEditedAudioUrl(null); // supersedes any previously-saved audio URL
    setEditedAudioDuration(dur);
  };

  // Photos picked from the regular file input (device gallery / file browser).
  const handleAddPhoto = (e) => {
    const files = Array.from(e.target.files);
    e.target.value = "";
    if (!files.length) return;
    files.forEach(addPhotoFile);
  };

  // Called once per shutter-press from the in-app multi-shot camera. The
  // camera modal itself stays open across captures — see CustomCameraModal.
  // Only stages the file locally; still no upload until Save.
  const handleCameraCapture = (file) => {
    addPhotoFile(file);
  };

  const handleRemovePhoto = (id) => {
    setEditedPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.localUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(item.localUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleAddVideo = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    addVideoFile(file);
  };

  const handleRemoveVideo = (id) => {
    setEditedVideos((prev) => {
      const item = prev.find((v) => v.id === id);
      if (item?.localUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(item.localUrl);
      }
      return prev.filter((v) => v.id !== id);
    });
  };

  const handleRemoveAudio = () => {
    if (editedAudioLocalUrl) URL.revokeObjectURL(editedAudioLocalUrl);
    setEditedAudioFile(null);
    setEditedAudioLocalUrl(null);
    setEditedAudioUrl(null);
    setEditedAudioDuration(null);
  };

  // ── Save (this is the ONLY place anything gets uploaded to Cloudinary) ────
  const handleSaveEdit = async () => {
    if (!token) return;
    if (editedMode === "write" && !editedNotes.trim()) {
      alert("Please provide written instructions.");
      return;
    }
    if (editedMode === "record" && !editedAudioUrl && !editedAudioFile) {
      alert("Please record an audio instruction.");
      return;
    }

    setSavingEdit(true);
    try {
      // Anything with a staged `file` and no `url` yet hasn't been uploaded —
      // that's everything picked/captured/recorded since opening the edit
      // form. Existing photos/videos/audio already have `url` set and are
      // left alone (not re-uploaded).
      const photosToUpload = editedPhotos.filter((p) => p.file && !p.url);
      const videosToUpload = editedVideos.filter((v) => v.file && !v.url);
      const audioNeedsUpload =
        editedMode === "record" && !!editedAudioFile && !editedAudioUrl;

      if (photosToUpload.length) {
        const uploadingIds = new Set(photosToUpload.map((p) => p.id));
        setEditedPhotos((prev) =>
          prev.map((p) =>
            uploadingIds.has(p.id) ? { ...p, uploading: true, progress: 0 } : p,
          ),
        );
      }
      if (videosToUpload.length) {
        const uploadingIds = new Set(videosToUpload.map((v) => v.id));
        setEditedVideos((prev) =>
          prev.map((v) =>
            uploadingIds.has(v.id) ? { ...v, uploading: true, progress: 0 } : v,
          ),
        );
      }

      // Upload every staged photo, tracking each one's real Cloudinary URL
      // locally (not just in state) so we can build the final request body
      // without racing React's async state updates.
      const uploadedPhotos = await Promise.all(
        photosToUpload.map(async (p) => {
          const toUpload = await compressImage(p.file);
          const url = await uploadToCloudinary(toUpload, "image", {
            onProgress: (pct) =>
              setEditedPhotos((prev) =>
                prev.map((x) => (x.id === p.id ? { ...x, progress: pct } : x)),
              ),
          });
          setEditedPhotos((prev) =>
            prev.map((x) =>
              x.id === p.id ? { ...x, url, uploading: false } : x,
            ),
          );
          return { id: p.id, url };
        }),
      );

      const uploadedVideos = await Promise.all(
        videosToUpload.map(async (v) => {
          const url = await uploadToCloudinary(v.file, "video", {
            onProgress: (pct) =>
              setEditedVideos((prev) =>
                prev.map((x) => (x.id === v.id ? { ...x, progress: pct } : x)),
              ),
          });
          setEditedVideos((prev) =>
            prev.map((x) =>
              x.id === v.id ? { ...x, url, uploading: false } : x,
            ),
          );
          return { id: v.id, url };
        }),
      );

      // Audio: only upload if there's a freshly-recorded clip staged.
      let finalAudioUrl = editedAudioUrl;
      if (audioNeedsUpload) {
        finalAudioUrl = await uploadToCloudinary(editedAudioFile, "video"); // Cloudinary treats audio as video resource
        setEditedAudioUrl(finalAudioUrl);
      }

      const photoUrlById = new Map(uploadedPhotos.map((x) => [x.id, x.url]));
      const videoUrlById = new Map(uploadedVideos.map((x) => [x.id, x.url]));

      // Final lists: existing photos/videos keep their url; newly staged
      // ones use the url we just got back from Cloudinary.
      const finalPhotoUrls = editedPhotos.map(
        (p) => p.url || photoUrlById.get(p.id),
      );
      const finalVideoUrls = editedVideos.map(
        (v) => v.url || videoUrlById.get(v.id),
      );

      const res = await fetch(
        API_ENDPOINTS.CONTRIBUTION_UPDATE(instructionId),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notes: editedMode === "write" ? editedNotes.trim() : "",
            type: editedType,
            photos: finalPhotoUrls,
            videos: finalVideoUrls,
            audioUrl: editedMode === "record" ? finalAudioUrl : null,
            audioDuration: editedMode === "record" ? editedAudioDuration : null,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update.");

      setInstruction((prev) =>
        prev
          ? {
              ...prev,
              notes: data.notes,
              type: data.type,
              photos: data.photos,
              videos: data.videos,
              audioUrl: data.audioUrl,
              audioDuration: data.audioDuration,
            }
          : prev,
      );
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      setIsPlaying(false);
      setAudioPos(0);
      setAudioDur(0);
      revokeStagedPreviews(); // real URLs now live on `instruction`; drop local blobs
      setEditedAudioFile(null);
      setEditedAudioLocalUrl(null);
      setIsEditing(false);
    } catch (err) {
      alert(err.message);
      // Reset any "uploading" flags so the user can see what's staged and retry.
      setEditedPhotos((prev) => prev.map((p) => ({ ...p, uploading: false })));
      setEditedVideos((prev) => prev.map((v) => ({ ...v, uploading: false })));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    // Nothing staged here was ever uploaded — just drop the local previews
    // and close the form.
    revokeStagedPreviews();
    setEditedAudioFile(null);
    setEditedAudioLocalUrl(null);
    setIsEditing(false);
  };

  // ── Lightbox navigation ───────────────────────────────────────────────────
  const goPrev = useCallback(() => {
    setLightboxIndex((i) =>
      i === null ? i : (i - 1 + allMediaLenRef.current) % allMediaLenRef.current,
    );
  }, []);
  const goNext = useCallback(() => {
    setLightboxIndex((i) =>
      i === null ? i : (i + 1) % allMediaLenRef.current,
    );
  }, []);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    const SWIPE_THRESHOLD = 50;
    if (deltaX > SWIPE_THRESHOLD) goPrev();
    else if (deltaX < -SWIPE_THRESHOLD) goNext();
  };

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="ids-center">
        <span className="ids-spinner ids-spinner-lg" />
        <p className="ids-loading-text">Loading instruction…</p>
      </div>
    );
  if (error || !instruction)
    return (
      <div className="ids-center">
        <p className="ids-error-text">{error || "Instruction not found."}</p>
        <button className="ids-back-btn-cta" onClick={onBack}>
          Go Back
        </button>
      </div>
    );

  const allPhotos = instruction.photos ?? [];
  const allVideos = instruction.videos ?? [];
  const hasMedia = allPhotos.length > 0 || allVideos.length > 0;
  const allMedia = [
    ...allPhotos.map((url) => ({ type: "image", url })),
    ...allVideos.map((url) => ({ type: "video", url })),
  ];
  const hasAudio = !!instruction.audioUrl;
  const isOwner = !!instruction.isVerifiedBusinessInstruction;
  const canEdit = !!token;

  return (
    <div className="ids-root">
      {/* ── Header ── */}
      <div className="ids-screen-header">
        <button className="ids-header-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={24} color="#1f2937" />
        </button>
        <span className="ids-header-title">Instruction Details</span>
        <div style={{ width: 32 }} />
      </div>

      <div className="ids-scroll">
        <div className="ids-inner">
          {/* ── User info ── */}
          <div className="ids-user-card">
            <div className={`ids-avatar ${isOwner ? "ids-avatar-owner" : ""}`}>
              <User size={22} color="#fff" />
            </div>
            <div className="ids-user-info">
              <span className="ids-user-name">
                {instruction.userName || "Anonymous Contributor"}
              </span>
              <SourceBadge isOwner={isOwner} />
            </div>
          </div>

          {/* ══ EDIT FORM ══ */}
          {isEditing ? (
            <div className="ids-edit-block">
              {/* Delivery type */}
              <p className="ids-edit-label">Delivery Type</p>
              <div className="ids-delivery-row">
                {["Courier/Parcel Delivery", "Food Delivery", "Both"].map(
                  (dt) => (
                    <button
                      key={dt}
                      className={`ids-delivery-btn ${editedType === dt ? "active" : ""}`}
                      onClick={() => setEditedType(dt)}
                    >
                      {dt === "Courier/Parcel Delivery" && (
                        <Package
                          size={14}
                          color={editedType === dt ? "#fff" : "#6b7280"}
                        />
                      )}
                      {dt === "Food Delivery" && (
                        <UtensilsCrossed
                          size={14}
                          color={editedType === dt ? "#fff" : "#6b7280"}
                        />
                      )}
                      <span>
                        {dt === "Courier/Parcel Delivery"
                          ? "Courier"
                          : dt === "Food Delivery"
                            ? "Food"
                            : "Both"}
                      </span>
                    </button>
                  ),
                )}
              </div>

              {/* Photos */}
              <p className="ids-edit-label">Photos</p>
              <div className="ids-media-row">
                {editedPhotos.map((p) => (
                  <div key={p.id} className="ids-media-thumb">
                    <img
                      src={p.url || p.localUrl}
                      alt=""
                      className="ids-media-thumb-img"
                    />
                    {p.uploading && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 8,
                          background: "rgba(0,0,0,0.45)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        <span className="ids-spinner ids-spinner-white" />
                        {p.progress > 0 && (
                          <span
                            style={{
                              color: "#fff",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {p.progress}%
                          </span>
                        )}
                      </div>
                    )}
                    <button
                      className="ids-media-remove"
                      onClick={() => handleRemovePhoto(p.id)}
                      disabled={savingEdit}
                    >
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ))}

                {/* Camera: opens the in-app multi-shot camera session
                    (stays open across captures — see CustomCameraModal).
                    Captured shots are only staged locally, not uploaded. */}
                <button
                  type="button"
                  className="ids-media-add"
                  onClick={() => setCameraModalVisible(true)}
                  aria-label="Take photos with camera"
                  disabled={savingEdit}
                >
                  <Camera size={22} color="#9ca3af" />
                </button>

                {/* Gallery: pick one or more existing photos from disk. */}
                <label className="ids-media-add" aria-label="Choose photos from device">
                  <Images size={22} color="#9ca3af" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleAddPhoto}
                    disabled={savingEdit}
                  />
                </label>
              </div>

              {/* Videos */}
              <p className="ids-edit-label">Videos</p>
              <div className="ids-media-row">
                {editedVideos.map((v) => (
                  <div key={v.id} className="ids-media-thumb">
                    <VideoThumbnail
                      url={v.url || v.localUrl}
                      iconSize={18}
                      style={{ width: "100%", height: "100%" }}
                    />
                    {v.uploading && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 8,
                          background: "rgba(0,0,0,0.45)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        <span className="ids-spinner ids-spinner-white" />
                        {v.progress > 0 && (
                          <span
                            style={{
                              color: "#fff",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {v.progress}%
                          </span>
                        )}
                      </div>
                    )}
                    <button
                      className="ids-media-remove"
                      onClick={() => handleRemoveVideo(v.id)}
                      disabled={savingEdit}
                    >
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ))}
                <label className="ids-media-add">
                  <VideoIcon size={22} color="#9ca3af" />
                  <input
                    type="file"
                    accept="video/*"
                    style={{ display: "none" }}
                    onChange={handleAddVideo}
                    disabled={savingEdit}
                  />
                </label>
              </div>

              {/* Write / Record toggle */}
              <p className="ids-edit-label" style={{ marginTop: 4 }}>
                Instructions *
              </p>
              <div className="ids-mode-row">
                <button
                  className={`ids-mode-btn ${editedMode === "write" ? "active" : ""}`}
                  onClick={() => setEditedMode("write")}
                >
                  ✍️ Write
                </button>
                <button
                  className={`ids-mode-btn ${editedMode === "record" ? "active" : ""}`}
                  onClick={() => setEditedMode("record")}
                >
                  🎤 Record
                </button>
              </div>

              {editedMode === "write" ? (
                <textarea
                  className="ids-notes-input"
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  placeholder="Write your instructions…"
                  rows={4}
                />
              ) : (
                <div className="ids-audio-section">
                  {editedAudioUrl || editedAudioFile ? (
                    <div className="ids-audio-edit-row">
                      <span className="ids-audio-edit-label">
                        🎵{" "}
                        {editedAudioDuration
                          ? `Audio (${editedAudioDuration}s)${
                              editedAudioFile && !editedAudioUrl
                                ? " — not saved yet"
                                : ""
                            }`
                          : "Audio Instruction"}
                      </span>
                      <button
                        className="ids-audio-remove"
                        onClick={handleRemoveAudio}
                        disabled={savingEdit}
                      >
                        <X size={18} color="#ef4444" />
                      </button>
                    </div>
                  ) : (
                    <VoiceRecorder
                      disabled={savingEdit}
                      onAudioReady={(file, dur) => {
                        addAudioFile(file, dur);
                      }}
                    />
                  )}
                </div>
              )}

              {/* Save / Cancel */}
              <div className="ids-edit-actions">
                <button
                  className="ids-cancel-btn"
                  onClick={handleCancelEdit}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  className="ids-save-btn"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? (
                    <>
                      <span className="ids-spinner ids-spinner-white" />
                      <span>Uploading…</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} color="#fff" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ══ VIEW MODE ══ */}

              {canEdit && (
                <button
                  className="ids-edit-entry-btn"
                  onClick={() => {
                    setEditedNotes(instruction.notes || "");
                    setEditedType(
                      instruction.type || "Courier/Parcel Delivery",
                    );
                    setEditedPhotos(
                      (instruction.photos ?? []).map((url) => ({
                        id: url,
                        localUrl: url,
                        file: null,
                        url,
                        uploading: false,
                        progress: 100,
                      })),
                    );
                    setEditedVideos(
                      (instruction.videos ?? []).map((url) => ({
                        id: url,
                        localUrl: url,
                        file: null,
                        url,
                        uploading: false,
                        progress: 100,
                      })),
                    );
                    setEditedAudioUrl(instruction.audioUrl || null);
                    setEditedAudioFile(null);
                    setEditedAudioLocalUrl(null);
                    setEditedAudioDuration(instruction.audioDuration ?? null);
                    setEditedMode(instruction.audioUrl ? "record" : "write");
                    setIsEditing(true);
                  }}
                >
                  <Edit2 size={16} color="#2563eb" />
                  <span>Edit Instruction</span>
                </button>
              )}

              {/* Media */}
              {hasMedia && (
                <div className="ids-media-section">
                  <p className="ids-section-title">Media</p>
                  <div className="ids-media-scroll">
                    {allPhotos.map((url, i) => (
                      <button
                        key={`p-${i}`}
                        className="ids-media-item"
                        onClick={() => setLightboxIndex(i)}
                      >
                        <img src={url} alt="" className="ids-media-img" />
                      </button>
                    ))}
                    {allVideos.map((url, i) => (
                      <button
                        key={`v-${i}`}
                        className="ids-media-item"
                        onClick={() =>
                          setLightboxIndex(allPhotos.length + i)
                        }
                      >
                        <VideoThumbnail url={url} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="ids-info-block">
                <div className="ids-info-row">
                  <span className="ids-info-label">Delivery Type</span>
                  <div className="ids-badges">
                    {(instruction.type === "Courier/Parcel Delivery" ||
                      instruction.type === "Both") && (
                      <Package size={16} color="#2563eb" />
                    )}
                    {(instruction.type === "Food Delivery" ||
                      instruction.type === "Both") && (
                      <UtensilsCrossed size={16} color="#f59e0b" />
                    )}
                    <span className="ids-info-value">{instruction.type}</span>
                  </div>
                </div>
                <div className="ids-info-row">
                  <span className="ids-info-label">Date Added</span>
                  <span className="ids-info-value">
                    {formatDate(instruction.timestamp)}
                  </span>
                </div>
              </div>

              {/* Audio player */}
              {hasAudio && (
                <div className="ids-audio-block">
                  <div className="ids-audio-header">
                    <Volume2 size={20} color="#2563eb" />
                    <span className="ids-section-title">Audio Instruction</span>
                  </div>
                  <audio
                    ref={audioRef}
                    src={instruction.audioUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    onLoadedMetadata={handleTimeUpdate}
                    style={{ display: "none" }}
                  />
                  <div className="ids-audio-player">
                    <button className="ids-audio-play-btn" onClick={togglePlay}>
                      {isPlaying ? (
                        <Pause size={24} color="#fff" fill="#fff" />
                      ) : (
                        <Play size={24} color="#fff" fill="#fff" />
                      )}
                    </button>
                    <div className="ids-audio-info">
                      <input
                        type="range"
                        className="ids-audio-slider"
                        min={0}
                        max={1}
                        step={0.001}
                        value={audioDur > 0 ? audioPos / audioDur : 0}
                        onChange={handleSeek}
                      />
                      <div className="ids-audio-times">
                        <span>{formatTime(audioPos * 1000)}</span>
                        <span>
                          {audioDur ? formatTime(audioDur * 1000) : "--:--"}
                        </span>
                      </div>
                      <div className="ids-speed-row">
                        {[1.0, 1.5, 2.0].map((r) => (
                          <button
                            key={r}
                            className={`ids-speed-btn ${playbackRate === r ? "active" : ""}`}
                            onClick={() => changeRate(r)}
                          >
                            {r}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {instruction.notes?.trim() && (
                <div className="ids-notes-block">
                  <p className="ids-section-title">Written Instructions:</p>
                  <p className="ids-notes">{instruction.notes}</p>
                </div>
              )}
            </>
          )}

          {/* ── Comments ── */}
          <div className="ids-comments-section">
            <div className="ids-comments-header">
              <MessageCircle size={20} color="#1f2937" />
              <span className="ids-section-title">
                Comments ({comments.length})
              </span>
            </div>
            <div className="ids-comment-input-row">
              <textarea
                className="ids-comment-input"
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                maxLength={500}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
              />
              <button
                className="ids-comment-send-btn"
                onClick={handleSubmitComment}
                disabled={submitting || !commentText.trim()}
              >
                {submitting ? (
                  <span className="ids-spinner ids-spinner-white" />
                ) : (
                  <Send size={16} color="#fff" />
                )}
              </button>
            </div>
            {commentsLoading ? (
              <div className="ids-comments-loading">
                <span className="ids-spinner" />
                <span>Loading comments…</span>
              </div>
            ) : commentsError ? (
              <p className="ids-comments-error">{commentsError}</p>
            ) : comments.length === 0 ? (
              <p className="ids-comments-empty">
                No comments yet. Be the first!
              </p>
            ) : (
              comments.map((item) => (
                <div key={item.id || item._id} className="ids-comment-card">
                  <div className="ids-comment-header">
                    <User size={14} color="#2563eb" />
                    <div className="ids-comment-meta">
                      <span className="ids-comment-name">{item.userName}</span>
                      <span className="ids-comment-level">
                        Level {item.userLevel}
                      </span>
                    </div>
                    <span className="ids-comment-date">
                      {formatDate(item.timestamp)}
                    </span>
                  </div>
                  <p className="ids-comment-text">{item.text}</p>
                </div>
              ))
            )}
          </div>
          <div style={{ height: 40 }} />
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxIndex !== null && allMedia[lightboxIndex] && (
        <LightboxOverlay
          allMedia={allMedia}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={goPrev}
          onNext={goNext}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />
      )}

      {/* ── In-app multi-shot camera (photos only) ── */}
      <CustomCameraModal
        visible={cameraModalVisible}
        onClose={() => setCameraModalVisible(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}

// Keeps the always-fresh media count available to goPrev/goNext without
// forcing them to be redefined every render (they're wired to a keydown
// listener whose effect only needs to resubscribe when the lightbox opens or
// closes, not on every render).
const allMediaLenRef = { current: 0 };

// ── Lightbox overlay (separate component so its keydown effect is scoped) ────
function LightboxOverlay({
  allMedia,
  index,
  onClose,
  onPrev,
  onNext,
  onTouchStart,
  onTouchEnd,
}) {
  allMediaLenRef.current = allMedia.length;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") onNext();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onNext, onPrev, onClose]);

  const item = allMedia[index];

  return (
    <div className="ids-lightbox" onClick={onClose}>
      <div className="ids-lightbox-header" onClick={(e) => e.stopPropagation()}>
        <span className="ids-lightbox-title">
          {index + 1} of {allMedia.length}
        </span>
        <button className="ids-lightbox-close" onClick={onClose}>
          <X size={28} color="#fff" />
        </button>
      </div>
      <div
        className="ids-lightbox-body"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ position: "relative" }}
      >
        {allMedia.length > 1 && (
          <button
            onClick={onPrev}
            aria-label="Previous"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(0,0,0,0.5)",
              border: "none",
              borderRadius: "50%",
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            <ChevronLeft size={28} color="#fff" />
          </button>
        )}

        {item.type === "image" ? (
          <img key={index} src={item.url} alt="" className="ids-lightbox-img" />
        ) : (
          // Deliberately the RAW uploaded URL here, not optimizedVideoUrl().
          // A transformed (q_auto/f_auto/w_...) video that Cloudinary hasn't
          // transcoded before gets transcoded live and streamed back chunk by
          // chunk with no known final size — that's exactly what caused the
          // duration to climb second-by-second and the scrubber/controls to
          // jump around. The original file has full, correct metadata the
          // instant it starts loading, so playback and the scrubber behave
          // normally. It costs a little more bandwidth than a transformed
          // version would, but it's the only way to get clean, immediate
          // controls for every video, every time — not just after the first
          // viewer happens to warm Cloudinary's cache.
          <video
            key={index}
            src={item.url}
            controls
            autoPlay
            preload="auto"
            className="ids-lightbox-video"
          />
        )}

        {allMedia.length > 1 && (
          <button
            onClick={onNext}
            aria-label="Next"
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "rgba(0,0,0,0.5)",
              border: "none",
              borderRadius: "50%",
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            <ChevronRight size={28} color="#fff" />
          </button>
        )}
      </div>
    </div>
  );
}