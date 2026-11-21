import { auth, db, A, F, $, esc, head, toast, klas, enhance, shrink, bracketHtml, STATUS } from "./fb.js";
import { pack, unpack, gen, genGroups, genDouble, route, knockSeeds, parse, tally, feed } from "./bracket.js";
import { MODE } from "./mode.js?v=2";
head();
let rows = [], uid, me, sports = [], cur = null, ms = {}, unsub = null;
const col = (...p) => F.collection(db, ...p), dc = (...p) => F.doc(db, ...p);

A.onAuthStateChanged(auth, async u => {
  if (!u) return location.replace("login.html");
  uid = u.uid;
  if ((await F.getDoc(dc("admins", uid))).exists()) return location.replace("admin.html");
  const s = await F.getDoc(dc("users", uid));
  if (!s.exists() || s.data().active === false) { await A.signOut(auth); return location.replace("login.html"); }
  me = s.data(); $("#who").textContent = me.name + " · v10";
  sports = (await F.getDocs(col("sports"))).docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
  home();
});
$("#out").onclick = () => A.signOut(auth);

const home = async () => {
  unsub?.(); cur = null;
  $("#view").innerHTML = `<section class="panel"><h2 style="margin-top:0">Buat turnamen</h2><form id="cf" class="form" novalidate>
  <div><label for="tn">Nama turnamen</label><input id="tn" maxlength="80"></div>
  <div><label for="ts">Cabang olahraga</label><select id="ts">${sports.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></div>
  <div><label for="tl">Lokasi</label><input id="tl" maxlength="80"></div><div><label for="td">Tanggal mulai</label><input id="td" type="date"></div>
  <div><label for="tf">Format</label><select id="tf"><option value="single">Gugur (single elimination)</option><option value="roundrobin">Liga (round robin)</option><option value="group">Grup lalu gugur</option><option value="double">Gugur ganda (upper &amp; lower bracket)</option></select></div>
  <div><label for="tg">Jumlah grup (format grup)</label><select id="tg">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<option>${n}</option>`).join("")}</select></div>
  <div><label for="tc">Sistem skor</label><select id="tc"><option value="set">Per set (voli, badminton, tenis)</option><option value="skor">Skor akhir (bola, futsal, basket)</option></select></div>
  <div><label for="tb">Best of (jumlah set)</label><select id="tb">${[1, 3, 5, 7].map(n => `<option value="${n}"${n === 3 ? " selected" : ""}>Best of ${n} (${n} set maks.)</option>`).join("")}</select></div>
  <div class="full"><label>Daftar tim (gugur maks 64, liga 16, grup 32, gugur ganda 4/8/16/32)</label><div id="rows"></div><div class="bar"><button class="btn sm" type="button" id="addt">+ Tambah tim</button><span class="badge" id="cnt"></span></div></div>
  <div class="full"><button class="btn" type="submit">Buat turnamen</button></div></form></section><h2>Turnamen saya</h2><div class="grid" id="mine"></div>`;
  const q = await F.getDocs(F.query(col("tournaments"), F.where("ownerId", "==", uid)));
  $("#mine").innerHTML = q.docs.map(d => { const t = d.data(); return `<div class="panel"><span class="badge ${t.status}">${STATUS[t.status]}</span>${t.blocked ? ' <span class="badge">Diblokir admin</span>' : ""}<h3>${esc(t.name)}</h3><p class="lead">${esc(MODE[t.format] || "")}</p><div class="bar" style="margin:8px 0 0"><button class="btn sm" data-id="${d.id}">Kelola</button> <a class="btn sm" href="turnamen.html?id=${d.id}">Lihat publik</a></div><div class="bar" style="margin:8px 0 0"><a class="btn sm" href="turnamen.html?id=${d.id}&print=1" target="_blank" rel="noopener">Cetak PDF</a> <a class="btn sm" href="turnamen.html?id=${d.id}&print=logo" target="_blank" rel="noopener">Cetak + logo</a> <a class="btn sm" href="turnamen.html?id=${d.id}&dl=plain" target="_blank" rel="noopener">Unduh PDF</a> <a class="btn sm" href="turnamen.html?id=${d.id}&dl=logo" target="_blank" rel="noopener">Unduh + logo</a></div></div>`; }).join("") || '<p class="empty">Belum ada turnamen.</p>';
  $("#mine").onclick = e => { const b = e.target.closest("button[data-id]"); if (b) manage(b.dataset.id); };
  $("#cf").onsubmit = create;
  rows = Array.from({ length: 4 }, () => ({ name: "", logo: "" }));
  drawRows();
  $("#addt").onclick = () => { if (rows.length < 64) { rows.push({ name: "", logo: "" }); drawRows(); } };
  $("#rows").oninput = e => { if (e.target.classList.contains("tn")) { rows[e.target.closest(".trow").dataset.i].name = e.target.value; count(); } };
  $("#rows").onclick = e => { if (e.target.closest(".rm") && rows.length > 2) { rows.splice(e.target.closest(".trow").dataset.i, 1); drawRows(); } };
  $("#rows").onchange = async e => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!f.type.startsWith("image/") || f.size > 5e6) return toast("Pilih file gambar maksimal 5 MB.");
    try { rows[e.target.closest(".trow").dataset.i].logo = await shrink(f); drawRows(); } catch { toast("Gambar tidak bisa dibaca."); }
  };
  enhance($("#view"));
};

const count = () => { $("#cnt").textContent = rows.filter(r => r.name.trim()).length + " tim"; };
const drawRows = () => {
  $("#rows").innerHTML = rows.map((r, i) => `<div class="trow" data-i="${i}"><label class="lgb" title="Upload logo tim">${r.logo ? `<img src="${r.logo}" alt="Logo">` : "+"}<input type="file" accept="image/*" hidden></label><input class="tn" placeholder="Nama tim ${i + 1}" maxlength="40" value="${esc(r.name)}"><button type="button" class="btn bad sm rm" aria-label="Hapus tim">&times;</button></div>`).join("");
  count();
};

const create = async e => {
  e.preventDefault();
  const name = $("#tn").value.trim(), format = $("#tf").value;
  const seen = new Set();
  const names = rows.map(r => ({ name: r.name.trim(), logo: r.logo })).filter(r => r.name && !seen.has(r.name.toLowerCase()) && seen.add(r.name.toLowerCase()));
  if (name.length < 3) return toast("Nama turnamen minimal 3 karakter.");
  if (names.length < 2 || names.length > ({ single: 64, group: 32, double: 32 }[format] || 16) || (format === "group" && names.length < +$("#tg").value * 2)) return toast("Jumlah tim tidak sesuai batas.");
  if (format === "double" && (names.length < 4 || names.length & (names.length - 1))) return toast("Gugur ganda: jumlah tim harus 4, 8, 16, atau 32.");
  const sp = sports.find(s => s.id === $("#ts").value);
  if (!sp) return toast("Pilih cabang olahraga (admin harus menambahkannya dulu).");
  const tr = F.doc(col("tournaments")), ts = names.map((n, i) => ({ id: "t" + i, name: n.name, logo: n.logo })), b = F.writeBatch(db);
  const M = format === "group" ? genGroups(ts, +$("#tg").value) : format === "double" ? genDouble(ts) : gen(ts, format);
  b.set(tr, { ownerId: uid, ownerName: me.name, name, sportId: sp.id, sportName: sp.name, location: $("#tl").value.trim(), date: $("#td").value, format, scoring: $("#tc").value, bestOf: +$("#tb").value, status: "akan_datang", published: true, blocked: false, createdAt: F.serverTimestamp() });
  ts.forEach(t => b.set(F.doc(tr, "teams", t.id), { name: t.name, grp: t.grp || "", logo: t.logo || "" }));
  Object.entries(M).forEach(([k, m]) => b.set(F.doc(tr, "matches", k), pack(m)));
  try { await b.commit(); toast("Turnamen dibuat."); manage(tr.id); } catch (x) { toast("Gagal membuat turnamen: " + (x.code || x.message)); }
};

const manage = async id => {
  const s = await F.getDoc(dc("tournaments", id));
  if (!s.exists()) return home();
  cur = { id, ...s.data() };
  const set = cur.scoring === "set", rr = cur.format === "roundrobin", grp = cur.format === "group";
  const ko = m => !rr && m.stage !== "grup";
  const so = m => ({ grup: 0, gugur: 1, lower: 2, final: 3 }[m.stage] ?? 1);
  const lbl = m => m.grp ? "Grup " + m.grp : m.stage === "final" ? "Grand Final" : m.stage === "lower" ? "Lower R" + m.round : cur.format === "double" ? "Upper R" + m.round : ko(m) ? "Babak " + m.round : "Match";
  const teams = (await F.getDocs(col("tournaments", id, "teams"))).docs.map(d => ({ id: d.id, ...d.data() }));
  const LG = Object.fromEntries(teams.map(t => [t.id, t.logo || ""]));
  const nn = () => set ? (cur.bestOf || 3) : 1, BO = () => set ? (cur.bestOf || 3) : 0;
  const recalc = r => {
    const p = [];
    r.querySelectorAll(".ia").forEach((x, i) => { const y = r.querySelector(`.ib[data-i="${i}"]`); if (x.value !== "" && y.value !== "") p.push([+x.value, +y.value]); });
    const t = p.length ? tally(p, set) : null, [ta, tb] = r.querySelectorAll(".tt");
    ta.textContent = t ? t.sa : "–"; tb.textContent = t ? t.sb : "–";
  };
  const read = r => {
    const out = [];
    for (let i = 0; i < nn(); i++) {
      const x = r.querySelector(`.ia[data-i="${i}"]`).value, y = r.querySelector(`.ib[data-i="${i}"]`).value;
      if (x === "" && y === "") continue;
      if (x === "" || y === "") return null;
      out.push(`${x}-${y}`);
    }
    return out.join(",");
  };
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // Susunan slot babak awal: pasangan (2i, 2i+1); tim BYE ditaruh di pasangan paling awal
  const slots = (t, n) => { const x = [...t], by = n - x.length, s = []; for (let i = 0; i < n / 2; i++) s.push(x.shift(), i < by ? null : x.shift()); return s; };
  const rebuild = async order => {
    const M = grp ? genGroups(order, new Set(teams.map(t => t.grp)).size) : cur.format === "double" ? genDouble(order, true) : gen(order, "single", true);
    const b = F.writeBatch(db);
    Object.keys(ms).forEach(k => b.delete(dc("tournaments", id, "matches", k)));
    Object.entries(M).forEach(([k, m]) => b.set(dc("tournaments", id, "matches", k), pack(m)));
    if (grp) order.forEach(o => { teams.find(t => t.id === o.id).grp = o.grp; b.update(dc("tournaments", id, "teams", o.id), { grp: o.grp }); });
    try { await b.commit(); toast("Undian disimpan."); } catch (x) { toast("Gagal: " + (x.code || x.message)); }
  };
  let loaded = false;
  let tab = "hasil";
  $("#view").innerHTML = `<button class="btn sm" id="back">&larr; Kembali</button><h2>${esc(cur.name)}</h2><div class="tabs" id="tb">${[["hasil", "Atur Hasil"], ["jadwal", "Jadwal"], ["klas", "Klasemen"], ["babak", "Babak"], ["set", "Pengaturan"]].map(([k, v], i) => `<button data-t="${k}" class="${i ? "" : "on"}">${v}</button>`).join("")}</div><div id="pn"></div>`;
  $("#back").onclick = home;
  const paint = () => {
    const all = Object.entries(ms), vals = Object.values(ms);
    let h = "";
    if (tab === "hasil") {
      const rows = all.filter(([, m]) => !m.bye).sort((a, b) => so(a[1]) - so(b[1]) || a[1].round - b[1].round || a[1].idx - b[1].idx);
      const row = (m, side, name, id, total) => `<div class="sr"><b>${LG[id] ? `<img class="lg" src="${esc(LG[id])}" alt="">` : ""}${esc(name || "TBD")}</b>${Array.from({ length: nn() }, (_, i) => `<input class="i${side ? "b" : "a"}" data-i="${i}" type="number" min="0" inputmode="numeric" aria-label="Skor ${set ? "set " + (i + 1) : "akhir"}" value="${m.sets[i]?.[side] ?? ""}">`).join("")}<em class="tt">${m.done ? total : "–"}</em></div>`;
      const heads = `<div class="sbc"><span></span>${Array.from({ length: nn() }, (_, i) => `<span class="sh">${set ? "Set " + (i + 1) : "Skor"}</span>`).join("")}<span></span></div>`;
      h = `<p class="lead">${set ? `Isi skor tiap set di kolom Set 1 sampai Set ${nn()}, kosongkan set yang tidak dimainkan.` : "Isi skor akhir kedua tim."} Total terhitung otomatis. Kosongkan semua untuk menghapus hasil.</p>${rows.map(([k, m]) => `<div class="sb" data-k="${k}" style="--n:${nn()}"><div class="sbh">${lbl(m)}</div><div class="sbm">${heads}${row(m, 0, m.na, m.a, m.sa)}${row(m, 1, m.nb, m.b, m.sb)}</div><div class="sbf"><input class="wh" aria-label="Jadwal" placeholder="Jadwal / tempat" value="${esc(m.when)}"><button class="btn sm">Simpan</button></div></div>`).join("") || `<p class="empty">${loaded ? "Tidak ada pertandingan." : "Memuat..."}</p>`}`;
    }
    if (tab === "jadwal") {
      const r1 = vals.filter(m => m.round === 1 && (m.stage === "gugur" || (!m.stage && !rr))).sort((a, b) => a.idx - b.idx);
      const opts = v => `<option value="">BYE / kosong</option>${teams.map(t => `<option value="${t.id}"${t.id === v ? " selected" : ""}>${esc(t.name)}</option>`).join("")}`;
      h = `<div class="panel"><h3>Undian lawan</h3>${rr ? '<p class="lead">Format liga: semua tim saling bertemu, tidak perlu undian.</p>' : `<p class="lead">${grp ? "Acak untuk membagi tim ke grup secara acak." : "Acak untuk mengundi siapa melawan siapa, atau atur sendiri di bawah."} Jika sudah ada hasil, semua skor akan dihapus (ada konfirmasi dulu).</p><div class="bar"><button class="btn" id="rnd">Acak undian</button></div>${grp ? "" : `<div id="pairs">${r1.map((m, i) => `<div class="trow"><span class="badge">${i + 1}</span><select class="ps">${opts(m.a)}</select><span>vs</span><select class="ps">${opts(m.b)}</select></div>`).join("")}</div><button class="btn sm" id="sp">Simpan susunan</button>`}`}</div>
      <div class="panel" style="margin-top:16px"><h3>Jadwal waktu &amp; tempat</h3><div class="form"><div><label for="wd">Tanggal mulai</label><input id="wd" type="date"></div><div><label for="ws">Jam mulai</label><input id="ws" type="time" value="08:00"></div><div><label for="we">Jam selesai per hari</label><input id="we" type="time" value="17:00"></div><div><label for="wm">Durasi laga (menit)</label><input id="wm" type="number" value="60" min="10"></div><div><label for="wj">Jeda antar laga (menit)</label><input id="wj" type="number" value="10" min="0"></div><div><label for="wl">Jumlah lapangan</label><input id="wl" type="number" value="1" min="1" max="20"></div><div class="full"><label for="wp">Nama tempat / lapangan</label><input id="wp" value="Lapangan"></div></div><div class="bar"><button class="btn" id="aw">Susun jadwal waktu</button><button class="btn bad sm" id="cw">Kosongkan jadwal</button></div><p class="lead">Jadwal tiap pertandingan tetap bisa diedit satu per satu di tab Atur Hasil.</p></div>`;
    }
    if (tab === "klas") h = rr || grp ? klas(teams, vals.filter(m => m.stage === "grup" || rr)) : '<p class="empty">Format gugur tidak memakai klasemen. Lihat bracket di halaman publik.</p>';
    if (tab === "babak") {
      const gm = vals.filter(m => m.stage === "grup"), made = vals.some(m => m.stage === "gugur");
      h = `<div class="panel">${grp ? `<p class="lead">Fase 1: grup (${gm.filter(m => m.done).length}/${gm.length} laga selesai). Fase 2: babak gugur, diisi 2 teratas tiap grup.</p>${made ? "<p>Babak gugur sudah dibuat. Atur hasilnya di tab Atur Hasil.</p>" : `<button class="btn" id="kb"${gm.every(m => m.done) ? "" : " disabled"}>Buat babak gugur</button>`}` : `<p class="lead">Format turnamen ini: ${rr ? "liga (round robin), semua tim saling bertemu." : cur.format === "double" ? "gugur ganda. Kalah sekali pindah ke lower bracket, kalah dua kali tersingkir. Juara upper dan juara lower bertemu di Grand Final." : "gugur langsung (single elimination), pemenang otomatis maju."}</p>`}</div>${rr ? "" : bracketHtml(vals, cur.format, BO(), LG)}`;
    }
    if (tab === "set") h = `<div class="panel"><div class="bar">${set ? `<select id="bo">${[1, 3, 5, 7].map(n => `<option value="${n}"${n === BO() ? " selected" : ""}>Best of ${n}</option>`).join("")}</select>` : ""}<select id="st">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${k === cur.status ? " selected" : ""}>${v}</option>`).join("")}</select><label style="margin:0"><input type="checkbox" id="pub" style="width:auto"${cur.published ? " checked" : ""}${cur.blocked ? " disabled" : ""}> Tampil di beranda</label><a class="btn sm" href="turnamen.html?id=${id}&print=1" target="_blank" rel="noopener">Cetak PDF polos</a><a class="btn sm" href="turnamen.html?id=${id}&print=logo" target="_blank" rel="noopener">Cetak PDF + logo</a><a class="btn sm" href="turnamen.html?id=${id}&dl=plain" target="_blank" rel="noopener">Unduh PDF polos</a><a class="btn sm" href="turnamen.html?id=${id}&dl=logo" target="_blank" rel="noopener">Unduh PDF + logo</a><button class="btn bad sm" id="del">Hapus turnamen</button></div></div>`;
    $("#pn").innerHTML = h;
    enhance($("#pn"));
  };
  $("#tb").onclick = e => { const b = e.target.closest("button"); if (!b) return; tab = b.dataset.t; document.querySelectorAll("#tb button").forEach(x => x.classList.toggle("on", x === b)); paint(); };
  unsub?.();
  unsub = F.onSnapshot(col("tournaments", id, "matches"), snap => { ms = Object.fromEntries(snap.docs.map(d => [d.id, unpack(d.data())])); loaded = true; if (!$("#pn").contains(document.activeElement) || document.activeElement.tagName === "BUTTON") paint(); });
  $("#pn").oninput = e => { if (e.target.matches(".ia,.ib")) recalc(e.target.closest(".sb")); };
  $("#pn").onchange = e => {
    if (e.target.id === "st") F.updateDoc(dc("tournaments", id), { status: e.target.value }).then(() => toast("Status disimpan."));
    if (e.target.id === "bo") { cur.bestOf = +e.target.value; F.updateDoc(dc("tournaments", id), { bestOf: cur.bestOf }).then(() => { toast("Best of disimpan."); paint(); }); }
    if (e.target.id === "pub") F.updateDoc(dc("tournaments", id), { published: e.target.checked });
  };
  $("#pn").onclick = e => onPn(e).catch(x => { console.error(x); toast("Gagal: " + (x.code || x.message)); });
  const onPn = async e => {
    const bt = e.target.closest("button"); if (!bt) return;
    if (bt.id === "del") {
      if (!confirm("Hapus turnamen ini beserta semua datanya?")) return;
      const b = F.writeBatch(db);
      for (const n of ["teams", "matches"]) (await F.getDocs(col("tournaments", id, n))).docs.forEach(d => b.delete(d.ref));
      b.delete(dc("tournaments", id)); await b.commit(); return home();
    }
    if (bt.id === "kb") {
      const M = gen(knockSeeds(teams, Object.values(ms)), "single"), b = F.writeBatch(db);
      Object.entries(M).forEach(([k, m]) => { m.stage = "gugur"; b.set(dc("tournaments", id, "matches", k), pack(m)); });
      try { await b.commit(); toast("Babak gugur dibuat."); } catch { toast("Gagal membuat babak gugur."); }
      return;
    }
    if (bt.id === "rnd" || bt.id === "sp") {
      if (Object.values(ms).some(m => m.done && !m.bye) && !confirm("Sudah ada hasil pertandingan. Mengacak/menyusun ulang undian akan MENGHAPUS semua skor. Lanjutkan?")) return;
      const n = 2 ** Math.ceil(Math.log2(teams.length));
      if (grp) return rebuild(shuffle(teams).map(t => ({ id: t.id, name: t.name })));
      if (bt.id === "rnd") return rebuild(slots(shuffle(teams), n));
      const v = [...$("#pn").querySelectorAll("select.ps")].map(x => x.value), used = v.filter(Boolean);
      if (new Set(used).size !== teams.length || used.length !== teams.length) return toast("Setiap tim harus dipilih tepat satu kali.");
      if (v.some((x, i) => !x && !v[i ^ 1]) || (cur.format === "double" && v.some(x => !x))) return toast("Slot kosong (BYE) tidak valid untuk susunan ini.");
      return rebuild(v.map(x => teams.find(t => t.id === x) || null));
    }
    if (bt.id === "aw" || bt.id === "cw") {
      const b = F.writeBatch(db), list = Object.entries(ms).filter(([, m]) => !m.bye).sort((x, y) => so(x[1]) - so(y[1]) || x[1].round - y[1].round || x[1].idx - y[1].idx);
      const ref = k => dc("tournaments", id, "matches", k);
      if (bt.id === "cw") list.forEach(([k]) => b.update(ref(k), { when: "" }));
      else {
        const g = i => $("#" + i).value, tm = v => { const [h, m] = v.split(":"); return h * 60 + +m; };
        const s0 = tm(g("ws") || "08:00"), e0 = tm(g("we") || "17:00"), du = +g("wm"), ja = +g("wj") || 0, nl = Math.max(1, +g("wl") || 1), per = Math.floor((e0 - s0 + ja) / (du + ja));
        if (!g("wd") || !(du > 0) || per < 1) return toast("Isi tanggal, durasi, dan jam dengan benar.");
        list.forEach(([k], i) => {
          const si = Math.floor(i / nl), t = s0 + (si % per) * (du + ja), day = new Date(g("wd") + "T00:00");
          day.setDate(day.getDate() + Math.floor(si / per));
          const hh = String(t / 60 | 0).padStart(2, "0"), mm = String(t % 60).padStart(2, "0");
          b.update(ref(k), { when: `${day.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })} ${hh}.${mm} - ${g("wp") || "Lapangan"} ${i % nl + 1}` });
        });
      }
      try { await b.commit(); toast("Jadwal disimpan."); } catch { toast("Gagal menyimpan jadwal."); }
      return;
    }
    const r = bt.closest(".sb"); if (!r) return;
    const k = r.dataset.k, m = { ...ms[k] };
    if (!m.a || !m.b) return toast("Tim belum lengkap, menunggu babak sebelumnya.");
    const raw = read(r);
    if (raw === null) return toast("Isi skor kedua tim pada set yang sama.");
    const sets = parse(raw, set);
    if (raw.trim() && !sets.length) return toast("Format skor tidak valid.");
    if (set && sets.length) {
      const bo = BO(), need = Math.ceil(bo / 2), t = tally(sets, true);
      if (sets.length > bo || Math.max(t.sa, t.sb) !== need || Math.min(t.sa, t.sb) >= need) return toast(`Best of ${bo}: pemenang cukup ${need} set. Kosongkan set sisanya, atau ubah Best of di tab Pengaturan.`);
    }
    Object.assign(m, { sets, when: r.querySelector(".wh").value.trim(), done: sets.length > 0 });
    if (m.done) Object.assign(m, tally(sets, set)); else Object.assign(m, { sa: 0, sb: 0 });
    if (m.done && ko(m) && m.sa === m.sb) return toast("Pertandingan gugur harus ada pemenang.");
    const M = { ...ms, [k]: m }, to = !ko(m) || !m.done ? [] : m.nw ? route(M, m) : [feed(M, m)].filter(Boolean);
    if (to.some(t => ms[t]?.done)) return toast("Pertandingan berikutnya sudah selesai, tidak bisa diubah.");
    const b = F.writeBatch(db);
    b.set(dc("tournaments", id, "matches", k), pack(m));
    to.forEach(t => b.set(dc("tournaments", id, "matches", t), pack(M[t])));
    try { await b.commit(); toast("Tersimpan."); } catch { toast("Gagal menyimpan."); }
  };
  paint();
};
