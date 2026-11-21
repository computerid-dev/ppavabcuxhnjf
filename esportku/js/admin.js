import { auth, db, A, F, $, esc, head, toast, STATUS } from "./fb.js";
head();
const col = n => F.collection(db, n), dc = (...p) => F.doc(db, ...p);
const DEFAULTS = ["Sepak Bola", "Futsal", "Voli", "Basket", "Badminton", "Tenis Meja", "Esports"];
A.onAuthStateChanged(auth, async u => {
  if (!u || !(await F.getDoc(dc("admins", u.uid))).exists()) return location.replace("login.html");
  $("#view").innerHTML = `<section class="panel"><h2 style="margin-top:0">PIN aktivasi pengelola</h2><div class="bar"><button class="btn" id="np">Buat PIN baru</button></div><div id="pins"></div></section>
  <section class="panel" style="margin-top:16px"><h2 style="margin-top:0">Kategori olahraga</h2><div class="bar"><input id="sn" placeholder="Nama cabang olahraga" style="max-width:260px"><button class="btn" id="as">Tambah</button><button class="btn sm" id="sd">Isi kategori bawaan</button></div><div id="sps"></div></section>
  <section class="panel" style="margin-top:16px"><h2 style="margin-top:0">Akun pengelola</h2><div id="usr"></div></section>
  <section class="panel" style="margin-top:16px"><h2 style="margin-top:0">Semua turnamen</h2><div id="trn"></div></section>`;
  const list = (el, rows, fn) => { $(el).innerHTML = rows.join("") || '<p class="empty">Kosong.</p>'; $(el).onclick = fn; };
  const load = async () => {
    const [p, s, us, t] = await Promise.all(["pins", "sports", "users", "tournaments"].map(n => F.getDocs(col(n))));
    list("#pins", p.docs.map(d => `<div class="row" style="grid-template-columns:1fr 1fr auto"><b>${d.id}</b><span>${d.data().used ? "Dipakai: " + esc(d.data().usedByName) : "Belum dipakai"}</span><button class="btn bad sm" data-k="pin" data-id="${d.id}">Hapus</button></div>`), act);
    list("#sps", s.docs.map(d => `<div class="row" style="grid-template-columns:1fr auto"><span>${esc(d.data().name)}</span><button class="btn bad sm" data-k="sp" data-id="${d.id}">Hapus</button></div>`), act);
    list("#usr", us.docs.map(d => `<div class="row" style="grid-template-columns:1fr 1fr auto"><b>${esc(d.data().name)}</b><span>@${esc(d.data().username)} &middot; ${d.data().active === false ? "Nonaktif" : "Aktif"}</span><button class="btn sm" data-k="us" data-id="${d.id}" data-v="${d.data().active === false}">${d.data().active === false ? "Aktifkan" : "Nonaktifkan"}</button></div>`), act);
    list("#trn", t.docs.map(d => `<div class="row" style="grid-template-columns:1.4fr 1fr auto auto"><a href="turnamen.html?id=${d.id}"><b>${esc(d.data().name)}</b></a><span>${esc(d.data().ownerName)} &middot; ${STATUS[d.data().status]}</span><button class="btn sm" data-k="bl" data-id="${d.id}" data-v="${!d.data().blocked}">${d.data().blocked ? "Buka blokir" : "Blokir"}</button><button class="btn bad sm" data-k="tr" data-id="${d.id}">Hapus</button></div>`), act);
  };
  const act = async e => {
    const b = e.target.closest("button[data-k]"); if (!b) return;
    const { k, id, v } = b.dataset;
    try {
      if (k === "pin") await F.deleteDoc(dc("pins", id));
      if (k === "sp") await F.deleteDoc(dc("sports", id));
      if (k === "us") await F.updateDoc(dc("users", id), { active: v === "true" });
      if (k === "bl") await F.updateDoc(dc("tournaments", id), { blocked: v === "true", published: v !== "true" });
      if (k === "tr") { if (!confirm("Hapus turnamen ini?")) return; const bt = F.writeBatch(db); for (const n of ["teams", "matches"]) (await F.getDocs(F.collection(db, "tournaments", id, n))).docs.forEach(d => bt.delete(d.ref)); bt.delete(dc("tournaments", id)); await bt.commit(); }
      load();
    } catch { toast("Aksi gagal."); }
  };
  $("#np").onclick = async () => {
    const r = crypto.getRandomValues(new Uint8Array(8)), c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", pin = "ESK-" + [...r].map(x => c[x % c.length]).join("");
    await F.setDoc(dc("pins", pin), { used: false, createdAt: F.serverTimestamp() }); load();
  };
  $("#as").onclick = async () => { const n = $("#sn").value.trim(); if (n.length < 2) return; await F.addDoc(col("sports"), { name: n, order: Date.now() }); $("#sn").value = ""; load(); };
  $("#sd").onclick = async () => { const b = F.writeBatch(db); DEFAULTS.forEach((n, i) => b.set(F.doc(col("sports")), { name: n, order: i })); await b.commit(); load(); };
  $("#out").onclick = () => A.signOut(auth);
  load();
});
