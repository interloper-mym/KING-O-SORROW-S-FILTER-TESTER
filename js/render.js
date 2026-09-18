/* ============================================================
   King of Sorrow's Filter Tester
   Inappropriate Recycling v1
   by Airy (also known as mym, ERAM, King of Sorrow, and Swizzy)
   File: js/render.js
   Purpose: Render helpers. Turn server JSON into the emoji
            matrix, Securly reports, proxy matches, etc.
   ============================================================ */

/* ---------- EMOJI MAP ---------- */
const FILTER_EMOJI = {
  fortiguard:    "🛡️",
  lightspeed:    "🚦",
  paloalto:      "🔥",
  blocksiWeb:    "🧱",
  blocksiAI:     "🧱",
  linewize:      "🌐",
  cisco:         "☁️",
  securly:       "⚛️",
  goguardian:    "🔒",
  lanschool:     "🏫",
  contentkeeper: "🧹",
  aristotle:     "🥏",
  senso:         "🌳",
  deledao:       "😈",
  iboss:         "💼",
  sophos:        "🛏️",
  barracuda:     "🐍",
  qustodio:      "🎙️",
  studentkeeper: "🧑‍🎓"
};

const FILTER_LABEL = {
  fortiguard:    "FortiGuard",
  lightspeed:    "Lightspeed",
  paloalto:      "Palo Alto",
  blocksiWeb:    "Blocksi Web",
  blocksiAI:     "Blocksi AI",
  linewize:      "Linewize",
  cisco:         "Cisco Umbrella",
  securly:       "Securly",
  goguardian:    "GoGuardian",
  lanschool:     "LanSchool",
  contentkeeper: "ContentKeeper",
  aristotle:     "AristotleK12",
  senso:         "Senso Cloud",
  deledao:       "Deledao",
  iboss:         "iBoss",
  sophos:        "Sophos",
  barracuda:     "Barracuda",
  qustodio:      "Qustodio",
  studentkeeper: "StudentKeeper"
};

/* Canonical display order — matches the server's FILTER_ORDER */
const FILTER_ORDER = [
  "fortiguard", "lightspeed", "paloalto", "blocksiWeb", "blocksiAI",
  "linewize", "cisco", "securly", "goguardian", "lanschool",
  "contentkeeper", "aristotle", "senso", "deledao", "iboss",
  "sophos", "barracuda", "qustodio"
];

/* ---------- STATUS ICON ---------- */
/**
 * Decide the trailing icon based on the result tuple.
 * result = [category, blocked, source]
 * blocked: true  → ❌
 * blocked: false → ✅
 * blocked: null  → ❓ (unknown / opaque / stub)
 * "TIMEOUT"      → ⏱️
 * "ERROR"        → ❌ (with note)
 */
function filterStatusIcon(result) {
  if (!result) return "❓";
  const [cat, blocked] = result;

  if (typeof cat === "string" && cat.toUpperCase() === "TIMEOUT") return "⏱️ Timed out";
  if (typeof cat === "string" && cat.toUpperCase().startsWith("TOKEN_UNAVAILABLE")) return "❓ (token dead)";
  if (typeof cat === "string" && cat.toUpperCase().includes("SERVER-ONLY")) return "❓ (server-only)";
  if (typeof cat === "string" && cat.toUpperCase().startsWith("CORS")) return "❌ CORS/Blocked";
  if (typeof cat === "string" && (cat.toUpperCase().includes("ERROR") || cat.toUpperCase().startsWith("DEBUG_ERROR"))) return "❌ Error";
  if (typeof cat === "string" && cat.startsWith("(opaque")) return "❓";

  if (blocked === true)  return "❌";
  if (blocked === false) return "✅";
  return "❓";
}

/* ---------- FILTER MATRIX RENDER ---------- */
/**
 * Renders the full emoji matrix from a /check response.
 * @param {object} data - { domain, results: {...}, timestamp }
 * @returns {string} - plain-text matrix
 */
function renderFilterMatrix(data) {
  if (!data || !data.results) {
    return "No results to display.";
  }
  const domain = data.domain || "(unknown)";
  const ts = data.timestamp || new Date().toISOString();
  let out = "=== UNIVERSAL FILTER MATRIX ===\n";
  out += "Target: " + domain + "\n";
  out += "Date: " + ts + "\n\n";

  for (const key of FILTER_ORDER) {
    const result = data.results[key];
    if (!result) continue;
    const emoji = FILTER_EMOJI[key] || "▫️";
    const label = FILTER_LABEL[key] || key;
    const cat = result[0] || "(unknown)";
    const icon = filterStatusIcon(result);
    out += emoji + " " + label + " (" + cat + ") " + icon + "\n";
  }

  out += "\nAll checkers are observation-only. Your school may differ.\n";
  return out;
}

/* ---------- FILTER MATRIX HTML ---------- */
/**
 * Same matrix, but as HTML for the matrix.html page.
 * Returns an element-safe HTML string.
 */
function renderFilterMatrixHTML(data) {
  if (!data || !data.results) {
    return "<div class='muted'>No results to display.</div>";
  }
  const domain = data.domain || "(unknown)";
  const ts = data.timestamp || new Date().toISOString();

  let html = "";
  html += "<div class='matrix-header'>";
  html += "<div><strong>Target:</strong> " + KOS.escapeHtml(domain) + "</div>";
  html += "<div class='muted'>" + KOS.escapeHtml(ts) + "</div>";
  html += "</div><hr/>";

  for (const key of FILTER_ORDER) {
    const result = data.results[key];
    if (!result) continue;
    const emoji = FILTER_EMOJI[key] || "▫️";
    const label = FILTER_LABEL[key] || key;
    const cat = result[0] || "(unknown)";
    const icon = filterStatusIcon(result);
    let cls = "unknown";
    if (icon.indexOf("✅") !== -1) cls = "ok";
    else if (icon.indexOf("❌") !== -1) cls = "bad";
    else if (icon.indexOf("⏱️") !== -1) cls = "warn";
    html += "<div class='matrix-row " + cls + "'>";
    html += "<span class='matrix-emoji'>" + emoji + "</span>";
    html += "<span class='matrix-label'>" + KOS.escapeHtml(label) + "</span>";
    html += "<span class='matrix-cat'>(" + KOS.escapeHtml(cat) + ")</span>";
    html += "<span class='matrix-icon'>" + KOS.escapeHtml(icon) + "</span>";
    html += "</div>";
  }
  html += "<hr/><div class='muted'>All checkers are observation-only. Your school may differ.</div>";
  return html;
}

/* ---------- SECURLY PROFILE RENDER ---------- */
function renderSecurlyProfile(profile, el) {
  if (!el) return;
  if (!profile) {
    el.textContent = "Profile not loaded.";
    return;
  }
  const meta = profile.meta || {};
  let html = "";
  html += "<div><strong>Source:</strong> " + KOS.escapeHtml(meta.source || "?") + "</div>";
  html += "<div><strong>URL:</strong> " + KOS.escapeHtml(meta.url || "?") + "</div>";
  html += "<div><strong>Access model:</strong> " + KOS.escapeHtml(meta.accessModel || "?") + "</div>";
  html += "<div><strong>Notes:</strong> " + KOS.escapeHtml(meta.notes || "") + "</div>";
  el.innerHTML = html;
}

/* ---------- SECURLY DECODER RENDER ---------- */
function renderSecurlyDecoder(out, el) {
  if (!el) return;
  if (!out) { el.textContent = "Paste a URL first."; return; }
  let html = "";
  html += "<div><strong>Raw URL:</strong> " + KOS.escapeHtml((out.raw || "").slice(0, 160)) + "</div>";
  if (out.decoded) {
    html += "<div class='ok'><strong>Decoded target:</strong> " + KOS.escapeHtml(out.decoded) + "</div>";
  } else {
    html += "<div class='bad'>No decodable target found.</div>";
  }
  if (out.token) {
    html += "<div><strong>Token (first 60):</strong> " + KOS.escapeHtml(out.token.slice(0, 60)) + "</div>";
    html += "<div><strong>Token type:</strong> " + KOS.escapeHtml(out.tokenType || "unknown") + "</div>";
    html += "<div><strong>Token length:</strong> " + (out.tokenLength || 0) + " bytes</div>";
  }
  if (out.errors && out.errors.length) {
    html += "<div class='bad'><strong>Errors:</strong><ul>";
    for (const e of out.errors) html += "<li>" + KOS.escapeHtml(e) + "</li>";
    html += "</ul></div>";
  }
  el.innerHTML = html;
}

/* ---------- SECURLY ENUMERATOR RENDER ---------- */
function renderSecurlyEnum(results, el) {
  if (!el) return;
  if (!results || !results.length) { el.textContent = "No endpoints probed."; return; }
  let html = "";
  for (const r of results) {
    if (r.ok) {
      html += "<div class='ok'>[OK] " + KOS.escapeHtml(r.host) + " → " + (r.ms || "?") + "ms</div>";
    } else {
      html += "<div class='bad'>[FAIL] " + KOS.escapeHtml(r.host) + " → " + KOS.escapeHtml(r.err || "unknown") + "</div>";
    }
  }
  el.innerHTML = html;
}

/* ---------- PROXY FINGERPRINT RENDER ---------- */
/**
 * matches = [{proxy, hits, total}]
 */
function renderProxyFingerprint(url, matches, bodyLength, el) {
  if (!el) return;
  let html = "";
  html += "<div><strong>URL:</strong> " + KOS.escapeHtml(url) + "</div>";
  if (bodyLength != null) html += "<div><strong>Body length:</strong> " + bodyLength + " bytes</div>";
  html += "<hr/>";
  if (!matches || !matches.length) {
    html += "<div class='muted'>No known proxy fingerprints matched.</div>";
  } else {
    for (const m of matches) {
      const confidence = Math.round((m.hits / m.total) * 100);
      let cls = confidence >= 75 ? "bad" : (confidence >= 50 ? "warn" : "muted");
      html += "<div class='" + cls + "'>Matched: <strong>" + KOS.escapeHtml(m.proxy) + "</strong> (" + m.hits + "/" + m.total + " — " + confidence + "%)</div>";
    }
  }
  el.innerHTML = html;
}

/* ---------- REFERENCE TABLE RENDER ---------- */
function renderReferenceTable(obj, el, mode) {
  if (!el) return;
  if (!obj) { el.textContent = "Not loaded."; return; }
  let html = "";
  if (Array.isArray(obj)) {
    for (const row of obj) {
      if (mode === "lightspeed") {
        html += String(row.CategoryNumber).padStart(4, " ") + "  " + KOS.escapeHtml(row.CategoryName) + "<br/>";
      } else if (mode === "securly") {
        html += String(row[0]).padStart(4, " ") + "  " + KOS.escapeHtml(row[1]) + "<br/>";
      } else if (mode === "blocksi") {
        html += String(row[0]).padStart(4, " ") + "  " + KOS.escapeHtml(row[1]) + "<br/>";
      } else {
        html += KOS.escapeHtml(JSON.stringify(row)) + "<br/>";
      }
    }
  } else if (typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      let name = "";
      if (Array.isArray(v)) name = v[0];
      else if (typeof v === "object" && v) name = v.category || v.name || JSON.stringify(v);
      else name = String(v);
      html += String(k).padStart(4, " ") + "  " + KOS.escapeHtml(name) + "<br/>";
    }
  } else {
    html = KOS.escapeHtml(String(obj));
  }
  el.innerHTML = html;
}

/* ---------- SIMULATOR RENDER ---------- */
function renderSimulator({ domain, category, observed, verdict }, el) {
  if (!el) return;
  let html = "";
  html += "<div><strong>Domain:</strong> <span class='ok'>" + KOS.escapeHtml(domain) + "</span></div>";
  html += "<div><strong>Guess cat:</strong> <span class='info'>" + KOS.escapeHtml(category) + "</span></div>";
  if (observed) html += "<div><strong>Observed:</strong> <span class='warn'>" + KOS.escapeHtml(observed) + "</span></div>";
  html += "<div><strong>Verdict:</strong> " + KOS.escapeHtml(verdict) + "</div>";
  html += "<div class='muted' style='margin-top:8px;font-size:11px'>Heuristic only. No network calls made.</div>";
  el.innerHTML = html;
}

/* ---------- CITATION ---------- */
function citationFooter() {
  return "— " + KOS.PROJECT + " · " + KOS.VERSION + " · " + KOS.BYLINE;
}

/* ---------- EXPOSE ---------- */
window.KOS_RENDER = {
  FILTER_EMOJI,
  FILTER_LABEL,
  FILTER_ORDER,
  filterStatusIcon,
  renderFilterMatrix,
  renderFilterMatrixHTML,
  renderSecurlyProfile,
  renderSecurlyDecoder,
  renderSecurlyEnum,
  renderProxyFingerprint,
  renderReferenceTable,
  renderSimulator,
  citationFooter
};
