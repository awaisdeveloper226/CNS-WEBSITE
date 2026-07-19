import { useState, useEffect } from "react";
import { MapPin, Mail, Lock, User as UserIcon, ArrowLeft } from "lucide-react";
import { useAuthContext } from "../../context/AuthContext";
import { API_ENDPOINTS } from "../../constants/network";
import "./AuthScreen.css";

export default function AuthScreen() {
  const {
    login, forgotPassword, resetPassword, startCheckout,
    isLoading, error, mode, setMode, otpSent, otpContext, resetEmail,
  } = useAuthContext();

  // Login fields
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");

  // Company signup fields
  const [companyName, setCompanyName]   = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [driverCount, setDriverCount]   = useState("");

  // OTP / reset fields
  const [otp, setOtp]                               = useState("");
  const [newPassword, setNewPassword]               = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [localError, setLocalError]                 = useState("");

  // Live per-driver price
  const [unitPrice, setUnitPrice]     = useState(null);
  const [currency, setCurrency]       = useState("usd");
  const [priceLoading, setPriceLoading] = useState(true);

  useEffect(() => {
    const loadPrice = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.PAYMENT_PRICE_INFO);
        const data = await res.json();
        if (res.ok && typeof data.unitAmountDecimal === "number") {
          setUnitPrice(data.unitAmountDecimal);
          if (typeof data.currency === "string") {
            setCurrency(data.currency);
          }
        }
      } catch {
        // silent — falls back to generic copy below
      } finally {
        setPriceLoading(false);
      }
    };
    loadPrice();
  }, []);

  // Formats a number using the currency Stripe actually returns, instead of
  // hardcoding "$" — so this stays correct if the Stripe price is ever
  // switched to AUD, EUR, etc.
  const formatMoney = (amount) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
    }
  };

  const parsedDriverCount = parseInt(driverCount, 10);
  const estimatedMonthlyCost =
    unitPrice !== null && !isNaN(parsedDriverCount) && parsedDriverCount > 0
      ? parsedDriverCount * unitPrice
      : 0;

  const showErr = (msg) => setLocalError(msg);
  const clearErr = () => setLocalError("");

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    clearErr();
    if (!email || !password) return showErr("Email and password are required.");
    const err = await login({ email, password });
    if (err) showErr(err);
  };

  const handleSubscribe = async () => {
    clearErr();
    if (!companyName || !companyEmail || !driverCount) return showErr("All fields are required.");
    const count = parseInt(driverCount, 10);
    if (isNaN(count) || count <= 0) return showErr("Please enter a valid number of drivers.");
    const err = await startCheckout({ companyName, companyEmail, driverCount: count });
    if (err) {
      // Surface this as a browser alert (mirrors mobile's Alert.alert
      // "Checkout Failed") so an "account already exists" response from the
      // backend isn't missed as a small inline error box.
      window.alert(err);
      showErr(err);
    }
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
      <h2 className="auth-form-title">Forgot Password?</h2>
      <p className="auth-sub-text">
        No worries — enter your email and we'll send you a 6-digit code to get you back in.
      </p>
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

  // ── OTP (also reused as "set your password" after payment) ─────────────────
  const renderOtp = () => (
    <>
      <button
        className="auth-back-btn"
        onClick={() => { clearErr(); setMode(otpContext === "welcome" ? "login" : "forgot"); }}
      >
        <ArrowLeft size={18} color="#2563eb" />
        <span>Back</span>
      </button>
      <h2 className="auth-form-title">
        {otpContext === "welcome" ? "Almost There!" : "Enter Reset Code"}
      </h2>
      {otpSent && (
        <div className="auth-success-box">
          <p className="auth-success-text">
            ✉️ Code sent to <strong>{resetEmail}</strong>
          </p>
          <p className="auth-success-sub">Check your inbox and spam folder</p>
        </div>
      )}
      <p className="auth-sub-text">
        {otpContext === "welcome"
          ? "You're in! Enter the code we just emailed you and set a password to start navigating smarter deliveries today."
          : "Enter the 6-digit code below and choose a new password."}
      </p>
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
        {isLoading ? <span className="auth-spinner" /> : (otpContext === "welcome" ? "Set Password & Continue" : "Reset Password")}
      </button>
      <div className="auth-resend-row">
        <span className="auth-resend-text">Didn't receive a code? </span>
        <button className="auth-resend-link" onClick={handleResendOtp} disabled={isLoading}>
          Resend
        </button>
      </div>
    </>
  );

  // ── Login / Company Signup ──────────────────────────────────────────────────
  const renderLoginRegister = () => (
    <>
      <h2 className="auth-form-title">
        {mode === "register" ? "Get Your Fleet Moving" : "Welcome Back"}
      </h2>
      {displayError && <div className="auth-error-box">{displayError}</div>}

      {mode === "register" ? (
        <>
          <p className="auth-sub-text">
            {priceLoading
              ? "Loading pricing..."
              : unitPrice !== null
              ? `Just ${formatMoney(unitPrice)} per driver, per month. Cancel anytime — no contracts, no hidden fees.`
              : "Simple per-driver pricing. Cancel anytime — no contracts, no hassle."}
          </p>
          <div className="auth-input-row">
            <UserIcon size={20} color="#6b7280" />
            <input
              className="auth-input"
              type="text"
              placeholder="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="auth-input-row">
            <Mail size={20} color="#6b7280" />
            <input
              className="auth-input"
              type="email"
              placeholder="Company Email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="auth-input-row">
            <UserIcon size={20} color="#6b7280" />
            <input
              className="auth-input"
              type="number"
              min="1"
              placeholder="Number of Drivers"
              value={driverCount}
              onChange={(e) => setDriverCount(e.target.value)}
            />
          </div>
          {estimatedMonthlyCost > 0 && (
            <div className="auth-price-box">
              {parsedDriverCount} driver{parsedDriverCount === 1 ? "" : "s"} × {formatMoney(unitPrice)} ={" "}
              <strong>{formatMoney(estimatedMonthlyCost)}/mo</strong>
            </div>
          )}
        </>
      ) : (
        <>
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
              autoComplete="current-password"
            />
          </div>
          <div className="auth-forgot-row">
            <button className="auth-forgot-link" onClick={() => { clearErr(); setMode("forgot"); }}>
              Forgot password?
            </button>
          </div>
        </>
      )}

      <button
        className="auth-btn"
        onClick={mode === "register" ? handleSubscribe : handleLogin}
        disabled={isLoading}
        onKeyDown={(e) => e.key === "Enter" && (mode === "register" ? handleSubscribe() : handleLogin())}
      >
        {isLoading
          ? <span className="auth-spinner" />
          : mode === "register"
            ? (estimatedMonthlyCost > 0 ? `Get Started – ${formatMoney(estimatedMonthlyCost)}/mo` : "Get Started")
            : "Sign In"
        }
      </button>
      <button
        className="auth-toggle-btn"
        onClick={() => { clearErr(); setMode(mode === "register" ? "login" : "register"); }}
      >
        {mode === "register"
          ? "Already on board? Sign In"
          : "New company? Get your drivers set up in minutes"}
      </button>
    </>
  );

  return (
    <div className="auth-root">
      <div className="auth-inner">
        <div className="auth-header">
          <MapPin size={56} color="#2563eb" />
          <h1 className="auth-app-title">CNS</h1>
          <p className="auth-app-subtitle">Smarter deliveries, powered by drivers like you</p>
        </div>

        <div className="auth-card">
          {mode === "forgot" && renderForgot()}
          {mode === "otp"    && renderOtp()}
          {(mode === "login" || mode === "register") && renderLoginRegister()}
        </div>
      </div>
    </div>
  );
}