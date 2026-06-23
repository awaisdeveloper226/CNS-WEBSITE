export const API_BASE_URL = `https://cns-backend-2c16.onrender.com/api`;

export const API_ENDPOINTS = {
  // Auth
  AUTH_REGISTER: `${API_BASE_URL}/auth/register`,
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  AUTH_ME: `${API_BASE_URL}/auth/me`,

  // Businesses & Details
  BUSINESSES: `${API_BASE_URL}/businesses`,
  BUSINESS_DETAIL: (id) => `${API_BASE_URL}/businesses/${id}`,

  // Global business search via Google Places (backend proxy)
  PLACES_SEARCH: `${API_BASE_URL}/businesses/places-search`,

  DIRECTIONS_PROXY: `${API_BASE_URL}/businesses/directions`,

  // Reverse geocoding proxy
  GEOCODE: `${API_BASE_URL}/businesses/geocode`,

  SEARCH_HISTORY_GET: `${API_BASE_URL}/users/search-history`,
  SEARCH_HISTORY_POST: `${API_BASE_URL}/users/search-history`,
  NEARBY_BUSINESSES: `${API_BASE_URL}/businesses/nearby`,

  // Community
  COMMUNITY_LEADERBOARD: `${API_BASE_URL}/community/leaderboard`,

  AUTH_FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
  AUTH_RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,

  BUSINESS_FROM_GLOBAL: `${API_BASE_URL}/businesses/from-global`,

  ENTRY_PIN: (id) => `${API_BASE_URL}/businesses/${id}/entry-pin`,

  // Instructions
  INSTRUCTION_COMMENTS: (id) => `${API_BASE_URL}/instructions/${id}/comments`,

  CONTRIBUTIONS: `${API_BASE_URL}/instructions`,
  CONTRIBUTION_DETAIL: (id) => `${API_BASE_URL}/instructions/${id}`,
  CONTRIBUTION_UPDATE: (id) => `${API_BASE_URL}/instructions/${id}`,
  CONTRIBUTION_LIKE: (id) => `${API_BASE_URL}/instructions/${id}/like`,
  CONTRIBUTION_DISLIKE: (id) => `${API_BASE_URL}/instructions/${id}/dislike`,
};

// Key used to store the auth token in localStorage
export const AUTH_TOKEN_KEY = "courierNavigatorToken";