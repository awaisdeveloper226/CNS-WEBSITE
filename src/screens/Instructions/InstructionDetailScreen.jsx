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
} from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";
import { API_ENDPOINTS } from "../../constants/network";
import "./InstructionDetailScreen.css";

// ── Cloudinary ────────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dvmoaqsdb";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

async function uploadToCloudinary(file, resourceType) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("resource_type", resourceType);
  const res = await fetch(CLOUDINARY_API_URL, {
    method: "POST",
    body: formData,
    headers: { Accept: "application/json" },
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

  // Media lightbox
  const [lightbox, setLightbox] = useState(null); // { type: "image"|"video", url, index }

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
  const [editedPhotos, setEditedPhotos] = useState([]);
  const [editedVideos, setEditedVideos] = useState([]);
  const [editedAudioUrl, setEditedAudioUrl] = useState(null);
  const [editedAudioDuration, setEditedAudioDuration] = useState(null);
  const [editedMode, setEditedMode] = useState("write");
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // ── Fetch instruction ─────────────────────────────────────────────────────
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
            photos: editedPhotos,
            videos: editedVideos,
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

  const handleAddPhoto = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingPhoto(true);
    try {
      const urls = await Promise.all(
        files.map((f) => uploadToCloudinary(f, "image")),
      );
      setEditedPhotos((prev) => [...prev, ...urls]);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleAddVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const url = await uploadToCloudinary(file, "video");
      setEditedVideos((prev) => [...prev, url]);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploadingVideo(false);
      e.target.value = "";
    }
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
                {editedPhotos.map((url, i) => (
                  <div key={i} className="ids-media-thumb">
                    <img src={url} alt="" className="ids-media-thumb-img" />
                    <button
                      className="ids-media-remove"
                      onClick={() =>
                        setEditedPhotos((p) => p.filter((_, j) => j !== i))
                      }
                    >
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ))}
                <label className="ids-media-add">
                  {uploadingPhoto ? (
                    <span className="ids-spinner" />
                  ) : (
                    <Camera size={22} color="#9ca3af" />
                  )}
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
                {editedVideos.map((_, i) => (
                  <div key={i} className="ids-media-thumb">
                    <div className="ids-video-thumb">
                      <VideoIcon size={22} color="#fff" />
                    </div>
                    <button
                      className="ids-media-remove"
                      onClick={() =>
                        setEditedVideos((p) => p.filter((_, j) => j !== i))
                      }
                    >
                      <X size={10} color="#fff" />
                    </button>
                  </div>
                ))}
                <label className="ids-media-add">
                  {uploadingVideo ? (
                    <span className="ids-spinner" />
                  ) : (
                    <VideoIcon size={22} color="#9ca3af" />
                  )}
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
                  disabled={savingEdit || uploadingPhoto || uploadingVideo}
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
                    setEditedPhotos(instruction.photos ?? []);
                    setEditedVideos(instruction.videos ?? []);
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
                        onClick={() =>
                          setLightbox({ type: "image", url, index: i })
                        }
                      >
                        <img src={url} alt="" className="ids-media-img" />
                      </button>
                    ))}
                    {allVideos.map((url, i) => (
                      <button
                        key={`v-${i}`}
                        className="ids-media-item"
                        onClick={() => setLightbox({ type: "video", url })}
                      >
                        <div className="ids-media-video-thumb">
                          <div className="ids-media-play-btn">
                            <VideoIcon size={28} color="#fff" />
                          </div>
                        </div>
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
      {lightbox && (
        <div className="ids-lightbox" onClick={() => setLightbox(null)}>
          <div
            className="ids-lightbox-header"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="ids-lightbox-title">
              {lightbox.type === "image"
                ? `Photo ${(lightbox.index ?? 0) + 1} of ${allPhotos.length}`
                : "Video"}
            </span>
            <button
              className="ids-lightbox-close"
              onClick={() => setLightbox(null)}
            >
              <X size={28} color="#fff" />
            </button>
          </div>
          <div
            className="ids-lightbox-body"
            onClick={(e) => e.stopPropagation()}
          >
            {lightbox.type === "image" ? (
              <img src={lightbox.url} alt="" className="ids-lightbox-img" />
            ) : (
              <video
                src={lightbox.url}
                controls
                autoPlay
                className="ids-lightbox-video"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
