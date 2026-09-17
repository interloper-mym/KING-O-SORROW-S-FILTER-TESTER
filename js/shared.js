/* ============================================================
   King of Sorrow's Filter Tester
   Inappropriate Recycling v1 — by interloper-mym
   File: js/shared.js
   Purpose: Shared utilities for every page.
   ============================================================ */

/* ---------- CORE FETCH ---------- */
/**
 * fetch() with an abort timer.
 * @param {string} url
 * @param {number} ms - timeout in milliseconds
 * @param {object} [opts] - fetch options
 * @returns {Promise<Response>}
 */
function fetchWithTimeout(url, ms, opts) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    const o = Object.assign({ signal: controller.signal, cache: "no-store" }, opts || {});
    fetch(url, o)
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(e => { clearTimeout(timer); reject(e); });
  });
}

/* ---------- SLEEP ---------- */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* ---------- STOP FLAG ---------- */
const STOP_STATE = { stopped: false };
function checkStop() {
  if (STOP_STATE.stopped) throw new Error("STOPPED_BY_USER");
}
function resetStop() {
  STOP_STATE.stopped = false;
}
function requestStop() {
  STOP_STATE.stopped = true;
}

/* ---------- HTML ESCAPE ---------- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- REPORT BUILDER ---------- */
const REPORT = {
  lines: [],
  json: {},
  el: null,

  init(reportEl, jsonSeed) {
    this.el = reportEl;
    this.lines = [];
    this.json = jsonSeed || {};
    this.render();
  },

  line(label, cls, msg) {
    const pad = String(label).padEnd(7);
    this.lines.push("  " + pad + " " + msg);
    this.render();
    if (!this.json.tests) this.json.tests = [];
    this.json.tests.push({ label, class: cls, msg });
  },

  ok(msg)   { this.line("[OK]",   "ok",   msg); },
  fail(msg) { this.line("[FAIL]", "bad",  msg); },
  warn(msg) { this.line("[WARN]", "warn", msg); },
  info(msg) { this.line("[INFO]", "info", msg); },

  header(text) {
    this.lines.push("");
    this.lines.push("=== " + text + " ===");
    this.render();
  },

  note(text) {
    this.lines.push("  [INFO]  " + text);
    this.render();
  },

  clear() {
    this.lines = [];
    this.json = {};
    this.render();
  },

  render() {
    if (!this.el) return;
    let html = "";
    for (const l of this.lines) {
      let cls = "muted";
      if (l.includes("[OK]"))        cls = "ok";
      else if (l.includes("[FAIL]")) cls = "bad";
      else if (l.includes("[WARN]")) cls = "warn";
      else if (l.includes("[INFO]")) cls = "info";
      html += '<div class="' + cls + '">' + escapeHtml(l) + "</div>";
    }
    this.el.innerHTML = html;
    this.el.scrollTop = this.el.scrollHeight;
  },

  asText() {
    return this.lines.join("\n");
  }
};

/* ---------- STATUS BAR ---------- */
function setStatus(el, text, cls) {
  if (!el) return;
  el.textContent = text;
  el.className = cls || "muted";
}

/* ---------- CLIPBOARD ---------- */
async function copyToClipboard(text, buttonEl) {
  const original = buttonEl ? buttonEl.textContent : null;
  try {
    await navigator.clipboard.writeText(text);
    if (buttonEl) {
      buttonEl.textContent = "COPIED!";
      setTimeout(() => { buttonEl.textContent = original; }, 1500);
    }
    return true;
  } catch (e) {
    // Fallback for non-secure contexts
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      if (buttonEl) {
        buttonEl.textContent = "COPIED!";
        setTimeout(() => { buttonEl.textContent = original; }, 1500);
      }
      return true;
    } catch (e2) {
      if (buttonEl) {
        buttonEl.textContent = "COPY FAILED";
        setTimeout(() => { buttonEl.textContent = original; }, 1500);
      }
      return false;
    }
  }
}

/* ---------- JSON DOWNLOAD ---------- */
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || ("kos-filter-tester-" + Date.now() + ".json");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------- TAXONOMY LOADER ---------- */
/**
 * Fetches a taxonomy from /data/taxonomies.json on demand.
 * Caches it in-memory so subsequent calls are instant.
 * @param {string} key - e.g. "fortiguard", "goguardian", "lightspeed"
 * @returns {Promise<any>}
 */
const TAXONOMY_CACHE = {};
async function loadTaxonomy(key) {
  if (TAXONOMY_CACHE[key]) return TAXONOMY_CACHE[key];
  try {
    const res = await fetchWithTimeout("data/taxonomies.json", 10000, { mode: "cors" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const all = await res.json();
    TAXONOMY_CACHE.__all = all;
    for (const k of Object.keys(all)) TAXONOMY_CACHE[k] = all[k];
    return TAXONOMY_CACHE[key];
  } catch (e) {
    console.warn("loadTaxonomy failed:", e);
    return null;
  }
}

/* ---------- PROXY DATABASE LOADER ---------- */
let PROXY_CACHE = null;
async function loadProxies() {
  if (PROXY_CACHE) return PROXY_CACHE;
  try {
    const res = await fetchWithTimeout("data/proxies.json", 10000, { mode: "cors" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    PROXY_CACHE = await res.json();
    return PROXY_CACHE;
  } catch (e) {
    console.warn("loadProxies failed:", e);
    return null;
  }
}

/* ---------- SECURLY PROFILE LOADER ---------- */
let SECURLY_PROFILE_CACHE = null;
async function loadSecurlyProfile() {
  if (SECURLY_PROFILE_CACHE) return SECURLY_PROFILE_CACHE;
  try {
    const res = await fetchWithTimeout("data/securly-profile.json", 10000, { mode: "cors" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    SECURLY_PROFILE_CACHE = await res.json();
    return SECURLY_PROFILE_CACHE;
  } catch (e) {
    console.warn("loadSecurlyProfile failed:", e);
    return null;
  }
}

/* ---------- MOOD ---------- */
function getMood() {
  return localStorage.getItem("kos_mood") || "normal";
}
function setMood(sorrow) {
  localStorage.setItem("kos_mood", sorrow ? "sorrow" : "normal");
  if (sorrow) document.body.classList.add("mood-sorrow");
  else        document.body.classList.remove("mood-sorrow");
}

/* ---------- QUERY STRING ---------- */
function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* ---------- TIME FORMAT ---------- */
function timestamp() {
  return new Date().toISOString();
}

/* ---------- EXPOSE (optional convenience) ---------- */
window.KOS = {
  fetchWithTimeout,
  sleep,
  checkStop,
  resetStop,
  requestStop,
  escapeHtml,
  REPORT,
  setStatus,
  copyToClipboard,
  downloadJSON,
  loadTaxonomy,
  loadProxies,
  loadSecurlyProfile,
  getMood,
  setMood,
  qs,
  timestamp
};
