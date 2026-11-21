(function () {
  const ALLOWED_HOSTS = ["localhost", "127.0.0.1", "esportku-liga-olahraga.vercel.app"];
  const DESTINATION = "./esportku/index.html";
  const DENIED_MESSAGE = "link tidak resmi! Tidak dapat dibuka!";
  if (ALLOWED_HOSTS.includes(window.location.hostname)) {
    window.location.replace(DESTINATION);
    return;
  }
  document.body.innerHTML = "";
  const notice = document.createElement("p");
  notice.id = "guard-message";
  notice.textContent = DENIED_MESSAGE;
  document.body.appendChild(notice);
})();
