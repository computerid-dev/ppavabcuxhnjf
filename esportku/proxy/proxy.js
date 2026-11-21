// Pengecek link/origin sisi server. Bungkus SETIAP endpoint backend dengan withProxyGuard.
// Saat ini Data memakai Firebase langsung dari browser (via CDN), belum ada endpoint backend.
const ALLOWED_HOSTS = ["localhost", "127.0.0.1", "esportku-liga-olahraga.vercel.app"];

function extractHost(value) {
  if (!value) return "";
  try { return new URL(value).hostname; } catch { return ""; }
}

function isAllowedRequest(req) {
  const originHost = extractHost(req.headers.origin);
  const refererHost = extractHost(req.headers.referer);
  const requestHost = (req.headers.host || "").split(":")[0];
  return ALLOWED_HOSTS.includes(originHost || refererHost || requestHost);
}

function withProxyGuard(handler) {
  return async (req, res) => {
    if (!isAllowedRequest(req)) {
      res.status(403).json({ error: "link tidak resmi! Tidak dapat dibuka!" });
      return;
    }
    return handler(req, res);
  };
}

module.exports = { withProxyGuard, isAllowedRequest };
