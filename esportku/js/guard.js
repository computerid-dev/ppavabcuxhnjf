(function () {
  const ALLOWED_HOSTS = ["localhost", "127.0.0.1", "esportku-liga-olahraga.vercel.app"];
  if (!ALLOWED_HOSTS.includes(window.location.hostname)) window.location.replace("../index.html");
})();
