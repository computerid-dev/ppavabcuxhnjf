import { BX } from "./bracket.js?v=2";

// Pembuat PDF vektor (teks bisa dipilih, ukuran file kecil) memakai pdf-lib. Dipakai tombol "Unduh PDF".
const A4 = [595.28, 841.89];

export async function buildPdf(m, o = {}) {
  const { PDFDocument, StandardFonts, rgb } = o.lib || globalThis.PDFLib;
  const doc = await PDFDocument.create();
  doc.setTitle(m.name + " - Jadwal & Hasil"); doc.setCreator("ESPORTKU"); doc.setProducer("ESPORTKU");
  const f = await doc.embedFont(StandardFonts.Helvetica), fb = await doc.embedFont(StandardFonts.HelveticaBold), fi = await doc.embedFont(StandardFonts.HelveticaOblique), fbi = await doc.embedFont(StandardFonts.HelveticaBoldOblique);
  const col = h => rgb(...[1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255));
  const logoMode = m.pm === "logo", NAVY = "#10245a", INK = "#111111";

  // Teks dibersihkan: karakter di luar WinAnsi (emoji, aksara lain) diganti "?"
  const okc = new Map();
  const san = s => Array.from(String(s ?? "").replace(/\s+/g, " ")).map(c => { if (!okc.has(c)) { let v = c; try { f.encodeText(c); } catch { v = "?"; } okc.set(c, v); } return okc.get(c); }).join("");
  const wd = (s, size, font = f) => font.widthOfTextAtSize(s, size);
  const fit = (s, size, max, font = f) => { s = san(s); if (wd(s, size, font) <= max) return s; while (s.length > 1 && wd(s + "...", size, font) > max) s = s.slice(0, -1); return s + "..."; };

  // Logo tim (webp/png dari data URI) diubah ke PNG lalu disematkan
  const toPng = o.toPng || (url => new Promise((ok, no) => {
    const im = new Image();
    im.onload = () => { const c = document.createElement("canvas"); c.width = im.naturalWidth || 96; c.height = im.naturalHeight || 96; c.getContext("2d").drawImage(im, 0, 0); ok(Uint8Array.from(atob(c.toDataURL("image/png").split(",")[1]), ch => ch.charCodeAt(0))); };
    im.onerror = no; im.src = url;
  }));
  const ready = new Map();
  if (logoMode) await Promise.all([...new Set(Object.values(m.logos || {}).filter(Boolean))].map(async u => { try { ready.set(u, await doc.embedPng(await toPng(u))); } catch { ready.set(u, null); } }));
  const lgu = url => (url && ready.get(url)) || null, lg = id => lgu((m.logos || {})[id]);

  const mkCtx = (pg, W, H) => ({
    W, H,
    rect(x, y, w, h, fill, stroke, lw = .8) { pg.drawRectangle({ x, y: H - y - h, width: w, height: h, color: fill ? col(fill) : undefined, borderColor: stroke ? col(stroke) : undefined, borderWidth: stroke ? lw : 0 }); },
    rr(x, y, w, h, r, fill, stroke, lw = .8) {
      const p = `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
      pg.drawSvgPath(p, { x, y: H - y, color: fill ? col(fill) : undefined, borderColor: stroke ? col(stroke) : undefined, borderWidth: stroke ? lw : 0 });
    },
    ln(x1, y1, x2, y2, c = "#999999", lw = .6) { pg.drawLine({ start: { x: x1, y: H - y1 }, end: { x: x2, y: H - y2 }, thickness: lw, color: col(c) }); },
    tx(s, x, y, size, op = {}) {
      const font = op.font || f; s = op.max ? fit(s, size, op.max, font) : san(s);
      const w = wd(s, size, font), px = op.al === "c" ? x + (op.w - w) / 2 : op.al === "r" ? x + op.w - w : x;
      pg.drawText(s, { x: px, y: H - y - size * .78, size, font, color: col(op.c || INK) });
    },
    im(img, x, y, w, h) { if (img) pg.drawImage(img, { x, y: H - y - h, width: w, height: h }); }
  });
  const addPage = land => { const [w, h] = land ? [A4[1], A4[0]] : A4; return mkCtx(doc.addPage([w, h]), w, h); };

  // ===== Halaman 1 (landscape): bagan alur eliminasi =====
  if (m.layout) {
    const c = addPage(true), mx = 28, aw = c.W - 2 * mx, lay = m.layout, hd = logoMode ? NAVY : INK;
    let y = 26;
    c.tx(m.name, mx, y, 21, { font: fb, al: "c", w: aw, max: aw }); y += 27;
    c.tx("Jadwal & Hasil Pertandingan", mx, y, 12, { font: fbi, al: "c", w: aw }); y += 18;
    c.rect(mx, y, aw, 1.4, INK); y += 8;
    const bh = 34, cw = aw / 4;
    c.rr(mx, y, aw, bh, 6, "#ececec", "#bbbbbb");
    [["Tanggal", m.dt], ["Lokasi", m.loc], ["Peserta", m.count + " Tim"], ["Cabang", m.cabang]].forEach(([a, b], i) => {
      const x = mx + i * cw; if (i) c.ln(x, y + 5, x, y + bh - 5, "#333333", 1);
      c.tx(a, x + 10, y + 6, 8, { c: "#444444" }); c.tx(b, x + 10, y + 18, 10, { font: fb, max: cw - 18 });
    });
    y += bh + 10;
    const lab = "Bagan Pertandingan - " + m.fmtLabel, lw = wd(san(lab), 11, fb) + 30;
    c.rr(mx, y, lw, 20, 5, hd); c.tx(lab, mx + 15, y + 5, 11, { font: fb, c: "#ffffff" }); y += 28;
    const nh = 24 + m.notes.length * 12 + 6, ny = c.H - 40 - nh, ah = ny - 8 - y;
    const s = Math.min(aw / lay.w, ah / lay.h, 1.25), ox = mx + (aw - lay.w * s) / 2, oy = y;
    const X = v => ox + v * s, Y = v => oy + v * s;
    lay.lines.forEach(l => { for (let i = 1; i < l.length; i++) c.ln(X(l[i - 1][0]), Y(l[i - 1][1]), X(l[i][0]), Y(l[i][1]), INK, Math.max(.8, 1.5 * s)); });
    lay.chips.forEach(k => { c.rr(X(k.x), Y(k.y), 190 * s, 20 * s, 4 * s, hd); c.tx(k.text, X(k.x) + 10 * s, Y(k.y) + 5.5 * s, 10.5 * s, { font: fb, c: "#ffffff" }); });
    const { H, HH, RH, SC, CW } = BX, W = lay.W, ns = lay.sets;
    const frame = (bx, by, head, hs) => { c.rr(bx, by, W * s, H * s, 4 * s, "#ffffff", hd, 1.2); c.rr(bx, by, W * s, HH * s, 4 * s, hd); c.rect(bx, by + (HH - 4) * s, W * s, 4 * s, hd); c.tx(head, bx, by + (HH * s - hs) / 2, hs, { font: fb, c: "#ffffff", al: "c", w: W * s, max: (W - 8) * s }); };
    lay.boxes.forEach(b => {
      const bx = X(b.x), by = Y(b.y), fs = 9 * s;
      frame(bx, by, b.head, 8.5 * s);
      if (logoMode) c.rect(bx + (W - SC) * s, by + HH * s, SC * s - .6, 2 * RH * s - .6, NAVY);
      c.ln(bx, by + (HH + RH) * s, bx + W * s, by + (HH + RH) * s, logoMode ? "#ffffff" : "#999999");
      c.ln(bx + (W - SC) * s, by + HH * s, bx + (W - SC) * s, by + H * s, "#999999");
      if (ns) c.ln(bx + (W - SC - ns * CW) * s, by + HH * s, bx + (W - SC - ns * CW) * s, by + H * s, "#cccccc");
      b.rows.forEach((r, i) => {
        const ry = by + (HH + i * RH) * s, im = logoMode ? lg(r.id) : null, tx0 = bx + (im ? 22 : 6) * s;
        if (im) c.im(im, bx + 4 * s, ry + 1.5 * s, 16 * s, 16 * s);
        c.tx(r.name, tx0, ry + (RH * s - fs) / 2, fs, { font: r.win ? fb : r.ph ? fi : f, c: r.ph ? "#666666" : INK, max: (W - SC - ns * CW - 4) * s - (tx0 - bx) });
        r.cells.forEach((v, j) => c.tx(v, bx + (W - SC - (ns - j) * CW) * s, ry + (RH * s - 9 * s) / 2, 9 * s, { c: "#333333", al: "c", w: CW * s }));
        c.tx(r.score, bx + (W - SC) * s, ry + (RH * s - 10 * s) / 2, 10 * s, { font: fb, c: logoMode ? "#ffffff" : INK, al: "c", w: SC * s });
      });
      c.rr(bx, by, W * s, H * s, 4 * s, null, hd, 1.2);
    });
    const ch = lay.champ, cx = X(ch.x), cy = Y(ch.y), cim = logoMode && ch.id ? lg(ch.id) : null;
    frame(cx, cy, "JUARA", 9 * s);
    if (cim) c.im(cim, cx + 8 * s, cy + (HH + 8) * s, 22 * s, 22 * s);
    if (ch.name) c.tx(ch.name, cx + (cim ? 36 : 6) * s, cy + (HH + 15) * s, 11 * s, { font: fb, al: cim ? "l" : "c", w: (W - (cim ? 40 : 12)) * s, max: (W - (cim ? 40 : 12)) * s });
    c.rr(cx, cy, W * s, H * s, 4 * s, null, hd, 1.2);
    // Keterangan + tanda tangan panitia
    c.rr(mx, ny, aw, nh, 6, "#ffffff", "#333333", 1);
    c.tx("Keterangan :", mx + 12, ny + 7, 10, { font: fb });
    m.notes.forEach((n, i) => c.tx("-  " + n, mx + 16, ny + 22 + i * 12, 8.5, { max: aw - 250 }));
    const px = mx + aw - 200; c.ln(px, ny + 8, px, ny + nh - 8, "#333333", 1);
    c.tx("Panitia Turnamen", px + 10, ny + 9, 10, { font: fb, al: "c", w: 180 }); c.ln(px + 30, ny + nh - 14, px + 170, ny + nh - 14, INK, .8);
  }

  // ===== Halaman berikutnya (portrait): jadwal, hasil, klasemen =====
  const M = 40;
  let c = null, y = 0;
  const np = () => { c = addPage(false); y = M; };
  const need = h => { if (!c || y + h > c.H - M - 12) np(); };
  const cwid = () => c.W - 2 * M;
  const h2 = txt => { need(40); y += 8; c.tx(txt, M, y, 13, { font: fb }); y += 18; c.ln(M, y, M + cwid(), y, "#999999", .8); y += 8; };

  np();
  c.tx("Jadwal & Hasil Pertandingan", M, y, 18, { font: fb, al: "c", w: cwid() }); y += 25;
  c.rect(M, y, cwid(), 1.8, INK); y += 9;
  c.tx(m.name, M, y, 11, { font: fb, al: "c", w: cwid(), max: cwid() }); y += 22;
  c.rr(M, y, cwid(), 44, 5, "#ffffff", "#333333", 1);
  const half = cwid() / 2;
  [[["Tanggal", m.dt], ["Peserta", m.count + " Tim"]], [["Lokasi", m.loc], ["Cabang", m.cabang]]].forEach((r, i) => r.forEach(([a, b], j) => {
    const x = M + 10 + j * half, ty = y + 8 + i * 17; c.tx(a, x, ty, 9.5); c.tx(": " + b, x + 62, ty, 9.5, { max: half - 80 });
  }));
  y += 56;
  if (m.champ) { c.tx("Juara: " + m.champ, M, y, 11, { font: fb, max: cwid() }); y += 20; }

  if (m.klas.length) {
    h2("Klasemen");
    const ws = [24, 0, 36, 28, 28, 28, 44, 38]; ws[1] = cwid() - ws.reduce((a, b) => a + b, 0);
    m.klas.forEach(g => {
      need(30 + 19 * (g.rows.length + 1));
      if (g.grp) { c.tx("Grup " + g.grp, M, y, 10.5, { font: fb }); y += 15; }
      const hs = ["#", "Tim", "Main", "M", "S", "K", "Selisih", "Poin"];
      let x = M; c.rect(M, y, cwid(), 18, "#eeeeee", "#bbbbbb", .6);
      hs.forEach((t, i) => { c.tx(t.toUpperCase(), x, y + 5.5, 8, { font: fb, al: i === 1 ? "l" : "c", w: ws[i] }); x += ws[i]; }); y += 18;
      g.rows.forEach(r => {
        c.rect(M, y, cwid(), 19, "#ffffff", "#bbbbbb", .6); x = M;
        const im = logoMode ? lgu(r.logo) : null;
        [r.no, r.n, r.p, r.w, r.d, r.l, r.diff, r.pt].forEach((v, i) => {
          if (i === 1) { if (im) c.im(im, x + 4, y + 3, 13, 13); c.tx(v, x + (im ? 21 : 6), y + 5.5, 9, { max: ws[1] - 26 }); }
          else c.tx(String(v), x, y + 5.5, 9, { al: "c", w: ws[i], font: i === 7 ? fb : f });
          x += ws[i];
        }); y += 19;
      });
      y += 10;
    });
  }

  h2("Pertandingan");
  if (!m.matches.length) c.tx("Belum ada pertandingan.", M, y, 10);
  const hh = 22, th = 17, rh = 22, sw = 50, scw = 66;
  m.matches.forEach(mt => {
    const bh = hh + th + 2 * rh + (mt.when ? 16 : 0), w = cwid();
    need(bh + 10);
    c.rr(M, y, w, bh, 4, "#ffffff", "#333333", .9);
    const hc = logoMode ? NAVY : "#e6e9f2"; c.rr(M, y, w, hh, 4, hc); c.rect(M, y + hh - 5, w, 5, hc);
    c.tx(`Pertandingan ${mt.no} · ${mt.label}`, M + 10, y + 6, 10.5, { font: fb, c: logoMode ? "#ffffff" : INK, max: w - 130 });
    const st = mt.done ? "Selesai" : "Belum Dimulai", pw = wd(st, 8.5, fb) + 20;
    c.rr(M + w - 10 - pw, y + 4, pw, 14, 4, logoMode ? "#ffffff" : mt.done ? "#d3f3e1" : "#dde1ee");
    c.tx(st, M + w - 10 - pw, y + 7.5, 8.5, { font: fb, c: logoMode ? NAVY : INK, al: "c", w: pw });
    const setN = mt.rows[0].cells.length, tw = w - scw - setN * sw;
    c.rect(M, y + hh, w, th, "#eeeeee", "#bbbbbb", .6);
    const heads = ["Tim", ...mt.rows[0].cells.map((_, j) => "Set " + (j + 1)), setN ? "Menang Set" : "Skor"];
    let x = M; heads.forEach((t, i) => { const cwi = i === 0 ? tw : i === heads.length - 1 ? scw : sw; c.tx(t.toUpperCase(), x, y + hh + 5, 7.5, { font: fb, al: "c", w: cwi }); x += cwi; });
    mt.rows.forEach((r, i) => {
      const ry = y + hh + th + i * rh; c.ln(M, ry, M + w, ry, "#bbbbbb", .6);
      const im = logoMode ? lgu(r.logo) : null;
      if (im) c.im(im, M + 6, ry + 3, 16, 16);
      c.tx(r.name, M + (im ? 28 : 8), ry + 6.5, 10, { font: r.win ? fb : f, max: tw - 36 });
      let cx = M + tw; r.cells.forEach(v => { c.tx(v, cx, ry + 6.5, 10, { al: "c", w: sw }); cx += sw; });
      if (logoMode) c.rect(cx, ry + .5, scw - .5, rh - 1, NAVY);
      c.tx(r.score, cx, ry + 5.5, 12, { font: fb, c: logoMode ? "#ffffff" : INK, al: "c", w: scw });
    });
    if (mt.when) { const wy = y + bh - 16; c.rect(M + .5, wy, w - 1, 15.5, "#f4f5f9"); c.tx(mt.when, M + 10, wy + 4, 9, { max: w - 20 }); }
    c.rr(M, y, w, bh, 4, null, "#333333", .9);
    y += bh + 9;
  });

  // Nomor halaman + waktu cetak
  const pgs = doc.getPages(), foot = san("Dicetak dari ESPORTKU pada " + m.printed);
  pgs.forEach((pg, i) => {
    const { width: W } = pg.getSize(), s = `${foot}  -  Halaman ${i + 1} dari ${pgs.length}`, w = wd(s, 7.5);
    pg.drawText(s, { x: (W - w) / 2, y: 20, size: 7.5, font: f, color: col("#666666") });
  });
  return doc.save();
}
