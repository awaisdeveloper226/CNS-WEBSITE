// src/hooks/useAuth.js
import { useState, useEffect } from "react";
import { API_ENDPOINTS, AUTH_TOKEN_KEY } from "../constants/network";

const useAuth = () => {
  const [authState, setAuthState] = useState({
    user: null,
    token: null,
    isLoading: true,
    error: null,
    mode: "login",
    otpSent: false,
    resetEmail: "",
  });

  const setMode = (mode) =>
    setAuthState((prev) => ({ ...prev, mode, error: null }));

  // ── Helper ────────────────────────────────────────────────────────────────
  const fetchUserWithToken = async (token) => {
    try {
      const res = await fetch(API_ENDPOINTS.AUTH_ME, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const responseText = await res.text();
      if (res.ok) return JSON.parse(responseText);
      return null;
    } catch {
      return null;
    }
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          const userData = await fetchUserWithToken(token);
          if (userData) {
            setAuthState((prev) => ({ ...prev, user: userData, token, isLoading: false }));
          } else {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            setAuthState((prev) => ({ ...prev, isLoading: false }));
          }
        } else {
          setAuthState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    };
    loadToken();
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (credentials) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const responseText = await res.text();
      let data;
      try { data = JSON.parse(responseText); } catch { data = { message: "Server error" }; }
      if (!res.ok) {
        const msg = data.message || "Login failed";
        setAuthState((prev) => ({ ...prev, isLoading: false, error: msg }));
        return msg;
      }
      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      const userData = await fetchUserWithToken(data.token);
      if (!userData) {
        const msg = "Failed to fetch user data";
        setAuthState((prev) => ({ ...prev, isLoading: false, error: msg }));
        return msg;
      }
      setAuthState((prev) => ({ ...prev, user: userData, token: data.token, isLoading: false, error: null }));
      return null;
    } catch (err) {
      setAuthState((prev) => ({ ...prev, isLoading: false, error: err.message }));
      return err.message;
    }
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const register = async (data) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch(API_ENDPOINTS.AUTH_REGISTER, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const responseText = await res.text();
      let result;
      try { result = JSON.parse(responseText); } catch { result = { message: "Server error" }; }
      if (!res.ok) {
        const msg = result.message || "Registration failed";
        setAuthState((prev) => ({ ...prev, isLoading: false, error: msg }));
        return msg;
      }
      localStorage.setItem(AUTH_TOKEN_KEY, result.token);
      const userData = await fetchUserWithToken(result.token);
      if (!userData) {
        const msg = "Failed to fetch user data";
        setAuthState((prev) => ({ ...prev, isLoading: false, error: msg }));
        return msg;
      }
      setAuthState((prev) => ({ ...prev, user: userData, token: result.token, isLoading: false, error: null }));
      return null;
    } catch (err) {
      setAuthState((prev) => ({ ...prev, isLoading: false, error: err.message }));
      return err.message;
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthState({
      user: null, token: null, isLoading: false,
      error: null, mode: "login", otpSent: false, resetEmail: "",
    });
  };

  // ── Forgot password ───────────────────────────────────────────────────────
  const forgotPassword = async (email) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch(API_ENDPOINTS.AUTH_FORGOT_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || "Failed to send code";
        setAuthState((prev) => ({ ...prev, isLoading: false, error: msg }));
        return msg;
      }
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
        mode: "otp",
        otpSent: true,
        resetEmail: email,
      }));
      return null;
    } catch (err) {
      setAuthState((prev) => ({ ...prev, isLoading: false, error: err.message }));
      return err.message;
    }
  };

  // ── Reset password ────────────────────────────────────────────────────────
  const resetPassword = async (otp, newPassword) => {
    const email = authState.resetEmail;
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch(API_ENDPOINTS.AUTH_RESET_PASSWORD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || "Reset failed";
        setAuthState((prev) => ({ ...prev, isLoading: false, error: msg }));
        return msg;
      }
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
        mode: "login",
        otpSent: false,
        resetEmail: "",
      }));
      return null;
    } catch (err) {
      setAuthState((prev) => ({ ...prev, isLoading: false, error: err.message }));
      return err.message;
    }
  };

  return {
    user: authState.user,
    token: authState.token,
    isLoading: authState.isLoading,
    error: authState.error,
    mode: authState.mode,
    otpSent: authState.otpSent,
    resetEmail: authState.resetEmail,
    setMode,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
  };
};

export default useAuth;