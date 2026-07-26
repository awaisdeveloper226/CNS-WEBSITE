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

async function uploadToCloudinary(file, resourceType, signal) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("resource_type", resourceType);
  const res = await fetch(CLOUDINARY_API_URL, {
    method: "POST",
    body: formData,
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Upload failed");
  }
  return (await res.json()).secure_url;
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
          src={url}
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

// ── Web Voice Recorder (replaces WhatsApp PanResponder version) ───────────────
function VoiceRecorder({ onAudioReady, disabled }) {
  const [state, setState] = useState("idle"); // idle | recording | uploading
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
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice_${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setState("uploading");
        try {
          const url = await uploadToCloudinary(file, "video"); // Cloudinary treats audio as video resource
          onAudioReady(url, durationRef.current);
        } catch (err) {
          alert("Upload failed: " + err.message);
        }
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

  if (state === "uploading")
    return (
      <div className="ids-voice-uploading">
        <span className="ids-spinner" />
        <span>Processing voice note…</span>
      </div>
    );

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

  // Keeps the latest server-confirmed instruction available to async
  // callbacks (background photo/video sync) without them closing over stale
  // state.
  const instructionRef = useRef(null);
  useEffect(() => {
    instructionRef.current = instruction;
  }, [instruction]);

  // Media lightbox — index into the combined photos+videos array below, so
  // switching between items never has to close/reopen the overlay.
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const touchStartXRef = useRef(null);

  // Audio player
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
  // editedPhotos items: { id, localUrl, url, uploading }
  // localUrl is a blob: object URL for instant preview; url is the Cloudinary
  // URL once the background upload finishes. Mirrors editedVideos below.
  const [editedPhotos, setEditedPhotos] = useState([]);
  // editedVideos items: { id, localUrl, url, uploading }
  // localUrl is a blob: object URL for instant preview; url is the Cloudinary
  // URL once the background upload finishes.
  const [editedVideos, setEditedVideos] = useState([]);
  const [editedAudioUrl, setEditedAudioUrl] = useState(null);
  const [editedAudioDuration, setEditedAudioDuration] = useState(null);
  const [editedMode, setEditedMode] = useState("write");
  const [savingEdit, setSavingEdit] = useState(false);

  const editedPhotosRef = useRef([]);
  useEffect(() => {
    editedPhotosRef.current = editedPhotos;
  }, [editedPhotos]);

  const editedVideosRef = useRef([]);
  useEffect(() => {
    editedVideosRef.current = editedVideos;
  }, [editedVideos]);

  const cancelledPhotoIdsRef = useRef(new Set());
  const photoControllersRef = useRef(new Map());
  // Serializes background "attach this finished photo to the saved
  // instruction" calls so two finishing close together don't clobber
  // each other's writes.
  const photoSyncChainRef = useRef(Promise.resolve());

  const cancelledVideoIdsRef = useRef(new Set());
  const videoControllersRef = useRef(new Map());
  // Serializes background "attach this finished video to the saved
  // instruction" calls so two finishing close together don't clobber
  // each other's writes.
  const videoSyncChainRef = useRef(Promise.resolve());

  // Revoke any blob: object URLs still around when the screen unmounts.
  useEffect(() => {
    return () => {
      editedPhotosRef.current.forEach((p) => {
        if (p.localUrl?.startsWith("blob:")) URL.revokeObjectURL(p.localUrl);
      });
      editedVideosRef.current.forEach((v) => {
        if (v.localUrl?.startsWith("blob:")) URL.revokeObjectURL(v.localUrl);
      });
    };
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

  // ── Audio player ──────────────────────────────────────────────────────────
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

  // ── Background photo sync ─────────────────────────────────────────────────
  // Called the moment a photo finishes uploading to Cloudinary, whether the
  // edit form is still open or was already saved/closed. Attaches the photo
  // to whatever is currently persisted on the server, without requiring the
  // user to hit Save again. Mirrors queueVideoAppend below.
  const queuePhotoAppend = (url) => {
    photoSyncChainRef.current = photoSyncChainRef.current
      .then(async () => {
        const current = instructionRef.current;
        if (!current || !token) return;
        const updatedPhotos = [...(current.photos || []), url];
        try {
          const res = await fetch(
            API_ENDPOINTS.CONTRIBUTION_UPDATE(instructionId),
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                notes: current.notes || "",
                type: current.type,
                photos: updatedPhotos,
                videos: current.videos || [],
                audioUrl: current.audioUrl || null,
                audioDuration: current.audioDuration ?? null,
              }),
            },
          );
          const data = await res.json();
          if (res.ok) {
            setInstruction((prev) =>
              prev ? { ...prev, photos: data.photos ?? updatedPhotos } : prev,
            );
          }
        } catch (_) {
          // Best-effort — the photo is safely uploaded on Cloudinary either
          // way and will attach next time the user hits Save.
        }
      })
      .catch(() => {});
  };

  // ── Background video sync ─────────────────────────────────────────────────
  // Called the moment a video finishes uploading to Cloudinary, whether the
  // edit form is still open or was already saved/closed. Attaches the video
  // to whatever is currently persisted on the server, without requiring the
  // user to hit Save again.
  const queueVideoAppend = (url) => {
    videoSyncChainRef.current = videoSyncChainRef.current
      .then(async () => {
        const current = instructionRef.current;
        if (!current || !token) return;
        const updatedVideos = [...(current.videos || []), url];
        try {
          const res = await fetch(
            API_ENDPOINTS.CONTRIBUTION_UPDATE(instructionId),
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                notes: current.notes || "",
                type: current.type,
                photos: current.photos || [],
                videos: updatedVideos,
                audioUrl: current.audioUrl || null,
                audioDuration: current.audioDuration ?? null,
              }),
            },
          );
          const data = await res.json();
          if (res.ok) {
            setInstruction((prev) =>
              prev ? { ...prev, videos: data.videos ?? updatedVideos } : prev,
            );
          }
        } catch (_) {
          // Best-effort — the video is safely uploaded on Cloudinary either
          // way and will attach next time the user hits Save.
        }
      })
      .catch(() => {});
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!token) return;
    if (editedMode === "write" && !editedNotes.trim()) {
      alert("Please provide written instructions.");
      return;
    }
    if (editedMode === "record" && !editedAudioUrl) {
      alert("Please record an audio instruction.");
      return;
    }
    setSavingEdit(true);
    try {
      // Only photos/videos that have actually finished uploading go in now —
      // any still in progress keep uploading in the background and attach
      // themselves via queuePhotoAppend / queueVideoAppend the moment
      // they're done.
      const completedPhotoUrls = editedPhotos
        .filter((p) => p.url)
        .map((p) => p.url);
      const completedVideoUrls = editedVideos
        .filter((v) => v.url)
        .map((v) => v.url);

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
            photos: completedPhotoUrls,
            videos: completedVideoUrls,
            audioUrl: editedMode === "record" ? editedAudioUrl : null,
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
      setIsEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Fire-and-forget, one placeholder per file: each selected photo shows up
  // instantly as its own local preview and uploads in the background,
  // independently of the others. The user can hit Save immediately —
  // completed photo URLs go in right away, and any still uploading attach
  // themselves (via queuePhotoAppend) the moment they finish, whether or not
  // the edit form is still open. Mirrors handleAddVideo below.
  const handleAddPhoto = (e) => {
    const files = Array.from(e.target.files);
    e.target.value = "";
    if (!files.length) return;

    files.forEach((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const localUrl = URL.createObjectURL(file);
      setEditedPhotos((prev) => [
        ...prev,
        { id, localUrl, url: null, uploading: true },
      ]);

      const controller = new AbortController();
      photoControllersRef.current.set(id, controller);

      uploadToCloudinary(file, "image", controller.signal)
        .then((url) => {
          if (cancelledPhotoIdsRef.current.has(id)) return;
          setEditedPhotos((prev) =>
            prev.map((p) => (p.id === id ? { ...p, url, uploading: false } : p)),
          );
          queuePhotoAppend(url);
        })
        .catch((err) => {
          if (!cancelledPhotoIdsRef.current.has(id)) {
            alert("Photo upload failed: " + err.message);
            setEditedPhotos((prev) => prev.filter((p) => p.id !== id));
          }
        })
        .finally(() => {
          photoControllersRef.current.delete(id);
        });
    });
  };

  const handleRemovePhoto = (id) => {
    cancelledPhotoIdsRef.current.add(id);
    const controller = photoControllersRef.current.get(id);
    if (controller) controller.abort();

    setEditedPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item?.localUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(item.localUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  // Fire-and-forget: the video shows up instantly as a local preview and
  // uploads in the background. The user can hit Save immediately — the URL
  // attaches itself (via queueVideoAppend) the moment the upload finishes,
  // whether or not the edit form is still open. The thumbnail box itself is
  // the only upload indicator — its spinner clears the moment the real
  // Cloudinary-hosted frame renders in place of it.
  const handleAddVideo = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const localUrl = URL.createObjectURL(file);
    setEditedVideos((prev) => [
      ...prev,
      { id, localUrl, url: null, uploading: true },
    ]);

    const controller = new AbortController();
    videoControllersRef.current.set(id, controller);

    uploadToCloudinary(file, "video", controller.signal)
      .then((url) => {
        if (cancelledVideoIdsRef.current.has(id)) return;
        setEditedVideos((prev) =>
          prev.map((v) => (v.id === id ? { ...v, url, uploading: false } : v)),
        );
        queueVideoAppend(url);
      })
      .catch((err) => {
        if (!cancelledVideoIdsRef.current.has(id)) {
          alert("Video upload failed: " + err.message);
          setEditedVideos((prev) => prev.filter((v) => v.id !== id));
        }
      })
      .finally(() => {
        videoControllersRef.current.delete(id);
      });
  };

  const handleRemoveVideo = (id) => {
    cancelledVideoIdsRef.current.add(id);
    const controller = videoControllersRef.current.get(id);
    if (controller) controller.abort();

    setEditedVideos((prev) => {
      const item = prev.find((v) => v.id === id);
      if (item?.localUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(item.localUrl);
      }
      return prev.filter((v) => v.id !== id);
    });
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
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span className="ids-spinner ids-spinner-white" />
                      </div>
                    )}
                    <button
                      className="ids-media-remove"
                      onClick={() => handleRemovePhoto(p.id)}
                    >
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ))}
                <label className="ids-media-add">
                  <Camera size={22} color="#9ca3af" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleAddPhoto}
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
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span className="ids-spinner ids-spinner-white" />
                      </div>
                    )}
                    <button
                      className="ids-media-remove"
                      onClick={() => handleRemoveVideo(v.id)}
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
                  {editedAudioUrl ? (
                    <div className="ids-audio-edit-row">
                      <span className="ids-audio-edit-label">
                        🎵{" "}
                        {editedAudioDuration
                          ? `Audio (${editedAudioDuration}s)`
                          : "Audio Instruction"}
                      </span>
                      <button
                        className="ids-audio-remove"
                        onClick={() => {
                          setEditedAudioUrl(null);
                          setEditedAudioDuration(null);
                        }}
                      >
                        <X size={18} color="#ef4444" />
                      </button>
                    </div>
                  ) : (
                    <VoiceRecorder
                      onAudioReady={(url, dur) => {
                        setEditedAudioUrl(url);
                        setEditedAudioDuration(dur);
                      }}
                    />
                  )}
                </div>
              )}

              {/* Save / Cancel */}
              <div className="ids-edit-actions">
                <button
                  className="ids-cancel-btn"
                  onClick={() => setIsEditing(false)}
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
                    <span className="ids-spinner ids-spinner-white" />
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
                        url,
                        uploading: false,
                      })),
                    );
                    setEditedVideos(
                      (instruction.videos ?? []).map((url) => ({
                        id: url,
                        localUrl: url,
                        url,
                        uploading: false,
                      })),
                    );
                    setEditedAudioUrl(instruction.audioUrl || null);
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
          <video
            key={index}
            src={item.url}
            controls
            autoPlay
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