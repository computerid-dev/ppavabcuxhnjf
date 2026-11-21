const mid = (r, i) => `r${r}m${i}`;
export const seeds = n => { let a = [1, 2]; while (a.length < n) a = a.flatMap(x => [x, a.length * 2 + 1 - x]); return a; };

export const parse = (text, set) => {
  const p = String(text).split(",").map(x => x.trim().split("-").map(Number)).filter(x => x.length === 2 && x.every(n => Number.isFinite(n) && n >= 0));
  return set ? p : p.slice(0, 1);
};
export const tally = (sets, set) => set
  ? { sa: sets.filter(s => s[0] > s[1]).length, sb: sets.filter(s => s[1] > s[0]).length }
  : { sa: sets[0][0], sb: sets[0][1] };

const mk = (round, idx, x, y) => ({ round, idx, a: x?.id || null, b: y?.id || null, na: x?.name || "", nb: y?.name || "", sets: [], sa: 0, sb: 0, done: false, bye: false, when: "" });

// Mengisi pemenang match ke slot babak berikutnya, mengembalikan id match tujuan
export const feed = (M, m) => {
  const next = M[mid(m.round + 1, m.idx >> 1)];
  if (!next || !m.done) return null;
  const aWins = m.bye ? !!m.a : m.sa > m.sb, w = aWins ? [m.a, m.na] : [m.b, m.nb], s = m.idx % 2 ? "b" : "a";
  next[s] = w[0]; next["n" + s] = w[1];
  return mid(m.round + 1, m.idx >> 1);
};

export const gen = (teams, format, direct) => {
  const M = {};
  if (format === "roundrobin") {
    let k = 0;
    teams.forEach((x, i) => teams.slice(i + 1).forEach(y => { M["m" + String(++k).padStart(3, "0")] = mk(1, k, x, y); }));
    return M;
  }
  const n = 2 ** Math.ceil(Math.log2(teams.length)), o = direct ? Array.from({ length: n }, (_, i) => i + 1) : seeds(n);
  for (let i = 0; i < n / 2; i++) M[mid(1, i)] = mk(1, i, teams[o[2 * i] - 1], teams[o[2 * i + 1] - 1]);
  for (let r = 2, c = n / 4; c >= 1; r++, c /= 2) for (let i = 0; i < c; i++) M[mid(r, i)] = mk(r, i);
  Object.values(M).filter(m => m.round === 1 && (!m.a || !m.b)).forEach(m => { m.bye = m.done = true; feed(M, m); });
  return M;
};

export const roundName = (r, last) => ["FINAL", "SEMIFINAL", "PEREMPAT FINAL"][last - r] || "BABAK " + r;

export const table = (teams, ms) => {
  const t = {};
  teams.forEach(x => t[x.id] = { id: x.id, logo: x.logo || "", n: x.name, p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, pt: 0 });
  ms.filter(m => m.done && !m.bye && t[m.a] && t[m.b]).forEach(m => {
    const A = t[m.a], B = t[m.b];
    A.p++; B.p++; A.f += m.sa; A.a += m.sb; B.f += m.sb; B.a += m.sa;
    if (m.sa > m.sb) { A.w++; B.l++; A.pt += 3; } else if (m.sa < m.sb) { B.w++; A.l++; B.pt += 3; } else { A.d++; B.d++; A.pt++; B.pt++; }
  });
  return Object.values(t).sort((x, y) => y.pt - x.pt || (y.f - y.a) - (x.f - x.a) || y.f - x.f);
};

export const genGroups = (teams, n) => {
  const L = "ABCDEFGH", M = {}, g = Array.from({ length: n }, () => []);
  teams.forEach((t, i) => { const c = i % n; g[(i / n | 0) % 2 ? n - 1 - c : c].push(t); });
  g.forEach((ts, gi) => {
    let k = 0;
    ts.forEach(t => { t.grp = L[gi]; });
    ts.forEach((x, i) => ts.slice(i + 1).forEach(y => { M[`g${L[gi]}m${String(++k).padStart(2, "0")}`] = { ...mk(1, k, x, y), stage: "grup", grp: L[gi] }; }));
  });
  return M;
};

// Urutan seed babak gugur: juara grup dulu, lalu runner-up (digeser agar tidak bertemu satu grup di awal)
export const knockSeeds = (teams, ms) => {
  const gs = [...new Set(teams.map(t => t.grp))].sort();
  const top = gs.map(G => table(teams.filter(t => t.grp === G), ms.filter(m => m.stage === "grup")).slice(0, 2).map(r => r.id));
  const w = top.map(x => x[0]), r = top.map(x => x[1]), h = r.length > 2 ? Math.floor(r.length / 2) : 0;
  return [...w, ...r.slice(h), ...r.slice(0, h)].map(id => teams.find(t => t.id === id));
};

// Gugur ganda untuk 4/8/16/32 tim. Tiap match menyimpan rute pemenang (nw) dan kalah (nl) "idMatch:slot"
export const genDouble = (teams, direct) => {
  const n = teams.length, k = Math.log2(n), o = direct ? Array.from({ length: n }, (_, i) => i + 1) : seeds(n), M = {};
  const U = (r, i) => `r${r}m${i}`, L = (r, i) => `l${r}m${i}`, sd = i => (i % 2 ? "b" : "a");
  for (let r = 1; r <= k; r++) for (let i = 0; i < n / 2 ** r; i++) M[U(r, i)] = { ...(r === 1 ? mk(1, i, teams[o[2 * i] - 1], teams[o[2 * i + 1] - 1]) : mk(r, i)), stage: "gugur" };
  for (let r = 1; r <= 2 * (k - 1); r++) for (let i = 0; i < n / 2 ** (Math.ceil(r / 2) + 1); i++) M[L(r, i)] = { ...mk(r, i), stage: "lower" };
  M.gf = { ...mk(1, 0), stage: "final" };
  for (let r = 1; r <= k; r++) for (let i = 0; i < n / 2 ** r; i++) {
    const m = M[U(r, i)];
    m.nw = r < k ? `${U(r + 1, i >> 1)}:${sd(i)}` : "gf:a";
    m.nl = r === 1 ? `${L(1, i >> 1)}:${sd(i)}` : `${L(2 * (r - 1), i)}:b`;
  }
  for (let r = 1; r <= 2 * (k - 1); r++) for (let i = 0; i < n / 2 ** (Math.ceil(r / 2) + 1); i++)
    M[L(r, i)].nw = r % 2 ? `${L(r + 1, i)}:a` : r === 2 * (k - 1) ? "gf:b" : `${L(r + 1, i >> 1)}:${sd(i)}`;
  return M;
};

// Mengirim pemenang/kalah ke match tujuan, mengembalikan id match yang berubah
export const route = (M, m) => {
  const w = m.sa > m.sb, put = (ref, id, name) => { const [k, s] = ref.split(":"); M[k][s] = id; M[k]["n" + s] = name; return k; };
  return [m.nw && put(m.nw, w ? m.a : m.b, w ? m.na : m.nb), m.nl && put(m.nl, w ? m.b : m.a, w ? m.nb : m.na)].filter(Boolean);
};

// Firestore menolak array di dalam array, jadi skor set disimpan sebagai teks "25-20" dan dibaca kembali menjadi [25, 20]
export const pack = m => ({ ...m, sets: (m.sets || []).map(x => (Array.isArray(x) ? x.join("-") : x)) });
export const unpack = m => ({ ...m, sets: (m.sets || []).map(x => (Array.isArray(x) ? x : String(x).split("-").map(Number))) });

// ===== Bagan alur (eliminasi) untuk laporan PDF =====
export const BX = { W: 168, H: 55, HH: 17, RH: 19, GX: 28, VG: 9, SC: 26 };

// Menghitung posisi kotak & garis penghubung bagan. title(m) = judul kotak, num = Map(_id -> nomor pertandingan)
export const bracketLayout = (ms, fmt, title, num) => {
  const { W, H, GX, VG } = BX, ko = ms.filter(m => m.stage !== "grup");
  if (!ko.length) return null;
  const src = {};
  ko.forEach(m => { const n = num.get(m._id); if (!n) return; if (m.nw) src[m.nw] = "Pemenang P" + n; if (m.nl) src[m.nl] = "Kalah P" + n; });
  if (fmt !== "double") ko.forEach(m => { const n = num.get(m._id), nx = ko.find(x => x.round === m.round + 1 && x.idx === m.idx >> 1); if (n && nx) src[nx._id + ":" + (m.idx % 2 ? "b" : "a")] = "Pemenang P" + n; });
  const boxes = [], lines = [], chips = [];
  const mkBox = (m, x, y) => {
    const row = s => {
      const name = s ? m.nb : m.na, slot = m._id + ":" + (s ? "b" : "a");
      return { id: s ? m.b : m.a, name: name || src[slot] || (m.bye ? "BYE" : "TBD"), ph: !name, win: !!name && m.done && (m.bye || (s ? m.sb > m.sa : m.sa > m.sb)), score: m.done && !m.bye ? String(s ? m.sb : m.sa) : "-" };
    };
    return { x, y, head: m.bye ? "BYE" : title(m), rows: [row(0), row(1)] };
  };
  const join = (p, q) => { const x1 = p.x + W, y1 = p.y + H / 2, xm = x1 + GX / 2; lines.push([[x1, y1], [xm, y1], [xm, q.y + H / 2], [q.x, q.y + H / 2]]); };
  const stage = (a, y0) => {
    const rs = [...new Set(a.map(m => m.round))].sort((p, q) => p - q), pos = new Map();
    const cols = rs.map(r => a.filter(m => m.round === r).sort((p, q) => p.idx - q.idx));
    cols.forEach((col, c) => col.forEach((m, k) => {
      let y;
      if (!c) y = y0 + k * (H + VG);
      else { const pv = cols[c - 1], f = pv.length === col.length ? [pv[k]] : pv.slice(2 * k, 2 * k + 2); y = f.map(p => pos.get(p).y).reduce((s, v) => s + v, 0) / f.length; }
      pos.set(m, { x: c * (W + GX), y });
    }));
    cols.forEach((col, c) => col.forEach((m, k) => { const nx = cols[c + 1]; if (nx) join(pos.get(m), pos.get(nx[nx.length === col.length ? k : k >> 1])); }));
    cols.flat().forEach(m => boxes.push(mkBox(m, pos.get(m).x, pos.get(m).y)));
    return { pos, cols, last: cols[cols.length - 1]?.[0] };
  };
  const champOf = f => (f && f.done && !f.bye ? (f.sa > f.sb ? { id: f.a, name: f.na } : { id: f.b, name: f.nb }) : null);
  let champ, fin;
  if (fmt !== "double") {
    const S = stage(ko, 0), p = S.pos.get(S.last);
    fin = S.last;
    champ = { x: S.cols.length * (W + GX), y: p.y };
    join(p, champ);
  } else {
    const up = ko.filter(m => m.stage === "gugur"), lo = ko.filter(m => m.stage === "lower");
    fin = ko.find(m => m.stage === "final");
    const U = stage(up, 26), ub = Math.max(...[...U.pos.values()].map(p => p.y)) + H, uf = U.pos.get(U.last);
    chips.push({ text: "UPPER BRACKET", x: 0, y: 0 });
    let lf = null, lc = 0;
    if (lo.length) { chips.push({ text: "LOWER BRACKET", x: 0, y: ub + 14 }); const L = stage(lo, ub + 40); lf = L.pos.get(L.last); lc = L.cols.length; }
    const cols = Math.max(U.cols.length, lc), g = { x: cols * (W + GX), y: (uf.y + (lf ? lf.y : uf.y)) / 2 };
    join(uf, g); if (lf) join(lf, g);
    boxes.push(mkBox(fin, g.x, g.y));
    champ = { x: g.x + W + GX, y: g.y };
    join(g, champ);
  }
  const c = champOf(fin);
  champ.name = c ? c.name : ""; champ.id = c ? c.id : null;
  const w = champ.x + W, h = Math.max(...boxes.map(b => b.y), champ.y) + H;
  return { boxes, lines, chips, champ, w, h };
};

// Menggambar bagan sebagai SVG (pm: "plain" atau "logo")
export const bracketSvg = (lay, pm, L = {}, style = "") => {
  const { W, H, HH, RH, SC } = BX, logo = pm === "logo", hd = logo ? "#10245a" : "#111111", ff = "Segoe UI,Roboto,Arial,sans-serif";
  const e = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const box = b => {
    const rows = b.rows.map((r, i) => {
      const top = HH + i * RH, x0 = logo && L[r.id] ? 24 : 6, n = Math.floor((W - SC - x0 - 4) / 5.2);
      return (logo && L[r.id] ? `<image href="${e(L[r.id])}" x="4" y="${top + 1.5}" width="16" height="16" preserveAspectRatio="xMidYMid slice"/>` : "")
        + `<text x="${x0}" y="${top + RH / 2 + 3.4}" font-size="10" fill="${r.ph ? "#666" : "#111"}" font-style="${r.ph ? "italic" : "normal"}" font-weight="${r.win ? 700 : 400}">${e(cut(r.name, n))}</text>`
        + `<text x="${W - SC / 2}" y="${top + RH / 2 + 4}" font-size="11" font-weight="700" text-anchor="middle" fill="${logo ? "#fff" : "#111"}">${e(r.score)}</text>`;
    }).join("");
    return `<g transform="translate(${b.x},${b.y})"><rect width="${W}" height="${H}" rx="4" fill="#fff" stroke="${hd}" stroke-width="1.4"/>`
      + `<path d="M0 4Q0 0 4 0H${W - 4}Q${W} 0 ${W} 4V${HH}H0Z" fill="${hd}"/>`
      + `<text x="${W / 2}" y="${HH / 2 + 3.2}" font-size="9" font-weight="700" text-anchor="middle" fill="#fff">${e(cut(b.head, 30))}</text>`
      + `<rect x="${W - SC}" y="${HH}" width="${SC}" height="${2 * RH}" fill="${logo ? "#10245a" : "#fff"}"/>`
      + `<line x1="0" y1="${HH + RH}" x2="${W}" y2="${HH + RH}" stroke="${logo ? "#fff" : "#999"}" stroke-width=".6" clip-path="none"/>`
      + `<line x1="${W - SC}" y1="${HH}" x2="${W - SC}" y2="${H}" stroke="#999" stroke-width=".6"/>${rows}</g>`;
  };
  const c = lay.champ, cb = `<g transform="translate(${c.x},${c.y})"><rect width="${W}" height="${H}" rx="4" fill="#fff" stroke="${hd}" stroke-width="1.4"/><path d="M0 4Q0 0 4 0H${W - 4}Q${W} 0 ${W} 4V${HH}H0Z" fill="${hd}"/><text x="${W / 2}" y="${HH / 2 + 3.4}" font-size="10" font-weight="700" text-anchor="middle" fill="#fff" letter-spacing="2">JUARA</text>${c.id && logo && L[c.id] ? `<image href="${e(L[c.id])}" x="8" y="${HH + 10}" width="22" height="22" preserveAspectRatio="xMidYMid slice"/>` : ""}<text x="${c.id && logo && L[c.id] ? 38 : W / 2}" y="${HH + 25}" font-size="12" font-weight="700" text-anchor="${c.id && logo && L[c.id] ? "start" : "middle"}" fill="#111">${e(cut(c.name, 18))}</text></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${lay.w + 4} ${lay.h + 4}" preserveAspectRatio="xMidYMin meet" font-family="${ff}" style="${style}">`
    + lay.lines.map(l => `<polyline points="${l.map(p => p.join(",")).join(" ")}" fill="none" stroke="#111" stroke-width="1.5"/>`).join("")
    + lay.chips.map(k => `<rect x="${k.x}" y="${k.y}" width="190" height="20" rx="4" fill="${hd}"/><text x="${k.x + 10}" y="${k.y + 14}" font-size="10.5" font-weight="700" fill="#fff">${e(k.text)}</text>`).join("")
    + lay.boxes.map(box).join("") + cb + "</svg>";
};
