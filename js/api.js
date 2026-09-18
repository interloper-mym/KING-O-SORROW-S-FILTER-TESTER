/* ============================================================
   King of Sorrow's Filter Tester
   Inappropriate Recycling v1
   by Airy (also known as mym, ERAM, King of Sorrow, and Swizzy)
   File: js/api.js
   Purpose: Talk to the KOS filter server. Store the server URL
            in localStorage so it can be swapped without redeploy.
   ============================================================ */

/* ---------- DEFAULT SERVER URL ---------- */
const DEFAULT_SERVER_URL = "https://kos-filter-server.onrender.com";

/* ---------- GET / SET SERVER URL ---------- */
function getServerUrl() {
  try {
    const stored = localStorage.getItem("kos_server_url");
    if (stored && stored.startsWith("http")) return stored.replace(/\/+$/, "");
  } catch (e) {}
  return DEFAULT_SERVER_URL;
}

function setServerUrl(url) {
  if (!url || typeof url !== "string") return false;
  let clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) clean = "https://" + clean;
  clean = clean.replace(/\/+$/, "");
  try {
    localStorage.setItem("kos_server_url", clean);
    return true;
  } catch (e) {
    return false;
  }
}

function resetServerUrl() {
  try { localStorage.removeItem("kos_server_url"); } catch (e) {}
}

/* ---------- HEALTH CHECK ---------- */
/**
 * Pings the server's /health endpoint.
 * @param {number} [timeoutMs] - default 15000 (Render cold starts can take ~30s on first hit)
 * @returns {Promise<{ok:boolean, data?:object, error?:string, elapsedMs:number}>}
 */
async function checkServerHealth(timeoutMs) {
  const t0 = performance.now();
  try {
    const res = await KOS.fetchWithTimeout(
      getServerUrl() + "/health",
      timeoutMs || 15000,
      { mode: "cors" }
    );
    const data = await res.json();
    return { ok: true, data, elapsedMs: Math.round(performance.now() - t0) };
  } catch (e) {
    return { ok: false, error: e.message, elapsedMs: Math.round(performance.now() - t0) };
  }
}

/* ---------- RUN FILTERS ---------- */
/**
 * POST /check with a domain. Returns the server's full JSON.
 * @param {string} domain
 * @param {string[]|null} [filterList] - optional subset of filters
 * @param {number} [timeoutMs] - default 60000 (filters can be slow)
 * @returns {Promise<{ok:boolean, data?:object, error?:string, elapsedMs:number}>}
 */
async function runFilters(domain, filterList, timeoutMs) {
  const t0 = performance.now();
  if (!domain || typeof domain !== "string") {
    return { ok: false, error: "Missing domain", elapsedMs: 0 };
  }

  const payload = { domain: domain.trim() };
  if (Array.isArray(filterList) && filterList.length > 0) {
    payload.filters = filterList;
  }

  try {
    const res = await KOS.fetchWithTimeout(
      getServerUrl() + "/check",
      timeoutMs || 60000,
      {
        method: "POST",
        mode: "cors",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      }
    );
    if (!res.ok) {
      return { ok: false, error: "HTTP " + res.status, elapsedMs: Math.round(performance.now() - t0) };
    }
    const data = await res.json();
    return { ok: true, data, elapsedMs: Math.round(performance.now() - t0) };
  } catch (e) {
    return { ok: false, error: e.message, elapsedMs: Math.round(performance.now() - t0) };
  }
}

/* ---------- RUN ONE FILTER ---------- */
/**
 * Convenience: run a single filter by name.
 * @param {string} domain
 * @param {string} filterName
 * @returns {Promise<{ok:boolean, result?:[string,boolean|null,string], error?:string}>}
 */
async function runSingleFilter(domain, filterName) {
  const res = await runFilters(domain, [filterName]);
  if (!res.ok) return { ok: false, error: res.error };
  const result = res.data && res.data.results && res.data.results[filterName];
  if (!result) return { ok: false, error: "No result for " + filterName };
  return { ok: true, result };
}

/* ---------- LIST AVAILABLE FILTERS ---------- */
/**
 * Pull the list of loaded filters from /health.
 * @returns {Promise<string[]>}
 */
async function getAvailableFilters() {
  const health = await checkServerHealth();
  if (health.ok && health.data && Array.isArray(health.data.filters_loaded)) {
    return health.data.filters_loaded;
  }
  return [];
}

/* ---------- EXPOSE ---------- */
window.KOS_API = {
  DEFAULT_SERVER_URL,
  getServerUrl,
  setServerUrl,
  resetServerUrl,
  checkServerHealth,
  runFilters,
  runSingleFilter,
  getAvailableFilters
};
