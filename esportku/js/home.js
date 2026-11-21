import { db, F, $, esc, head, STATUS } from "./fb.js";
import { MODE } from "./mode.js?v=2";
head();
let sport = "", q = "", all = [];
const card = t => `<a class="panel tc" href="turnamen.html?id=${t.id}"><span class="badge ${t.status}">${STATUS[t.status] || ""}</span> <span class="badge">${esc(MODE[t.format] || "")}</span><h3>${esc(t.name)}</h3><p>${esc(t.location || "-")} &middot; ${esc(t.date || "")}</p></a>`;
const draw = () => {
  const k = q.trim().toLowerCase();
  const rows = all.filter(t => (!sport || t.sportId === sport) && (!k || [t.name, t.ownerName, t.location, t.sportName].some(x => String(x || "").toLowerCase().includes(k))));
  $("#empty").textContent = k || sport ? "Tidak ada turnamen yang cocok." : "Belum ada turnamen.";
  $("#empty").classList.toggle("hidden", rows.length > 0);
  // Dikelompokkan per pengelola (pembuat turnamen)
  const by = new Map();
  rows.forEach(t => { const g = by.get(t.ownerId) || { name: t.ownerName || "Tanpa nama", list: [] }; g.list.push(t); by.set(t.ownerId, g); });
  $("#list").innerHTML = [...by.values()].sort((a, b) => a.name.localeCompare(b.name)).map(g => `<section class="og"><h2 class="gh">${esc(g.name)} <span class="badge">${g.list.length} turnamen</span></h2><div class="grid">${g.list.map(card).join("")}</div></section>`).join("");
};
$("#q").oninput = e => { q = e.target.value; draw(); };
try {
  const [s, t] = await Promise.all([F.getDocs(F.collection(db, "sports")), F.getDocs(F.query(F.collection(db, "tournaments"), F.where("published", "==", true)))]);
  all = t.docs.map(d => ({ id: d.id, ...d.data() }));
  const sp = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
  $("#sports").innerHTML = `<button class="on" data-s="">Semua</button>` + sp.map(x => `<button data-s="${x.id}">${esc(x.name)}</button>`).join("");
  $("#sports").onclick = e => { const b = e.target.closest("button"); if (!b) return; sport = b.dataset.s; document.querySelectorAll("#sports button").forEach(x => x.classList.toggle("on", x === b)); draw(); };
  draw();
} catch { $("#empty").textContent = "Gagal memuat data."; $("#empty").classList.remove("hidden"); }
