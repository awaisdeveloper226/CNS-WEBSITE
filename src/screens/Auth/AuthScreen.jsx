import { useState } from "react";
import { MapPin, Mail, Lock, User as UserIcon, ArrowLeft } from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";
import "./AuthScreen.css";

export default function AuthScreen() {
  const {
    login, register, forgotPassword, resetPassword,
    isLoading, error, mode, setMode, otpSent, resetEmail,
  } = useAuthContext();

  const [name, setName]                         = useState("");
  const [email, setEmail]                       = useState("");
  const [password, setPassword]                 = useState("");
  const [confirmPassword, setConfirmPassword]   = useState("");
  const [otp, setOtp]                           = useState("");
  const [newPassword, setNewPassword]           = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [localError, setLocalError]             = useState("");

  const showErr = (msg) => setLocalError(msg);
  const clearErr = () => setLocalError("");

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    clearErr();
    if (!email || !password) return showErr("Email and password are required.");
    const err = await login({ email, password });
    if (err) showErr(err);
  };

  const handleRegister = async () => {
    clearErr();
    if (!name || !email || !password) return showErr("All fields are required.");
    if (password !== confirmPassword) return showErr("Passwords do not match.");
    const err = await register({ name, email, password });
    if (err) showErr(err);
  };

  const handleForgotPassword = async () => {
    clearErr();
    if (!email) return showErr("Please enter your email.");
    const err = await forgotPassword(email);
    if (err) showErr(err);
  };

  const handleResendOtp = async () => {
    clearErr();
    const err = await forgotPassword(resetEmail);
    if (err) showErr(err);
    else { setOtp(""); setLocalError(""); }
  };

  const handleResetPassword = async () => {
    clearErr();
    if (!otp || !newPassword || !confirmNewPassword) return showErr("All fields are required.");
    if (otp.length < 6) return showErr("Please enter the full 6-digit code.");
    if (newPassword !== confirmNewPassword) return showErr("Passwords do not match.");
    if (newPassword.length < 6) return showErr("Password must be at least 6 characters.");
    const err = await resetPassword(otp, newPassword);
    if (err) {
      showErr(err);
    } else {
      setOtp(""); setNewPassword(""); setConfirmNewPassword("");
    }
  };

  const displayError = localError || error;

  // ── Forgot ─────────────────────────────────────────────────────────────────
  const renderForgot = () => (
    <>
      <button className="auth-back-btn" onClick={() => { clearErr(); setMode("login"); }}>
        <ArrowLeft size={18} color="#2563eb" />
        <span>Back to Sign In</span>
      </button>
      <h2 className="auth-form-title">Forgot Password</h2>
      <p className="auth-sub-text">Enter your email and we'll send you a 6-digit reset code.</p>
      {displayError && <div className="auth-error-box">{displayError}</div>}
      <div className="auth-input-row">
        <Mail size={20} color="#6b7280" />
        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <button className="auth-btn" onClick={handleForgotPassword} disabled={isLoading}>
        {isLoading ? <span className="auth-spinner" /> : "Send Reset Code"}
      </button>
    </>
  );

  // ── OTP ────────────────────────────────────────────────────────────────────
  const renderOtp = () => (
    <>
      <button className="auth-back-btn" onClick={() => { clearErr(); setMode("forgot"); }}>
        <ArrowLeft size={18} color="#2563eb" />
        <span>Back</span>
      </button>
      <h2 className="auth-form-title">Enter Reset Code</h2>
      {otpSent && (
        <div className="auth-success-box">
          <p className="auth-success-text">
            ✉️ Code sent to <strong>{resetEmail}</strong>
          </p>
          <p className="auth-success-sub">Check your inbox and spam folder</p>
        </div>
      )}
      <p className="auth-sub-text">Enter the 6-digit code and choose a new password.</p>
      {displayError && <div className="auth-error-box">{displayError}</div>}
      <div className="auth-input-row auth-otp-row">
        <input
          className="auth-input auth-otp-input"
          type="text"
          inputMode="numeric"
          placeholder="• • • • • •"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          autoFocus
          maxLength={6}
        />
      </div>
      <div className="auth-input-row">
        <Lock size={20} color="#6b7280" />
        <input
          className="auth-input"
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div className="auth-input-row">
        <Lock size={20} color="#6b7280" />
        <input
          className="auth-input"
          type="password"
          placeholder="Confirm New Password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
        />
      </div>
      <button className="auth-btn" onClick={handleResetPassword} disabled={isLoading}>
        {isLoading ? <span className="auth-spinner" /> : "Reset Password"}
      </button>
      <div className="auth-resend-row">
        <span className="auth-resend-text">Didn't receive a code? </span>
        <button className="auth-resend-link" onClick={handleResendOtp} disabled={isLoading}>
          Resend
        </button>
      </div>
    </>
  );

  // ── Login / Register ───────────────────────────────────────────────────────
  const renderLoginRegister = () => (
    <>
      <h2 className="auth-form-title">
        {mode === "register" ? "Create Account" : "Welcome Back"}
      </h2>
      {displayError && <div className="auth-error-box">{displayError}</div>}
      {mode === "register" && (
        <div className="auth-input-row">
          <UserIcon size={20} color="#6b7280" />
          <input
            className="auth-input"
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
      )}
      <div className="auth-input-row">
        <Mail size={20} color="#6b7280" />
        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <div className="auth-input-row">
        <Lock size={20} color="#6b7280" />
        <input
          className="auth-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
      </div>
      {mode === "register" && (
        <div className="auth-input-row">
          <Lock size={20} color="#6b7280" />
          <input
            className="auth-input"
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
      )}
      {mode === "login" && (
        <div className="auth-forgot-row">
          <button className="auth-forgot-link" onClick={() => { clearErr(); setMode("forgot"); }}>
            Forgot password?
          </button>
        </div>
      )}
      <button
        className="auth-btn"
        onClick={mode === "register" ? handleRegister : handleLogin}
        disabled={isLoading}
        onKeyDown={(e) => e.key === "Enter" && (mode === "register" ? handleRegister() : handleLogin())}
      >
        {isLoading
          ? <span className="auth-spinner" />
          : mode === "register" ? "Sign Up" : "Sign In"
        }
      </button>
      <button
        className="auth-toggle-btn"
        onClick={() => { clearErr(); setMode(mode === "register" ? "login" : "register"); }}
      >
        {mode === "register"
          ? "Already have an account? Sign In"
          : "Don't have an account? Sign Up"}
      </button>
    </>
  );

  return (
    <div className="auth-root">
      <div className="auth-inner">
        {/* Hero header */}
        <div className="auth-header">
          <MapPin size={56} color="#2563eb" />
          <h1 className="auth-app-title">CNS</h1>
          <p className="auth-app-subtitle">Community powered delivery guides</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          {mode === "forgot" && renderForgot()}
          {mode === "otp"    && renderOtp()}
          {(mode === "login" || mode === "register") && renderLoginRegister()}
        </div>
      </div>
    </div>
  );
}