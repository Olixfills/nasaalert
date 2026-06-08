var TYPES = {
  kidnapping: { l: "Kidnapping", ic: "ti-run", u: "high", c: "#E74C3C", bg: "rgba(231,76,60,.12)" },
  banditry: { l: "Banditry", ic: "ti-bomb", u: "high", c: "#E67E22", bg: "rgba(230,126,34,.12)" },
  farmer_herder: { l: "Farmer\u2013Herder", ic: "ti-flame", u: "high", c: "#F1C40F", bg: "rgba(241,196,15,.12)" },
  suspicious: { l: "Suspicious Movement", ic: "ti-eye", u: "medium", c: "#3498DB", bg: "rgba(52,152,219,.12)" },
  mining: { l: "Illegal Mining", ic: "ti-pickaxe", u: "medium", c: "#9B59B6", bg: "rgba(155,89,182,.12)" },
  communal: { l: "Communal Violence", ic: "ti-users-group", u: "high", c: "#E74C3C", bg: "rgba(231,76,60,.12)" },
  robbery: { l: "Armed Robbery", ic: "ti-shield-x", u: "high", c: "#E67E22", bg: "rgba(230,126,34,.12)" },
  other: { l: "Other Threat", ic: "ti-alert-circle", u: "low", c: "#7F8C8D", bg: "rgba(127,140,141,.12)" }
};

var UB = { high: "#E74C3C", medium: "#F5A623", low: "#0E2340" };
var ALL_LGAS = ["Karu", "Keffi", "Kokona", "Akwanga", "Wamba", "Nasarawa Egon", "Toto", "Nasarawa", "Lafia", "Keana", "Obi", "Awe", "Doma"];
var reports = [];
var shiftLog = [];
var broadcasts = [];
var rid = 900;
var soundOn = true;
var bcPrioSel = "normal";
var escPendingId = null;

function gid() {
  return "NS-2026-0" + (++rid);
}

function ago(ts) {
  var s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  return Math.floor(s / 3600) + "h ago";
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function setText(id, v) {
  var el = document.getElementById(id);
  if (el) el.textContent = v;
}

function setW(id, pct) {
  var el = document.getElementById(id);
  if (el) el.style.width = pct + "%";
}

function show(id, v) {
  var el = document.getElementById(id);
  if (el) el.style.display = v ? "block" : "none";
}

function getShift() {
  var h = new Date().getHours();
  return h >= 6 && h < 14 ? "Day" : h >= 14 && h < 22 ? "Evening" : "Night";
}

function beep(freq, dur, vol) {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = "sine";
    g.gain.setValueAtTime(vol || .08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + (dur || .18));
    osc.start();
    osc.stop(ctx.currentTime + (dur || .18));
  } catch (e) {}
}

function alertBeep() {
  if (soundOn) {
    beep(880, .15, .1);
    setTimeout(function () { beep(1100, .1, .07); }, 200);
  }
}

function dispatchBeep() {
  if (soundOn) beep(660, .15, .07);
}

function resolveBeep() {
  if (soundOn) beep(440, .15, .07);
}

function toggleSound() {
  soundOn = !soundOn;
  var sndBtn = document.getElementById("snd-btn");
  if (sndBtn) sndBtn.classList.toggle("on", soundOn);
  var sndIcon = document.getElementById("snd-icon");
  if (sndIcon) sndIcon.className = soundOn ? "ti ti-bell" : "ti ti-bell-off";
  setText("snd-lbl", soundOn ? "sound on" : "sound off");
}

function toast(title, sub, type) {
  var w = document.getElementById("toast-wrap");
  if (!w) return;
  var d = document.createElement("div");
  d.className = "toast" + (type ? " " + type : "");
  d.innerHTML = '<div class="toast-t">' + title + '</div><div class="toast-s">' + (sub || "") + '</div>';
  w.appendChild(d);
  setTimeout(function () {
    d.style.animation = "toastout .3s ease forwards";
    setTimeout(function () {
      if (d.parentNode) d.parentNode.removeChild(d);
    }, 350);
  }, 4000);
}

function addLog(icon, text, sub, color) {
  shiftLog.unshift({ ts: Date.now(), icon: icon, text: text, sub: sub || "", color: color || "#4A7A9B" });
  renderLog();
}

function renderLog() {
  var el = document.getElementById("log-wrap");
  if (!el) return;
  if (!shiftLog.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;font-size:10px;color:var(--border);font-family:var(--mono)">no activity yet this shift</div>';
    return;
  }
  el.innerHTML = shiftLog.map(function (e) {
    return '<div class="log-entry"><div class="log-time">' + fmtTime(e.ts) + '</div><div class="log-icon" style="color:' + e.color + '"><i class="ti ' + e.icon + '"></i></div><div><div class="log-text">' + e.text + '</div>' + (e.sub ? '<div class="log-sub">' + e.sub + '</div>' : '') + '</div></div>';
  }).join("");
  var tot = reports.length;
  var dis = reports.filter(function (r) { return r.status === "dispatched"; }).length;
  var res = reports.filter(function (r) { return r.status === "resolved"; }).length;
  setText("sl-total", tot);
  setText("sl-dispatched", dis);
  setText("sl-resolved", res);
}

function push(r) {
  reports.unshift(r);
  refresh(r.id);
  updHdr();
  alertBeep();
  toast(r.type.l + (r.type.u === "high" ? " \u2014 HIGH" : ""), "via " + r.ch + " \u00b7 " + r.lga + " LGA", r.type.u === "high" ? "" : "info");
  addLog("ti-alert-circle", "New report: " + r.type.l, "via " + r.ch + " \u00b7 " + r.lga + " \u00b7 " + r.id, r.type.c);
}

function updHdr() {
  var tot = reports.length;
  var act = reports.filter(function (r) { return r.status === "active"; }).length;
  setText("h-total", tot);
  setText("h-active", act);
}

function refresh(newId) {
  var tot = reports.length;
  if (tot === 0) return;
  show("d-empty", false);
  show("d-content", true);
  var act = reports.filter(function (r) { return r.status === "active"; }).length;
  var dis = reports.filter(function (r) { return r.status === "dispatched"; }).length;
  var res = reports.filter(function (r) { return r.status === "resolved"; }).length;
  var anon = reports.filter(function (r) { return r.anon; }).length;
  var hi = reports.filter(function (r) { return r.type.u === "high"; }).length;
  var med = reports.filter(function (r) { return r.type.u === "medium"; }).length;
  var anonPct = Math.round(anon / tot * 100);
  var resPct = Math.round(res / tot * 100);
  var ussdN = reports.filter(function (r) { return r.ch === "USSD"; }).length;
  var waN = reports.filter(function (r) { return r.ch === "WhatsApp"; }).length;
  var appN = reports.filter(function (r) { return r.ch === "App"; }).length;
  
  setText("k-active", act);
  setText("k-total", tot);
  setText("k-resolved", res);
  setText("k-anon", anonPct + "%");
  
  setText("r-active", act);
  setText("r-dis", dis);
  setText("r-res", res);
  setText("r-anon", anon);
  
  setText("s-ussd", ussdN);
  setText("s-wa", waN);
  setText("s-app", appN);
  setText("s-high", hi);
  setText("s-med", med);
  
  setW("sb-ussd", tot > 0 ? Math.round(ussdN / tot * 100) : 0);
  setW("sb-wa", tot > 0 ? Math.round(waN / tot * 100) : 0);
  setW("sb-app", tot > 0 ? Math.round(appN / tot * 100) : 0);
  setW("sb-high", tot > 0 ? Math.round(hi / tot * 100) : 0);
  setW("sb-med", tot > 0 ? Math.round(med / tot * 100) : 0);
  
  setW("res-bar", resPct);
  setText("res-pct-lbl", resPct + "%");
  
  var lbl = document.getElementById("res-pct-lbl");
  if (lbl) {
    lbl.style.color = resPct > 60 ? "#00D084" : resPct > 30 ? "#F5A623" : "#E74C3C";
  }
  
  renderTypes();
  renderLGA();
  renderFeed(newId);
  setText("feed-count", tot + " report" + (tot === 1 ? "" : "s"));
  updateMap();
  renderLog();
}

function renderTypes() {
  var counts = {};
  reports.forEach(function (r) { counts[r.tid] = (counts[r.tid] || 0) + 1; });
  var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
  var tot = reports.length;
  var el = document.getElementById("type-leg");
  if (!el) return;
  if (!sorted.length) {
    el.innerHTML = '<div style="font-size:10px;color:var(--border);text-align:center;padding:16px 0;font-family:var(--mono)">no data</div>';
    return;
  }
  el.innerHTML = sorted.map(function (tid) {
    var t = TYPES[tid] || { l: tid, c: "#4A6A7A" };
    var pct = Math.round(counts[tid] / tot * 100);
    return '<div class="leg-row"><div class="leg-l"><div class="leg-dot" style="background:' + t.c + '"></div><span class="leg-name">' + t.l + '</span></div><span class="leg-val">' + counts[tid] + ' (' + pct + '%)</span></div>';
  }).join("");
}

function renderLGA() {
  var counts = {};
  reports.forEach(function (r) { counts[r.lga] = (counts[r.lga] || 0) + 1; });
  var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
  var max = sorted.length > 0 ? counts[sorted[0]] : 1;
  var el = document.getElementById("lga-list");
  if (!el) return;
  if (!sorted.length) {
    el.innerHTML = '<div style="font-size:10px;color:var(--border);text-align:center;padding:12px 0;font-family:var(--mono)">no data</div>';
    return;
  }
  el.innerHTML = '<div style="display:flex;flex-direction:column;gap:6px">' + sorted.slice(0, 6).map(function (lga) {
    var pct = Math.round(counts[lga] / max * 100);
    var col = pct > 70 ? "#E74C3C" : pct > 40 ? "#F5A623" : "#00D084";
    return '<div style="display:flex;align-items:center;gap:7px"><span style="font-size:10px;color:#2A5A7A;width:90px;flex-shrink:0;font-family:var(--mono)">' + lga + '</span><div style="flex:1;height:4px;background:#060F1C;border-radius:2px"><div style="height:4px;border-radius:2px;width:' + pct + '%;background:' + col + ';transition:width .6s ease"></div></div><span style="font-size:10px;color:#4A7A9B;width:16px;text-align:right;flex-shrink:0;font-family:var(--mono)">' + counts[lga] + '</span></div>';
  }).join("") + '</div>';
}

function renderFeed(newId) {
  var el = document.getElementById("feed-list");
  if (!el) return;
  var filter = (document.getElementById("feed-filter") || {}).value || "all";
  var filtered = reports.filter(function (r) {
    if (filter === "all") return true;
    if (filter === "active") return r.status === "active";
    if (filter === "high") return r.type.u === "high";
    if (filter === "dispatched") return r.status === "dispatched";
    if (filter === "resolved") return r.status === "resolved";
    return true;
  });
  if (!filtered.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;font-size:10px;color:var(--border);font-family:var(--mono)">no matching reports</div>';
    return;
  }
  el.innerHTML = filtered.map(function (r) {
    var isNew = r.id === newId;
    var isRes = r.status === "resolved";
    var isDis = r.status === "dispatched";
    var border = UB[r.type.u] || "#0E2340";
    var chCls = r.ch === "USSD" ? "ussd" : r.ch === "WhatsApp" ? "whatsapp" : "app";
    var actHtml = "";
    if (isRes) {
      actHtml = '<div class="res-row"><i class="ti ti-circle-check" style="font-size:10px"></i>resolved ' + fmtTime(r.resolvedAt || r.ts) + '</div>';
    } else if (isDis) {
      actHtml = '<div class="dis-row"><i class="ti ti-car" style="font-size:10px"></i>' + r.assigned + ' dispatched</div>';
    } else {
      actHtml = '<div class="ri-act"><button class="ra dp" onclick="doDispatch(\'' + r.id + '\')" >dispatch</button><button class="ra rv" onclick="doResolve(\'' + r.id + '\')" >resolve</button><button class="ra es" onclick="openEsc(\'' + r.id + '\')" >escalate</button></div>';
    }
    return '<div class="ri" style="border-left-color:' + border + ';opacity:' + (isRes ? .5 : 1) + '"><div class="ri-ico" style="background:' + r.type.bg + '"><i class="ti ' + r.type.ic + '" style="font-size:13px;color:' + r.type.c + '"></i></div><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:4px;margin-bottom:1px;flex-wrap:wrap"><span class="ri-type">' + r.type.l + '</span>' + (isNew ? '<span class="new-b">NEW</span>' : '') + '<span class="ri-time">' + ago(r.ts) + '</span></div><div class="ri-desc">' + (r.desc || "no description") + (r.lga ? " \u2014 " + r.lga + " LGA" : "") + '</div><div class="ri-meta"><span class="rp ' + chCls + '">' + r.ch + '</span>' + (r.anon ? '<span class="rp anon">anon</span>' : '') + (r.type.u === "high" ? '<span class="rp hi">HIGH</span>' : (r.type.u === "medium" ? '<span class="rp me">MED</span>' : '')) + '<span style="font-size:9px;color:var(--text4);font-family:var(--mono)">' + r.id + '</span></div>' + actHtml + '</div></div>';
  }).join("");
}

function doDispatch(id) {
  var r = reports.find(function (x) { return x.id === id; });
  if (r && r.status === "active") {
    r.status = "dispatched";
    r.assigned = "Patrol Unit " + (Math.floor(Math.random() * 9) + 1);
    dispatchBeep();
    toast("Dispatched", r.assigned + " \u2192 " + r.lga + " LGA", "info");
    addLog("ti-car", "Dispatched: " + r.assigned, r.type.l + " \u00b7 " + r.lga + " \u00b7 " + r.id, "#3498DB");
  }
  refresh();
  updHdr();
  updateMap();
}

function doResolve(id) {
  var r = reports.find(function (x) { return x.id === id; });
  if (r && r.status !== "resolved") {
    r.status = "resolved";
    r.resolvedAt = Date.now();
    resolveBeep();
    toast("Resolved", "Incident " + r.id + " closed", "info");
    addLog("ti-circle-check", "Resolved: " + r.type.l, r.lga + " LGA \u00b7 " + r.id, "#00D084");
  }
  refresh();
  updHdr();
  updateMap();
}

function openEsc(id) {
  escPendingId = id;
  setText("esc-ref", "Ref: " + id);
  var modal = document.getElementById("esc-modal");
  if (modal) modal.classList.add("on");
}

function closeEsc() {
  var modal = document.getElementById("esc-modal");
  if (modal) modal.classList.remove("on");
  escPendingId = null;
}

function confirmEsc() {
  if (!escPendingId) return;
  var r = reports.find(function (x) { return x.id === escPendingId; });
  if (r) {
    r.escalated = true;
    beep(440, .3, .12);
    toast("ESCALATED TO COMMAND", "Commissioner & Security Council notified \u00b7 " + escPendingId);
    addLog("ti-alert-triangle", "ESCALATED: " + r.type.l, (r.lga || "") + " LGA \u00b7 " + escPendingId, "#E74C3C");
  }
  closeEsc();
  refresh();
}

function updateMap() {
  var counts = {};
  var actCounts = {};
  reports.forEach(function (r) {
    counts[r.lga] = (counts[r.lga] || 0) + 1;
    if (r.status === "active") actCounts[r.lga] = (actCounts[r.lga] || 0) + 1;
  });
  ALL_LGAS.forEach(function (lga) {
    var n = counts[lga] || 0;
    var a = actCounts[lga] || 0;
    var textEl = document.getElementById("mc-" + lga);
    if (textEl) textEl.textContent = n || "0";
    var gEl = document.getElementById("lga-" + lga);
    if (gEl) {
      var rect = gEl.querySelector("rect");
      if (rect) {
        rect.classList.remove("active-lga", "med-lga");
        if (a > 0) rect.classList.add("active-lga");
        else if (n > 0) rect.classList.add("med-lga");
      }
    }
  });
}

function mapClick(lga) {
  var lgaRep = reports.filter(function (r) { return r.lga === lga; });
  var act = lgaRep.filter(function (r) { return r.status === "active"; }).length;
  var res = lgaRep.filter(function (r) { return r.status === "resolved"; }).length;
  var typeCounts = {};
  lgaRep.forEach(function (r) { typeCounts[r.tid] = (typeCounts[r.tid] || 0) + 1; });
  var topType = "\u2014";
  var topN = 0;
  Object.keys(typeCounts).forEach(function (t) {
    if (typeCounts[t] > topN) {
      topN = typeCounts[t];
      topType = (TYPES[t] || { l: t }).l;
    }
  });
  setText("mi-lga", lga);
  setText("mi-tot", lgaRep.length);
  setText("mi-act", act);
  setText("mi-res", res);
  setText("mi-type", topType || "\u2014");
  
  var selText = document.getElementById("map-selected-text");
  if (selText) {
    selText.textContent = lga + ": " + lgaRep.length + " report" + (lgaRep.length !== 1 ? "s" : "") + (act ? " \u00b7 " + act + " active" : "");
  }
}

function switchDashTab(tab) {
  ["live", "map", "log", "bc"].forEach(function (t) {
    var tp = document.getElementById("tp-" + t);
    var tb = document.getElementById("dtb-" + t);
    if (tp) tp.classList.toggle("on", t === tab);
    if (tb) tb.classList.toggle("on", t === tab);
  });
  if (tab === "log") renderLog();
  if (tab === "map") updateMap();
  if (tab === "bc") renderBroadcasts();
}

function sc(ch) {
  ["ussd", "wa", "app"].forEach(function (c) {
    var p = document.getElementById("cp-" + c);
    var t = document.getElementById("ctb-" + c);
    if (p) p.classList.toggle("on", c === ch);
    if (t) t.classList.toggle("on", c === ch);
  });
}

var uSt = 0, uD = {};
var uTM = { "1": "kidnapping", "2": "banditry", "3": "farmer_herder", "4": "suspicious", "5": "communal", "6": "mining", "7": "robbery" };
var uLM = { "1": "Akwanga", "2": "Awe", "3": "Doma", "4": "Karu", "5": "Keana", "6": "Keffi", "7": "Lafia", "8": "Toto", "9": "Wamba" };

function setUscrn(t) {
  var el = document.getElementById("ussd-scr");
  if (el) el.textContent = t;
}

function uk(k) {
  if (uSt === 0) {
    if (k === "1") {
      uSt = 1;
      setUscrn("Incident Type:\n1.Kidnapping\n2.Banditry\n3.Farmer-Herder\n4.Suspicious\n5.Communal\n6.Mining\n7.Robbery\n0.Back");
    } else if (k === "0") resetUssd();
  }
  else if (uSt === 1) {
    if (uTM[k]) {
      uD.type = uTM[k];
      uSt = 2;
      setUscrn("Select LGA:\n1.Akwanga 2.Awe\n3.Doma 4.Karu\n5.Keana 6.Keffi\n7.Lafia 8.Toto\n9.Wamba\n0.Back");
    } else if (k === "0") {
      uSt = 0;
      setUscrn("Welcome to NasaAlert\nPress 1 to Report\nPress 0 to Cancel");
    }
  }
  else if (uSt === 2) {
    if (uLM[k]) {
      uD.lga = uLM[k];
      uSt = 3;
      var t = TYPES[uD.type] || TYPES.other;
      setUscrn("Confirm?\n\nType: " + t.l + "\nLGA: " + uD.lga + "\nAnon: YES\n\n1.Submit 0.Cancel");
    } else if (k === "0") {
      uSt = 1;
      setUscrn("Incident Type:\n1.Kidnapping\n2.Banditry\n3.Farmer-Herder\n4.Suspicious\n5.Communal\n6.Mining\n7.Robbery\n0.Back");
    }
  }
  else if (uSt === 3) {
    if (k === "1") {
      var t = TYPES[uD.type] || TYPES.other;
      var r = { id: gid(), ch: "USSD", tid: uD.type, type: t, lga: uD.lga, desc: "Reported via USSD *384#", ts: Date.now(), status: "active", anon: true };
      push(r);
      setUscrn("Submitted!\n\nRef: " + r.id + "\n\nIdentity protected.\nThank you.\n\n# to restart");
      uSt = 4;
      show("ussd-link-wrap", true);
    } else if (k === "0") resetUssd();
  }
  else if (uSt === 4) {
    if (k === "#") resetUssd();
  }
}

function resetUssd() {
  uSt = 0;
  uD = {};
  setUscrn("Welcome to NasaAlert\nPress 1 to Report\nPress 0 to Cancel");
  show("ussd-link-wrap", false);
}

var wSt = 0, wD = {};

function initWa() {
  var el = document.getElementById("wa-feed");
  if (el) el.innerHTML = "";
  addWaMsg("bot", "Welcome to NasaAlert.\n\nEncrypted & anonymous.\n\nType REPORT to begin.");
  wSt = 0;
  wD = {};
  show("wa-link-row", false);
  var wr = document.getElementById("wa-inp-row");
  if (wr) wr.style.display = "flex";
}

function addWaMsg(from, text) {
  var el = document.getElementById("wa-feed");
  if (!el) return;
  var w = document.createElement("div");
  w.style.display = "flex";
  w.style.justifyContent = from === "bot" ? "flex-start" : "flex-end";
  var m = document.createElement("div");
  m.className = "wm " + from;
  m.textContent = text;
  w.appendChild(m);
  el.appendChild(w);
  el.scrollTop = el.scrollHeight;
}

function sendWa() {
  var inp = document.getElementById("wa-inp");
  var msg = (inp ? inp.value : "").trim();
  if (!msg) return;
  addWaMsg("user", msg);
  if (inp) inp.value = "";
  setTimeout(function () {
    var bot = "";
    if (wSt === 0 && msg.toUpperCase().includes("REPORT")) {
      bot = "Select type:\n1.Kidnapping 2.Banditry\n3.Farmer-Herder 4.Suspicious\n5.Communal 6.Mining 7.Other";
      wSt = 1;
    }
    else if (wSt === 1) {
      var m = { "1": "kidnapping", "2": "banditry", "3": "farmer_herder", "4": "suspicious", "5": "communal", "6": "mining", "7": "other" };
      if (m[msg]) {
        wD.type = m[msg];
        var t = TYPES[m[msg]] || TYPES.other;
        bot = "Type: " + t.l + "\n\nWhich LGA?";
        wSt = 2;
      } else bot = "Reply 1\u20137.";
    }
    else if (wSt === 2) {
      wD.lga = msg;
      bot = "Describe what you saw.\n(or SKIP)";
      wSt = 3;
    }
    else if (wSt === 3) {
      wD.desc = msg.toUpperCase() === "SKIP" ? "No description." : msg;
      var t = TYPES[wD.type] || TYPES.other;
      bot = "Confirm?\nType: " + t.l + "\nLGA: " + wD.lga + "\nAnon: YES\n\nYES / NO";
      wSt = 4;
    }
    else if (wSt === 4) {
      if (msg.toUpperCase() === "YES") {
        var t = TYPES[wD.type] || TYPES.other;
        var r = { id: gid(), ch: "WhatsApp", tid: wD.type, type: t, lga: wD.lga, desc: wD.desc || "Reported via WhatsApp", ts: Date.now(), status: "active", anon: true };
        push(r);
        bot = "Submitted. Ref: " + r.id + "\n\nOps Room notified. Identity protected.\n\nType REPORT for another.";
        wSt = 0;
        wD = {};
        show("wa-link-row", true);
        var wr = document.getElementById("wa-inp-row");
        if (wr) wr.style.display = "none";
        setTimeout(function () {
          var wr2 = document.getElementById("wa-inp-row");
          if (wr2) wr2.style.display = "flex";
        }, 5000);
      }
      else if (msg.toUpperCase() === "NO") {
        bot = "Cancelled. Type REPORT to start.";
        wSt = 0;
        wD = {};
      }
      else bot = "Reply YES or NO.";
    } else {
      bot = "Type REPORT to submit.";
      wSt = 0;
    }
    addWaMsg("bot", bot);
  }, 600);
}

function resetWa() {
  initWa();
}

var aSt = 1, aType = "", aLga = "", aDesc = "", aAnon = true;

function updSbars() {
  ["sb1", "sb2", "sb3"].forEach(function (id, i) {
    var el = document.getElementById(id);
    if (el) el.style.background = i < aSt ? "#00D084" : "#0E2340";
  });
}

function aSelType(id) {
  aType = id;
  document.querySelectorAll(".tc").forEach(function (c) {
    c.classList.remove("sel");
  });
  var el = document.getElementById("at-" + id);
  if (el) el.classList.add("sel");
}

function aFlipAnon() {
  aAnon = !aAnon;
  var tg = document.getElementById("a-tgl");
  var th = document.getElementById("a-tth");
  if (tg) tg.style.background = aAnon ? "#00D084" : "#0E2340";
  if (th) th.style.right = aAnon ? "2px" : "16px";
}

function aGo(step) {
  if (step === 2 && !aType) {
    alert("Select an incident type.");
    return;
  }
  if (step === 3) {
    aLga = (document.getElementById("a-lga") || {}).value || "";
    aDesc = (document.getElementById("a-desc") || {}).value || "";
    if (!aLga) {
      alert("Select a LGA.");
      return;
    }
    var t = TYPES[aType] || TYPES.other;
    var el = document.getElementById("a-summ");
    if (el) el.innerHTML = [["type", t.l], ["LGA", aLga], ["description", aDesc || "none"], ["identity", aAnon ? "anonymous" : "identified"]].map(function (row) {
      return '<div class="summ-row"><span class="summ-k">' + row[0] + '</span><span class="summ-v" style="color:' + (row[0] === "identity" && aAnon ? "#00D084" : "#8ABACC") + '">' + row[1] + '</span></div>';
    }).join("");
  }
  ["ap1", "ap2", "ap3", "ap4"].forEach(function (id, i) {
    var el = document.getElementById(id);
    if (el) el.style.display = i + 1 === step ? "block" : "none";
  });
  aSt = step;
  updSbars();
}

function aSubmit() {
  var t = TYPES[aType] || TYPES.other;
  var r = { id: gid(), ch: "App", tid: aType, type: t, lga: aLga, desc: aDesc || "Reported via App", ts: Date.now(), status: "active", anon: aAnon };
  push(r);
  var el = document.getElementById("a-track");
  if (el) el.textContent = r.id;
  aGo(4);
}

function aReset() {
  aSt = 1;
  aType = "";
  aLga = "";
  aDesc = "";
  aAnon = true;
  document.querySelectorAll(".tc").forEach(function (c) {
    c.classList.remove("sel");
  });
  var la = document.getElementById("a-lga");
  if (la) la.value = "";
  var da = document.getElementById("a-desc");
  if (da) da.value = "";
  var tg = document.getElementById("a-tgl");
  if (tg) tg.style.background = "#00D084";
  var th = document.getElementById("a-tth");
  if (th) th.style.right = "2px";
  aGo(1);
  updSbars();
}

var bcTargets = ["All Units"];

function bcToggle(el) {
  var t = el.getAttribute("data-t");
  var idx = bcTargets.indexOf(t);
  if (idx === -1) {
    bcTargets.push(t);
    el.classList.add("on");
  } else {
    bcTargets.splice(idx, 1);
    el.classList.remove("on");
  }
}

function bcPrio(p) {
  bcPrioSel = p;
  ["urgent", "normal", "info"].forEach(function (x) {
    var el = document.getElementById("bp-" + x);
    if (el) el.classList.remove("sel-r", "sel-a", "sel-g");
  });
  var cls = p === "urgent" ? "sel-r" : p === "info" ? "sel-g" : "sel-a";
  var pel = document.getElementById("bp-" + p);
  if (pel) pel.classList.add(cls);
}

function sendBroadcast() {
  var msg = (document.getElementById("bc-msg") || {}).value || "";
  if (!msg.trim()) {
    alert("Please type a message.");
    return;
  }
  if (!bcTargets.length) {
    alert("Select at least one target.");
    return;
  }
  var bc = { ts: Date.now(), msg: msg.trim(), targets: bcTargets.slice(), priority: bcPrioSel };
  broadcasts.unshift(bc);
  addLog("ti-speakerphone", "Broadcast sent", "To: " + bcTargets.join(", ") + " \u00b7 " + bcPrioSel.toUpperCase(), "#00D084");
  beep(550, .2, .08);
  toast("Broadcast Sent", "To: " + bcTargets.join(", "), "info");
  var el = document.getElementById("bc-msg");
  if (el) el.value = "";
  renderBroadcasts();
}

function renderBroadcasts() {
  var el = document.getElementById("bc-feed");
  if (!el) return;
  if (!broadcasts.length) {
    el.innerHTML = '<div style="text-align:center;padding:16px;font-size:10px;color:var(--border);font-family:var(--mono)">no broadcasts sent this shift</div>';
    return;
  }
  var pCol = { urgent: "#E74C3C", normal: "#F5A623", info: "#00D084" };
  el.innerHTML = broadcasts.map(function (b) {
    return '<div class="bc-item" style="border-left-color:' + (pCol[b.priority] || "#0E2340") + '"><div class="bc-item-hdr"><span class="bc-item-to">To: ' + b.targets.join(", ") + '</span><span class="bc-item-time">' + fmtTime(b.ts) + '</span></div><div class="bc-item-msg">' + b.msg + '</div></div>';
  }).join("");
}

function exportCSV() {
  if (!reports.length) {
    alert("No reports to export.");
    return;
  }
  var hdr = ["ID", "Channel", "Type", "LGA", "Description", "Status", "Anonymous", "Time"];
  var rows = reports.map(function (r) {
    return [r.id, r.ch, r.type.l, r.lga, '"' + (r.desc || "").replace(/"/g, "\'") + '"', r.status, r.anon ? "yes" : "no", new Date(r.ts).toISOString()];
  });
  var csv = [hdr].concat(rows).map(function (r) { return r.join(","); }).join("\n");
  var a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = "nasaalert_export_" + Date.now() + ".csv";
  a.click();
}

function exportPrint() {
  var w = window.open("", "_blank");
  var rows = reports.map(function (r) {
    return "<tr><td>" + r.id + "</td><td>" + r.ch + "</td><td>" + r.type.l + "</td><td>" + r.lga + "</td><td>" + r.status + "</td><td>" + fmtTime(r.ts) + "</td></tr>";
  }).join("");
  w.document.write("<html><head><title>NasaAlert Shift Report</title><style>body{font-family:sans-serif;font-size:12px;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}th{background:#f0f0f0}</style></head><body><h2>NasaAlert OPS Room v2 \u2014 Shift Report</h2><p>Generated: " + new Date().toLocaleString() + "</p><table><thead><tr><th>ID</th><th>Channel</th><th>Type</th><th>LGA</th><th>Status</th><th>Time</th></tr></thead><tbody>" + rows + "</tbody></table></body></html>");
  w.document.close();
  w.print();
}

setInterval(function () {
  var el = document.getElementById("dash-clk");
  if (el) el.textContent = new Date().toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  setText("h-shift", getShift());
  if (reports.length > 0) renderFeed();
}, 1000);

document.getElementById("shift-date-label").textContent = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) + " \u00b7 " + getShift() + " Shift";
initWa();
updSbars();
