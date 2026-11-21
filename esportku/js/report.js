import { roundName, table, bracketLayout, bracketSvg } from "./bracket.js?v=2";

export const FMT = { single: "Single Eliminasi", double: "Double Eliminasi", group: "Grup + Eliminasi", roundrobin: "Liga" };
const so = m => ({ grup: 0, gugur: 1, lower: 2, final: 3 }[m.stage] ?? 1);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const ordered = ms => ms.filter(m => !m.bye).sort((a, b) => so(a) - so(b) || a.round - b.round || a.idx - b.idx);

// Pembuat label babak ("Semifinal", "Upper R1", ...) untuk satu turnamen
export const labeler = (vis, fmt) => {
  const lastR = Math.max(1, ...vis.filter(m => !["grup", "lower", "final"].includes(m.stage)).map(m => m.round));
  return m => m.grp ? "Grup " + m.grp : m.stage === "final" ? "Grand Final" : m.stage === "lower" ? "Lower R" + m.round : fmt === "double" ? "Upper R" + m.round : fmt === "roundrobin" ? "Liga" : roundName(m.round, lastR);
};

const notesFor = (fmt, set) => [
  ...(fmt === "single" ? ["Turnamen menggunakan sistem Gugur (Single Eliminasi).", "Pemenang setiap pertandingan melaju ke babak berikutnya."] : []),
  ...(fmt === "double" ? ["Turnamen menggunakan sistem Gugur Ganda (Double Eliminasi).", "Tim yang kalah di Upper Bracket turun ke Lower Bracket.", "Pemenang Lower Bracket wajib mengalahkan Pemenang Upper Bracket untuk menjadi Juara."] : []),
  ...(fmt === "group" ? ["Fase grup dilanjutkan babak gugur (Single Eliminasi).", "Dua tim teratas tiap grup melaju ke babak gugur."] : []),
  ...(set ? ["Angka di kolom paling kanan adalah jumlah set yang dimenangkan."] : []),
  "P1, P2, dst. = nomor pertandingan pada daftar jadwal & hasil."
];

// Data laporan terstruktur, dipakai oleh halaman cetak dan pembuat PDF
export const makeModel = ({ t, ts, ms, L, pm }) => {
  const fmt = t.format, set = t.scoring === "set" ? (t.bestOf || 3) : 0, hasK = fmt !== "roundrobin", hasT = fmt !== "single" && fmt !== "double";
  const vis = ordered(ms), lab = labeler(vis, fmt), num = new Map(vis.map((m, i) => [m._id, i + 1]));
  const fin = fmt === "double" ? ms.find(m => m.stage === "final") : hasK ? [...vis.filter(m => m.stage !== "grup")].sort((a, b) => b.round - a.round)[0] : null;
  const champ = fin?.done ? (fin.sa > fin.sb ? fin.na : fin.nb) : "";
  const row = (m, s) => {
    const id = s ? m.b : m.a;
    return { name: (s ? m.nb : m.na) || "TBD", logo: L[id] || "", win: m.done && (s ? m.sb > m.sa : m.sa > m.sb), cells: set ? Array.from({ length: set }, (_, j) => (m.sets[j] ? String(m.sets[j][s]) : "-")) : [], score: String(m.done ? (s ? m.sb : m.sa) : set ? 0 : "-") };
  };
  const gm = ms.filter(m => m.stage === "grup" || fmt === "roundrobin");
  return {
    pm, set, hasT, fmt, name: t.name, sport: t.sportName, loc: t.location || "-", count: ts.length, champ,
    dt: t.date ? new Date(t.date + "T00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-",
    cabang: t.sportName + (set ? " · Best of " + set : ""),
    fmtLabel: FMT[fmt] || "", notes: notesFor(fmt, set), logos: L, printed: new Date().toLocaleString("id-ID"),
    klas: hasT ? [...new Set(ts.map(x => x.grp || ""))].sort().map(G => ({ grp: G, rows: table(ts.filter(x => (x.grp || "") === G), gm).map((r, i) => ({ no: i + 1, n: r.n, logo: r.logo, p: r.p, w: r.w, d: r.d, l: r.l, diff: r.f - r.a, pt: r.pt })) })) : [],
    matches: vis.map((m, i) => ({ no: i + 1, label: lab(m), done: m.done, when: m.when || "", rows: [row(m, 0), row(m, 1)] })),
    layout: hasK ? bracketLayout(ms, fmt, m => `P${num.get(m._id)} · ${lab(m)}`, num, set) : null
  };
};

// Lembar bagan (landscape) untuk dicetak lewat window.print()
export const sheetHtml = md => {
  if (!md.layout) return "";
  const cell = (a, b) => `<div><small>${a}</small><b>${esc(b)}</b></div>`;
  return `<section class="bks"><h1>${esc(md.name)}</h1><div class="sub">Jadwal &amp; Hasil Pertandingan</div><div class="ib">${cell("Tanggal", md.dt)}${cell("Lokasi", md.loc)}${cell("Peserta", md.count + " Tim")}${cell("Cabang", md.cabang)}</div><div class="chipb">Bagan Pertandingan &ndash; ${esc(md.fmtLabel)}</div><div class="bsv">${bracketSvg(md.layout, md.pm, md.logos, "")}</div><div class="nt"><div><b>Keterangan :</b><ul>${md.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul></div><div class="pn">Panitia Turnamen<span></span></div></div></section>`;
};
