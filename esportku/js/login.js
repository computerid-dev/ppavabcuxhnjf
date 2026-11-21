import { auth, db, A, F, $, mail } from "./fb.js";
let up = false;
const err = t => { $("#err").textContent = t; $("#err").classList.toggle("hidden", !t); };
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => {
  up = b.dataset.m === "up";
  document.querySelectorAll(".tabs button").forEach(x => x.classList.toggle("on", x === b));
  $("#up").classList.toggle("hidden", !up); $("#go").textContent = up ? "Daftar" : "Masuk"; err("");
});
const where = async uid => (await F.getDoc(F.doc(db, "admins", uid))).exists() ? "admin.html" : "dashboard.html";
A.onAuthStateChanged(auth, async u => { if (u && !up && !$("#go").disabled) location.replace(await where(u.uid)); });
$("#f").onsubmit = async e => {
  e.preventDefault(); err("");
  const u = $("#u").value.trim().toLowerCase(), p = $("#p").value;
  if (!/^[a-z0-9_.]{4,20}$/.test(u)) return err("Username 4-20 karakter: huruf kecil, angka, titik, underscore.");
  if (p.length < 6) return err("Password minimal 6 karakter.");
  $("#go").disabled = true;
  try {
    if (!up) {
      const c = await A.signInWithEmailAndPassword(auth, mail(u), p);
      const usr = await F.getDoc(F.doc(db, "users", c.user.uid));
      const adm = await where(c.user.uid);
      if (adm === "dashboard.html" && (!usr.exists() || usr.data().active === false)) { await A.signOut(auth); throw new Error("inactive"); }
      return location.replace(adm);
    }
    const name = $("#n").value.trim(), pin = $("#k").value.trim().toUpperCase();
    if (name.length < 3 || !pin) throw new Error("form");
    const c = await A.createUserWithEmailAndPassword(auth, mail(u), p);
    try {
      const pr = F.doc(db, "pins", pin), ps = await F.getDoc(pr);
      if (!ps.exists() || ps.data().used) throw new Error("pin");
      const b = F.writeBatch(db);
      b.update(pr, { used: true, usedBy: c.user.uid, usedByName: u, usedAt: F.serverTimestamp() });
      b.set(F.doc(db, "users", c.user.uid), { username: u, name, role: "pengelola", pin, active: true, createdAt: F.serverTimestamp() });
      await b.commit();
    } catch (x) { await c.user.delete(); throw x; }
    location.replace("dashboard.html");
  } catch (x) {
    const m = { "auth/email-already-in-use": "Username sudah dipakai.", "auth/invalid-credential": "Username atau password salah.", pin: "PIN tidak valid atau sudah dipakai.", form: "Lengkapi nama dan PIN.", inactive: "Akun tidak aktif atau belum terdaftar." };
    err(m[x.code] || m[x.message] || "Gagal: " + (x.code || x.message));
  } finally { $("#go").disabled = false; }
};
