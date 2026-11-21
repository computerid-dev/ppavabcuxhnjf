import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import * as A from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { table, roundName } from "./bracket.js";
import * as F from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyDhYVk9mRraOVg_efWcA5Er44OOGvBgjVw",
  authDomain: "partnersfingsh10001.firebaseapp.com",
  projectId: "partnersfingsh10001",
  storageBucket: "partnersfingsh10001.firebasestorage.app",
  messagingSenderId: "383897610650",
  appId: "1:383897610650:web:6294451af377ba51ccb223"
});
export const auth = A.getAuth(app), db = F.getFirestore(app);
export { A, F };
export const $ = (s, r = document) => r.querySelector(s);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const mail = u => u + "@esportku.app";
export const STATUS = { akan_datang: "Akan datang", berlangsung: "Berlangsung", selesai: "Selesai" };

const cup = '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H3v1a4 4 0 0 0 4 4M17 6h4v1a4 4 0 0 1-4 4M12 14v4M8 21h8M9 18h6"/></svg>';
export const head = () => {
  $("#top").innerHTML = `<a class="brand" href="index.html">${cup}<span>ESPORT<b>KU</b><small>LIGA OLAHRAGA</small></span></a><nav><a href="index.html">Beranda</a><a class="btn sm" href="dashboard.html">Dashboard</a></nav>`;
};
export const toast = t => {
  const e = document.createElement("div");
  e.className = "toast"; e.textContent = t; document.body.append(e);
  setTimeout(() => e.remove(), 3200);
};
export const card = (m, set, L = {}) => {
  const lg = id => L[id] ? `<img class="lg" src="${esc(L[id])}" alt="">` : "";
  const row = (n, i, v, w, id) => `<div class="mr${w ? " win" : ""}"><b>${lg(id)}${esc(n || "TBD")}</b>${set ? Array.from({ length: set === true ? 3 : set }, (_, j) => `<i>${m.sets[j] ? m.sets[j][i] : "–"}</i>`).join("") : ""}<em>${m.done ? v : "–"}</em></div>`;
  return `<div class="mc">${row(m.na, 0, m.sa, m.done && m.sa > m.sb, m.a)}${row(m.nb, 1, m.sb, m.done && m.sb > m.sa, m.b)}${m.when || m.grp ? `<small>${m.grp ? "Grup " + m.grp + " &middot; " : ""}${esc(m.when)}</small>` : ""}</div>`;
};

export const klas = (ts, ms) => [...new Set(ts.map(t => t.grp || ""))].sort().map(G => `<div class="panel wrap" style="margin-bottom:16px">${G ? `<div class="sub" style="margin-bottom:8px">Grup ${G}</div>` : ""}<table><tr><th>#</th><th>Tim</th><th>Main</th><th>M</th><th>S</th><th>K</th><th>Selisih</th><th>Poin</th></tr>${table(ts.filter(t => (t.grp || "") === G), ms).map((r, i) => `<tr><td>${i + 1}</td><td>${r.logo ? `<img class="lg" src="${esc(r.logo)}" alt="">` : ""}${esc(r.n)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.f - r.a}</td><td><b>${r.pt}</b></td></tr>`).join("")}</table></div>`).join("");

// Dropdown custom (menggantikan tampilan bawaan browser), nilai tetap dibaca dari <select> aslinya
export const enhance = root => root.querySelectorAll("select:not([data-dd])").forEach(sel => {
  sel.dataset.dd = 1; sel.hidden = true;
  const w = document.createElement("div"), b = document.createElement("button"), l = document.createElement("div");
  w.className = "dd"; b.type = "button"; b.className = "dd-b"; l.className = "dd-l";
  const sync = () => { b.textContent = sel.options[sel.selectedIndex]?.text || ""; [...l.children].forEach((o, i) => o.classList.toggle("on", i === sel.selectedIndex)); };
  [...sel.options].forEach((o, i) => {
    const d = document.createElement("div"); d.className = "dd-o"; d.textContent = o.text;
    d.onclick = () => { sel.selectedIndex = i; sel.dispatchEvent(new Event("change", { bubbles: true })); sync(); w.classList.remove("open"); };
    l.append(d);
  });
  b.onclick = e => { e.stopPropagation(); document.querySelectorAll(".dd.open").forEach(x => x !== w && x.classList.remove("open")); w.classList.toggle("open"); };
  w.append(b, l); sel.after(w); sync();
});
document.addEventListener("click", () => document.querySelectorAll(".dd.open").forEach(x => x.classList.remove("open")));

// Memperkecil foto logo menjadi 96x96 agar ringan disimpan di Firestore
export const shrink = file => new Promise((ok, no) => {
  const img = new Image(), u = URL.createObjectURL(file);
  img.onload = () => {
    const c = document.createElement("canvas"), m = Math.min(img.width, img.height);
    c.width = c.height = 96;
    c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 96, 96);
    URL.revokeObjectURL(u); ok(c.toDataURL("image/webp", 0.8));
  };
  img.onerror = () => no(new Error("img")); img.src = u;
});

// Bagan alur turnamen (gugur, gugur ganda, atau babak gugur setelah grup)
export const bracketHtml = (ms, fmt, set, L) => {
  const ko = ms.filter(m => !m.bye && m.stage !== "grup");
  if (!ko.length) return '<p class="empty">Bagan belum tersedia.</p>';
  const cols = (a, name) => `<div class="rounds">${[...new Set(a.map(m => m.round))].sort((x, y) => x - y).map(r => `<div class="rcol"><h4>${name(r)}</h4>${a.filter(m => m.round === r).sort((x, y) => x.idx - y.idx).map(m => card(m, set, L)).join("")}</div>`).join("")}</div>`;
  if (fmt !== "double") { const last = Math.max(...ko.map(m => m.round)); return cols(ko, r => roundName(r, last)); }
  const up = ko.filter(m => m.stage === "gugur"), k = Math.max(...up.map(m => m.round));
  return `<div class="chip">UPPER BRACKET</div>${cols(up, r => ["UPPER FINAL", "UPPER SEMIFINAL", "UPPER QUARTER FINAL"][k - r] || "UPPER ROUND " + r)}<div class="chip low">LOWER BRACKET</div>${cols(ko.filter(m => m.stage === "lower"), r => "ROUND " + r)}<div class="chip">GRAND FINAL</div>${cols(ko.filter(m => m.stage === "final"), () => "FINAL")}`;
};
