// src/utils/deviceId.js
const DEVICE_ID_KEY = "cns_device_id";

function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Persists a UUID in localStorage so the SAME browser/device always sends
// the same id on every future login, no matter which of the shared
// account's users is signing in from it.
export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // Private browsing / localStorage blocked — still works, just won't
    // persist across sessions on this device.
    return generateUUID();
  }
}

export function getDeviceInfo() {
  return {
    deviceId: getDeviceId(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    platform:
      typeof navigator !== "undefined"
        ? navigator.platform || navigator.userAgentData?.platform || "unknown"
        : "unknown",
  };
}