import {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import { AlertCircle, ChevronRight, Search, X, Zap } from "lucide-react";
import { API_ENDPOINTS } from "../../constants/network";
import "./SearchScreen.css";

// ── Key helper ────────────────────────────────────────────────────────────────
const bizKey = (b) => String(b.placeId ?? b._id ?? b.id ?? "");

// ══════════════════════════════════════════════════════════════════════════════
// ALGORITHM 1 — DAMERAU-LEVENSHTEIN
// ══════════════════════════════════════════════════════════════════════════════
function damerauLevenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const maxDist = m + n;
  const d = Array.from({ length: m + 2 }, () => new Array(n + 2).fill(0));
  d[0][0] = maxDist;
  for (let i = 0; i <= m; i++) { d[i + 1][0] = maxDist; d[i + 1][1] = i; }
  for (let j = 0; j <= n; j++) { d[0][j + 1] = maxDist; d[1][j + 1] = j; }
  const charMap = {};
  for (let i = 1; i <= m; i++) {
    let db = 0;
    for (let j = 1; j <= n; j++) {
      const i1 = charMap[b[j - 1]] ?? 0, j1 = db;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      if (cost === 0) db = j;
      d[i + 1][j + 1] = Math.min(
        d[i][j] + cost, d[i + 1][j] + 1, d[i][j + 1] + 1,
        d[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1),
      );
    }
    charMap[a[i - 1]] = i;
  }
  return d[m + 1][n + 1];
}
const dlSim = (a, b) => {
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - damerauLevenshtein(a, b) / maxLen;
};

// ══════════════════════════════════════════════════════════════════════════════
// ALGORITHM 2 — SMITH-WATERMAN
// ══════════════════════════════════════════════════════════════════════════════
function smithWaterman(a, b) {
  const MATCH = 2, MISMATCH = -1, GAP = -1;
  const m = a.length, n = b.length;
  if (m === 0 || n === 0) return 0;
  let maxScore = 0;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) {
      const diag = dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? MATCH : MISMATCH);
      dp[i][j] = Math.max(0, diag, dp[i - 1][j] + GAP, dp[i][j - 1] + GAP);
      if (dp[i][j] > maxScore) maxScore = dp[i][j];
    }
  const perfect = Math.min(m, n) * MATCH;
  return perfect > 0 ? Math.min(maxScore / perfect, 1) : 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// ALGORITHM 3 — JARO-WINKLER
// ══════════════════════════════════════════════════════════════════════════════
function jaroWinkler(s1, s2) {
  if (s1 === s2) return 1;
  const l1 = s1.length, l2 = s2.length;
  if (l1 === 0 || l2 === 0) return 0;
  const matchDist = Math.max(Math.floor(Math.max(l1, l2) / 2) - 1, 0);
  const s1m = new Array(l1).fill(false), s2m = new Array(l2).fill(false);
  let matches = 0, transpositions = 0;
  for (let i = 0; i < l1; i++) {
    const lo = Math.max(0, i - matchDist), hi = Math.min(i + matchDist + 1, l2);
    for (let j = lo; j < hi; j++) {
      if (s2m[j] || s1[i] !== s2[j]) continue;
      s1m[i] = true; s2m[j] = true; matches++; break;
    }
  }
  if (!matches) return 0;
  let k = 0;
  for (let i = 0; i < l1; i++) {
    if (!s1m[i]) continue;
    while (!s2m[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  const jaro = (matches / l1 + matches / l2 + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, l1, l2); i++) {
    if (s1[i] === s2[i]) prefix++; else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

// ══════════════════════════════════════════════════════════════════════════════
// ALGORITHM 4 — DOUBLE METAPHONE (abbreviated for space)
// ══════════════════════════════════════════════════════════════════════════════
function doubleMetaphone(word) {
  const input = word.toUpperCase().replace(/[^A-Z]/g, "");
  if (!input) return ["", ""];
  let pri = "", sec = "", i = 0;
  const at = (pos, ...chars) => chars.some((c) => input.slice(pos, pos + c.length) === c);
  const isVowel = (pos) => "AEIOU".includes(input[pos] ?? "");
  const add = (p, s = p) => { pri += p; sec += s; };
  if (at(0, "AE", "GN", "KN", "PN", "WR")) i = 1;
  if (input[0] === "I" || input[0] === "E") add("A");
  while (i < input.length) {
    if ("AEIOUHWY".includes(input[i])) { if (i === 0) add("A"); i++; continue; }
    switch (input[i]) {
      case "B": add("P"); i += input[i - 1] === "M" ? 2 : 1; break;
      case "C":
        if (at(i, "CIA")) { add("X"); i += 3; break; }
        if (at(i, "CH")) { i === 0 && isVowel(2) ? add("K", "X") : add("X"); i += 2; break; }
        if (at(i + 1, "I", "E", "Y")) { add("S"); i += 2; break; }
        add("K"); i += at(i, "CK") ? 2 : 1; break;
      case "D":
        if (at(i, "DG", "DJ")) { add("J"); i += 2; break; }
        add("T"); i += at(i, "DT", "DD") ? 2 : 1; break;
      case "F": add("F"); i += at(i, "FF") ? 2 : 1; break;
      case "G":
        if (at(i, "GH")) { if (i === 0 && isVowel(2)) add("K"); i += 2; break; }
        if (at(i + 1, "E", "I", "Y") && !at(i - 1, "G")) { add("J", "K"); i += 2; break; }
        add("K"); i += at(i, "GG") ? 2 : 1; break;
      case "H": if ((i === 0 || isVowel(i - 1)) && isVowel(i + 1)) add("H"); i++; break;
      case "K": add("K"); i += at(i, "KK") ? 2 : 1; break;
      case "L": add("L"); i += at(i, "LL") ? 2 : 1; break;
      case "M": add("M"); i += at(i, "MM") ? 2 : 1; break;
      case "N": add("N"); i += at(i, "NN") ? 2 : 1; break;
      case "P": if (at(i, "PH")) { add("F"); i += 2; break; } add("P"); i += at(i, "PP") ? 2 : 1; break;
      case "R": add("R"); i += at(i, "RR") ? 2 : 1; break;
      case "S":
        if (at(i, "SH") || at(i, "SIO") || at(i, "SIA")) { add("X"); i += 2; break; }
        if (at(i, "SCH")) { add("SK"); i += 3; break; }
        add("S"); i += at(i, "SS") ? 2 : 1; break;
      case "T":
        if (at(i, "TIA") || at(i, "TCH")) { add("X"); i += 3; break; }
        if (at(i, "TH")) { add("0"); i += 2; break; }
        add("T"); i += at(i, "TT", "TD") ? 2 : 1; break;
      case "V": add("F"); i += at(i, "VV") ? 2 : 1; break;
      case "X": add("S"); i++; break;
      case "Z": if (at(i, "ZH")) { add("J"); i += 2; break; } add("S"); i += at(i, "ZZ") ? 2 : 1; break;
      default: i++; break;
    }
  }
  return [pri.slice(0, 6), sec.slice(0, 6)];
}
function doubleMetaphoneMatch(a, b) {
  if (!a || !b) return false;
  const [ap, as_] = doubleMetaphone(a), [bp, bs] = doubleMetaphone(b);
  return !!((ap && bp && ap === bp) || (ap && bs && ap === bs) || (as_ && bp && as_ === bp) || (as_ && bs && as_ === bs));
}

// ══════════════════════════════════════════════════════════════════════════════
// ALGORITHM 5 — N-GRAM
// ══════════════════════════════════════════════════════════════════════════════
function getNgrams(s, n) {
  const grams = new Set();
  const padded = "_".repeat(n - 1) + s + "_".repeat(n - 1);
  for (let i = 0; i <= padded.length - n; i++) grams.add(padded.slice(i, i + n));
  return grams;
}
function ngramSim(a, b, n) {
  if (!a || !b) return 0;
  const ga = getNgrams(a, n), gb = getNgrams(b, n);
  let inter = 0;
  ga.forEach((g) => { if (gb.has(g)) inter++; });
  return (2 * inter) / (ga.size + gb.size);
}

// ══════════════════════════════════════════════════════════════════════════════
// ALGORITHM 6 — BM25
// ══════════════════════════════════════════════════════════════════════════════
const BM25_K1 = 1.5, BM25_B = 0.75, AVG_FIELD_LEN = 3;
function bm25Score(queryTokens, fieldTokens) {
  const tf = {};
  for (const t of fieldTokens) tf[t] = (tf[t] ?? 0) + 1;
  const fieldLen = fieldTokens.length;
  let score = 0;
  for (const qt of queryTokens) {
    const freq = tf[qt] ?? 0;
    if (freq === 0) continue;
    const idf = Math.log(1.5 / (freq + 0.5) + 1);
    const tfNorm = (freq * (BM25_K1 + 1)) / (freq + BM25_K1 * (1 - BM25_B + (BM25_B * fieldLen) / AVG_FIELD_LEN));
    score += idf * tfNorm;
  }
  return score;
}

// ══════════════════════════════════════════════════════════════════════════════
// ALGORITHM 7 — KEYBOARD PROXIMITY
// ══════════════════════════════════════════════════════════════════════════════
const KB = { q:"wa",w:"qeasd",e:"wrsd",r:"etdf",t:"ryfg",y:"tugh",u:"yihj",i:"uojk",o:"ipkl",p:"ol",a:"qwszx",s:"wedxzac",d:"erfcxsv",f:"rtgvcd",g:"tyhbvf",h:"yujnbg",j:"uikmnh",k:"iolmj",l:"opk",z:"asx",x:"zsdc",c:"xdfv",v:"cfgb",b:"vghn",n:"bhjm",m:"njk" };
function keyboardSim(a, b) {
  if (a.length !== b.length) return 0;
  let m = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) { m++; continue; }
    if ((KB[a[i]] ?? "").includes(b[i])) m += 0.7;
  }
  return m / a.length;
}

// ══════════════════════════════════════════════════════════════════════════════
// ALGORITHM 8 — ACRONYM
// ══════════════════════════════════════════════════════════════════════════════
const STOP_WORDS = new Set(["the","a","an","and","or","of","in","on","at","to","for","is","are","was","were","be","been","by","with","as","that","this","it","its","inc","llc","ltd","co","corp","group","&"]);
function acronymMatch(query, fieldText) {
  const q = query.toLowerCase().replace(/[^a-z]/g, "");
  if (q.length < 2) return false;
  const acronym = fieldText.split(/\s+/).filter((w) => !STOP_WORDS.has(w.toLowerCase())).map((w) => w[0]?.toLowerCase() ?? "").join("");
  return acronym.length >= q.length && acronym.startsWith(q);
}

// ── Tokeniser ─────────────────────────────────────────────────────────────────
const tokenise = (s) => s.toLowerCase().split(/[\s,\-\/\.\(\)&'"]+/).filter((w) => w.length > 0);
const tokenWeight = (t) => { if (STOP_WORDS.has(t)) return 0.12; if (t.length <= 2) return 0.35; if (t.length <= 4) return 0.75; return 1.0; };

// ── Jumbled word match ────────────────────────────────────────────────────────
const sortedChars = (s) => s.split("").sort().join("");
function jumbledMatch(query, fieldText) {
  const qTokens = tokenise(query), fTokens = tokenise(fieldText);
  let score = 0;
  for (const qt of qTokens) {
    if (qt.length < 4) continue;
    const qSorted = sortedChars(qt);
    for (const ft of fTokens) {
      if (Math.abs(qt.length - ft.length) > 2) continue;
      const fSorted = sortedChars(ft);
      if (qSorted === fSorted) { score = Math.max(score, 520); continue; }
      if (damerauLevenshtein(qSorted, fSorted) <= 2) score = Math.max(score, 380);
    }
  }
  return score;
}

// ── Multi-word reorder ────────────────────────────────────────────────────────
function multiWordReorderScore(query, fieldText) {
  const qWords = tokenise(query).filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  if (qWords.length < 2) return 0;
  const fl = fieldText.toLowerCase();
  const allPresent = qWords.every((w) => tokenise(fl).some((ft) => ft === w || ft.startsWith(w) || jaroWinkler(w, ft) > 0.88));
  return allPresent ? 480 : 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// MASTER SCORING ENGINE
// ══════════════════════════════════════════════════════════════════════════════
function scoreMatch(business, rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return { total: -1, matchType: "weak" };
  const fields = [{ text: business.name, weight: 5.0 }, { text: business.address, weight: 1.0 }];
  const queryTokens = tokenise(query);
  let totalScore = 0;
  for (const { text, weight } of fields) {
    if (!text) continue;
    const fl = text.toLowerCase(), fieldTokens = tokenise(fl);
    let fieldScore = 0;
    if (fl === query) fieldScore = 1000;
    else if (fl.startsWith(query)) fieldScore = Math.max(fieldScore, 900);
    else if (fl.includes(query)) fieldScore = Math.max(fieldScore, 900 - fl.indexOf(query));
    if (fieldTokens.some((ft) => ft === query)) fieldScore = Math.max(fieldScore, 880);
    if (queryTokens.some((qt) => fieldTokens.includes(qt))) fieldScore = Math.max(fieldScore, 820);
    if (acronymMatch(query, text)) fieldScore = Math.max(fieldScore, 660);
    fieldScore = Math.max(fieldScore, jumbledMatch(query, text));
    fieldScore = Math.max(fieldScore, multiWordReorderScore(query, text));
    const jwF = jaroWinkler(query, fl);
    if (jwF > 0.95) fieldScore = Math.max(fieldScore, jwF * 660);
    else if (jwF > 0.88) fieldScore = Math.max(fieldScore, jwF * 500);
    else if (jwF > 0.8) fieldScore = Math.max(fieldScore, jwF * 340);
    const swF = smithWaterman(query, fl);
    if (swF > 0.9) fieldScore = Math.max(fieldScore, swF * 620);
    else if (swF > 0.7) fieldScore = Math.max(fieldScore, swF * 440);
    else if (swF > 0.5) fieldScore = Math.max(fieldScore, swF * 280);
    const biF = ngramSim(query, fl, 2), trF = ngramSim(query, fl, 3);
    if (biF > 0.78) fieldScore = Math.max(fieldScore, biF * 460);
    else if (biF > 0.58) fieldScore = Math.max(fieldScore, biF * 290);
    if (trF > 0.72) fieldScore = Math.max(fieldScore, trF * 400);
    const bm = bm25Score(queryTokens, fieldTokens);
    if (bm > 0) fieldScore = Math.max(fieldScore, Math.min(bm * 220, 540));
    let tokenScore = 0, tokenWeightSum = 0, matchedCount = 0;
    for (const qt of queryTokens) {
      const qw = tokenWeight(qt); tokenWeightSum += qw; let best = 0;
      for (const ft of fieldTokens) {
        let s = 0;
        if (ft === qt) s = 500;
        else if (ft.startsWith(qt)) s = Math.max(s, 460 * (qt.length / ft.length));
        else if (qt.startsWith(ft) && ft.length > 2) s = Math.max(s, 430 * (ft.length / qt.length));
        else if (ft.includes(qt)) s = Math.max(s, 360);
        else if (qt.includes(ft) && ft.length > 2) s = Math.max(s, 330);
        else {
          const jw = jaroWinkler(qt, ft);
          if (jw > 0.96) s = Math.max(s, jw * 480); else if (jw > 0.9) s = Math.max(s, jw * 380); else if (jw > 0.83) s = Math.max(s, jw * 260);
          const dl = damerauLevenshtein(qt, ft), dls = dlSim(qt, ft);
          if (dl === 1) s = Math.max(s, dls * 440); else if (dl === 2 && qt.length > 4) s = Math.max(s, dls * 300); else if (dl === 3 && qt.length > 6) s = Math.max(s, dls * 180);
          const sw = smithWaterman(qt, ft);
          if (sw > 0.85) s = Math.max(s, sw * 380); else if (sw > 0.65) s = Math.max(s, sw * 250);
          const bi = ngramSim(qt, ft, 2);
          if (bi > 0.85) s = Math.max(s, bi * 350); else if (bi > 0.65) s = Math.max(s, bi * 220);
          if (qt.length > 4 && ft.length > 4) { const tr = ngramSim(qt, ft, 3); if (tr > 0.7) s = Math.max(s, tr * 290); }
          if (qt.length === ft.length) { const kb = keyboardSim(qt, ft); if (kb > 0.85) s = Math.max(s, kb * 310); else if (kb > 0.7) s = Math.max(s, kb * 200); }
          if (qt.length > 2 && doubleMetaphoneMatch(qt, ft)) s = Math.max(s, 260);
        }
        best = Math.max(best, s);
      }
      tokenScore += best * qw; if (best > 80) matchedCount++;
    }
    if (tokenWeightSum > 0) {
      const avg = tokenScore / tokenWeightSum, coverage = matchedCount / queryTokens.length;
      const bonus = coverage >= 1.0 ? 1.35 : 0.55 + coverage * 0.7;
      fieldScore = Math.max(fieldScore, avg * bonus);
    }
    totalScore += fieldScore * weight;
  }
  const maxPossible = fields.reduce((acc, f) => acc + f.weight * 1000, 0);
  const normalised = (totalScore / maxPossible) * 1000;
  let matchType;
  if (normalised >= 760) matchType = "exact";
  else if (normalised >= 500) matchType = "strong";
  else if (normalised >= 230) matchType = "close";
  else if (normalised >= 70) matchType = "possible";
  else matchType = "weak";
  return { total: normalised >= 20 ? normalised : -1, matchType };
}

// ── Recent searches (localStorage) ───────────────────────────────────────────
const HISTORY_CACHE_KEY = "cns_recent_searches";
const MAX_HISTORY = 5;
const loadCachedHistory = () => { try { const r = localStorage.getItem(HISTORY_CACHE_KEY); if (!r) return []; const p = JSON.parse(r); return Array.isArray(p) ? p.slice(0, MAX_HISTORY) : []; } catch { return []; } };
const saveCachedHistory = (h) => { try { localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(h.slice(0, MAX_HISTORY))); } catch {} };
const mergeHistory = (prev, q) => [q, ...prev.filter((h) => h.toLowerCase() !== q.toLowerCase())].slice(0, MAX_HISTORY);

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [deb, setDeb] = useState(value);
  useEffect(() => { const h = setTimeout(() => setDeb(value), delay); return () => clearTimeout(h); }, [value, delay]);
  return deb;
}

const MIN_OSM_QUERY_LENGTH = 2;

// ── Score + sort helper ───────────────────────────────────────────────────────
function scoreAndSort(items, query, fromFoursquare) {
  return items.map((b) => {
    const { total, matchType } = scoreMatch(b, query);
    return { ...b, _score: fromFoursquare ? Math.max(total, 1) : total, _matchType: fromFoursquare && total < 70 ? "possible" : matchType, _fromFoursquare: fromFoursquare, _distanceKm: b._distanceKm ?? null };
  }).filter((b) => b._score >= 0).sort((a, b) => b._score - a._score);
}

// ── DB fetcher ────────────────────────────────────────────────────────────────
async function fetchFromDB(rawQuery, signal) {
  const tokens = tokenise(rawQuery).filter((t) => t.length > 1 && !STOP_WORDS.has(t)).sort((a, b) => b.length - a.length);
  const primaryToken = tokens[0] ?? rawQuery.trim();
  const queries = [...new Set([rawQuery.trim(), primaryToken])].filter(Boolean);
  const seen = new Set(), merged = [];
  const add = (items) => { for (const b of items) { const k = String(b._id ?? b.id ?? ""); if (k && !seen.has(k)) { seen.add(k); merged.push(b); } } };
  const results = await Promise.all(queries.map((q) =>
    fetch(`${API_ENDPOINTS.BUSINESSES}?search=${encodeURIComponent(q)}&limit=200`, { signal })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (Array.isArray(data)) return data; if (data && typeof data === "object") { if (Array.isArray(data.data)) return data.data; if (Array.isArray(data.businesses)) return data.businesses; if (Array.isArray(data.results)) return data.results; } return []; })
      .catch(() => [])
  ));
  for (const batch of results) add(batch);
  return merged;
}

// ── OSM fetcher ───────────────────────────────────────────────────────────────
async function fetchFromOSM(query, signal, coords) {
  try {
    let url = `${API_ENDPOINTS.PLACES_SEARCH}?q=${encodeURIComponent(query)}`;
    if (coords) url += `&lat=${coords.latitude}&lng=${coords.longitude}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function SearchScreen({ onBusinessSelect, onBack }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults]         = useState([]);
  const [loadingDB, setLoadingDB]     = useState(false);
  const [loadingOSM, setLoadingOSM]   = useState(false);
  const [error, setError]             = useState(null);
  const [history, setHistory]         = useState(() => loadCachedHistory());
  const [locationStatus, setLocationStatus] = useState("checking");
  const [userCoords, setUserCoords]   = useState(null);

  const abortRef      = useRef(null);
  const searchIdRef   = useRef(0);
  const userCoordsRef = useRef(null);
  const searchStateRef = useRef(new Map());
  const onBusinessSelectRef = useRef(onBusinessSelect);
  useEffect(() => { onBusinessSelectRef.current = onBusinessSelect; }, [onBusinessSelect]);

  // ── Load server history ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("courierNavigatorToken");
        if (!token) return;
        const res = await fetch(API_ENDPOINTS.SEARCH_HISTORY_GET, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        const serverHistory = Array.isArray(data?.history) ? data.history : [];
        if (!cancelled && serverHistory.length > 0) {
          setHistory(serverHistory.slice(0, MAX_HISTORY));
          saveCachedHistory(serverHistory);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Location (browser Geolocation API) ───────────────────────────────────
  const requestLocationAccess = useCallback(() => {
    setLocationStatus("checking");
    if (!navigator.geolocation) { setLocationStatus("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setUserCoords(coords);
        userCoordsRef.current = coords;
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

  useEffect(() => { requestLocationAccess(); }, [requestLocationAccess]);
  useEffect(() => { userCoordsRef.current = userCoords; }, [userCoords]);

  // ── Commit merged results ─────────────────────────────────────────────────
  const commitResults = useCallback((id) => {
    if (searchIdRef.current !== id) return;
    const entry = searchStateRef.current.get(id);
    if (!entry) return;
    const dbItems = entry.db ?? [], osmItems = entry.osm ?? [];
    if (osmItems.length === 0) { setResults(dbItems); return; }
    const dbPlaceIds = new Set(dbItems.map((b) => b.placeId).filter(Boolean));
    const dedupedOSM = osmItems.filter((r) => !r.placeId || !dbPlaceIds.has(r.placeId));
    setResults([...dbItems, ...dedupedOSM].sort((a, b) => b._score - a._score));
  }, []);

  // ── Core search ───────────────────────────────────────────────────────────
  const doSearch = useCallback((query) => {
    const trimmed = query.trim();
    if (locationStatus !== "granted") { setResults([]); setLoadingDB(false); setLoadingOSM(false); return; }
    if (!trimmed) { setResults([]); setLoadingDB(false); setLoadingOSM(false); setError(null); return; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;
    const myId = ++searchIdRef.current;
    searchStateRef.current.clear();
    searchStateRef.current.set(myId, { db: null, osm: null, osmSkipped: false });
    setLoadingDB(true); setLoadingOSM(trimmed.length >= MIN_OSM_QUERY_LENGTH); setError(null);
    fetchFromDB(trimmed, signal).then((dbRaw) => {
      if (searchIdRef.current !== myId) return;
      const scored = scoreAndSort(dbRaw, trimmed, false);
      const entry = searchStateRef.current.get(myId);
      if (!entry) return;
      entry.db = scored; setLoadingDB(false); commitResults(myId);
    }).catch((e) => { if (e?.name === "AbortError" || searchIdRef.current !== myId) return; setLoadingDB(false); setError("Search failed. Please check your connection."); });
    if (trimmed.length < MIN_OSM_QUERY_LENGTH) { setLoadingOSM(false); return; }
    fetchFromOSM(trimmed, signal, userCoordsRef.current).then((osmRaw) => {
      if (searchIdRef.current !== myId) return;
      const entry = searchStateRef.current.get(myId);
      if (!entry || entry.osmSkipped) { setLoadingOSM(false); return; }
      entry.osm = scoreAndSort(osmRaw, trimmed, true); setLoadingOSM(false); commitResults(myId);
    }).catch((e) => { if (e?.name === "AbortError" || searchIdRef.current !== myId) return; setLoadingOSM(false); });
  }, [commitResults, locationStatus]);

  const debouncedQ = useDebounce(searchQuery, 350);
  useEffect(() => { doSearch(debouncedQ); }, [debouncedQ, doSearch]);

  // ── Persist search ────────────────────────────────────────────────────────
  const recordSearch = useCallback((q) => {
    const trimmed = q.trim(); if (!trimmed) return;
    setHistory((prev) => { const next = mergeHistory(prev, trimmed); saveCachedHistory(next); return next; });
    (async () => {
      try {
        const token = localStorage.getItem("courierNavigatorToken");
        if (!token) return;
        const res = await fetch(API_ENDPOINTS.SEARCH_HISTORY_POST, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ query: trimmed }) });
        if (res.ok) { const data = await res.json(); if (Array.isArray(data?.history)) { setHistory(data.history.slice(0, MAX_HISTORY)); saveCachedHistory(data.history); } }
      } catch {}
    })();
  }, []);

  const handleSelectRef = useRef(null);
  const handleSelect = useCallback((b) => { recordSearch(searchQuery); onBusinessSelectRef.current(b); }, [recordSearch, searchQuery]);
  useEffect(() => { handleSelectRef.current = handleSelect; }, [handleSelect]);

  const clearSearch = useCallback(() => {
    setSearchQuery(""); setResults([]); setError(null);
    abortRef.current?.abort(); searchIdRef.current++; setLoadingDB(false); setLoadingOSM(false);
  }, []);

  const loading = loadingDB || loadingOSM;
  const showResults = searchQuery.trim().length > 0;
  const grouped = useMemo(() => ({
    best: results.filter((r) => r._matchType === "exact" || r._matchType === "strong"),
    close: results.filter((r) => r._matchType === "close"),
    possible: results.filter((r) => r._matchType === "possible" || r._matchType === "weak"),
  }), [results]);

  // ── Sub-components ────────────────────────────────────────────────────────
  const MatchPill = ({ type }) => {
    if (type === "exact" || type === "strong") return null;
    const cfg = type === "close"
      ? { label: "≈ Close match", bg: "#fef9c3", color: "#a16207", border: "#fde047" }
      : { label: "~ Possible match", bg: "#f3f4f6", color: "#6b7280", border: "#d1d5db" };
    return <span className="ss-pill" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>{cfg.label}</span>;
  };

  const SectionHeader = ({ label, count }) => (
    <div className="ss-section-row">
      <span className="ss-section-label">{label}</span>
      <span className="ss-section-badge">{count}</span>
    </div>
  );

  const ResultCard = ({ b }) => (
    <button className="ss-card" onClick={() => handleSelectRef.current(b)}>
      <div className="ss-card-icon">{(b.name ?? "?")[0].toUpperCase()}</div>
      <div className="ss-card-body">
        <div className="ss-card-title-row">
          <span className="ss-card-title">{b.name}</span>
          {(b._matchType === "exact" || b._matchType === "strong") && <Zap size={12} color="#2563eb" style={{ marginLeft: 5 }} />}
        </div>
        <span className="ss-card-address">{b.address}</span>
        <MatchPill type={b._matchType} />
      </div>
      <ChevronRight size={18} color="#9ca3af" />
    </button>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ss-root">
      <div className="ss-inner">
        <h1 className="ss-screen-title">Search</h1>

        {/* Search box */}
        <div className="ss-search-box">
          <Search size={18} color="#2563eb" />
          <input
            className="ss-input"
            placeholder="Search businesses…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            disabled={locationStatus !== "granted"}
          />
          {loading
            ? <span className="ss-spinner" />
            : searchQuery.length > 0
              ? <button className="ss-clear-btn" onClick={clearSearch} aria-label="Clear"><X size={14} color="#9ca3af" /></button>
              : null
          }
        </div>

        {/* Location gate */}
        {locationStatus !== "granted" && (
          <div className="ss-location-gate">
            {locationStatus === "checking" ? (
              <><span className="ss-spinner" /><span className="ss-location-gate-text">Checking location access…</span></>
            ) : (
              <>
                <AlertCircle size={16} color="#ef4444" />
                <span className="ss-location-gate-text">Location access is required to search businesses.</span>
                <button className="ss-location-gate-btn" onClick={requestLocationAccess}>Enable Location</button>
              </>
            )}
          </div>
        )}

        {/* Results / history */}
        <div className="ss-scroll">
          {showResults ? (
            <>
              <div className="ss-stats-bar">
                <span className="ss-stats-text">{loadingDB ? "Searching…" : `${results.length} result${results.length !== 1 ? "s" : ""}`}</span>
                {results.length > 0 && !loadingDB && <span className="ss-stats-ranked">{loadingOSM ? "Loading more…" : "Ranked by relevance"}</span>}
              </div>

              {error && (
                <div className="ss-error-box">
                  <AlertCircle size={15} color="#ef4444" />
                  <span className="ss-error-text">{error}</span>
                </div>
              )}

              {!loadingDB && results.length === 0 && !error && !loadingOSM && (
                <div className="ss-empty-box">
                  <Search size={36} color="#d1d5db" />
                  <span className="ss-empty-title">No results found</span>
                  <span className="ss-empty-sub">Try different spelling or a shorter keyword</span>
                </div>
              )}

              {grouped.best.length > 0 && <><SectionHeader label="Best Matches" count={grouped.best.length} />{grouped.best.map((b) => <ResultCard key={bizKey(b)} b={b} />)}</>}
              {grouped.close.length > 0 && <><SectionHeader label="Close Matches" count={grouped.close.length} />{grouped.close.map((b) => <ResultCard key={bizKey(b)} b={b} />)}</>}
              {grouped.possible.length > 0 && <><SectionHeader label="Possible Matches" count={grouped.possible.length} />{grouped.possible.map((b) => <ResultCard key={bizKey(b)} b={b} />)}</>}

              {loadingOSM && !loadingDB && results.length > 0 && (
                <div className="ss-osm-loading"><span className="ss-spinner" /><span className="ss-osm-loading-text">Searching more places…</span></div>
              )}
            </>
          ) : (
            locationStatus === "granted" && (
              history.length > 0 ? (
                <>
                  <p className="ss-recent-title">Recent Searches</p>
                  {history.map((q, i) => (
                    <button key={`${q}-${i}`} className="ss-recent-item" onClick={() => setSearchQuery(q)}>
                      <Search size={14} color="#9ca3af" />
                      <span className="ss-recent-text">{q}</span>
                    </button>
                  ))}
                </>
              ) : (
                <div className="ss-placeholder">
                  <div className="ss-placeholder-icon"><Search size={28} color="#93c5fd" /></div>
                  <span className="ss-placeholder-title">Find any business</span>
                </div>
              )
            )
          )}
          <div style={{ height: 48 }} />
        </div>
      </div>
    </div>
  );
}