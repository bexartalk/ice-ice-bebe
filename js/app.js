/* Ice Ice Bebé app shell: the title screen, the game mount, install (PWA) and the service worker. */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const titleEl = $("#title"), playB = $("#t-play"), contB = $("#t-cont"), soundB = $("#t-sound"), installB = $("#t-install");
  let game = null, info = null;

  function showTitle(i) {
    info = i || info;
    const names = (info && info.levels) || [];
    $("#t-levels").innerHTML = names.map((n, k) => `<li class="${k + 1 <= info.levelMax ? "on" : ""}"><span class="t-n">${k + 1}</span>${n}</li>`).join("");
    contB.hidden = !(info && info.levelMax > 1);
    if (!contB.hidden) contB.textContent = `▶ Keep going: level ${info.levelMax}`;
    $("#t-best").innerHTML = info && info.best ? `⭐ Best score <b>${info.best}</b>${info.wins ? ` · 🏠 Made it home <b>${info.wins}</b>×` : ""}` : "";
    syncSound();
    titleEl.hidden = false; document.body.classList.add("on-title");
    requestAnimationFrame(() => { window.dispatchEvent(new Event("resize")); playB.focus({ preventScroll: true }); });
  }
  function hideTitle() { titleEl.hidden = true; document.body.classList.remove("on-title"); }
  function syncSound() {
    const on = game ? !game.muted : !(info && info.muted);
    soundB.textContent = on ? "🔊 Sound on" : "🔇 Sound off"; soundB.setAttribute("aria-pressed", on ? "true" : "false");
  }

  game = IceIceBebe.mount($("#game"), { onTitle: showTitle, onPlay: hideTitle, titleOpen: () => !titleEl.hidden });
  window.IIB = { game, api: IceIceBebe, showTitle, hideTitle };

  playB.addEventListener("click", () => game.start(1));
  contB.addEventListener("click", () => game.start(info ? info.levelMax : 1));
  soundB.addEventListener("click", () => { game.toggleSound(); syncSound(); });
  $("#menu-btn").addEventListener("click", () => { game.pause(); game.title(); });
  titleEl.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.code === "Space") && !(e.target.closest && e.target.closest("button, summary, a"))) { e.preventDefault(); playB.click(); }
    if (e.key === "m" || e.key === "M") { e.preventDefault(); soundB.click(); }
  });
  // keep focus inside the title dialog
  titleEl.addEventListener("focusout", () => setTimeout(() => { if (!titleEl.hidden && !titleEl.contains(document.activeElement)) playB.focus({ preventScroll: true }); }, 0));

  // install: Chromium's prompt; iPhone/iPad Safari gets a Share → Add to Home Screen hint
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; installB.hidden = false; });
  installB.addEventListener("click", async () => { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch (e) {} deferred = null; installB.hidden = true; });
  window.addEventListener("appinstalled", () => { installB.hidden = true; });
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios && !standalone) $("#t-ios").hidden = false;
  if (standalone) document.body.classList.add("installed");

  // offline: cache the app (only over http(s))
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
  // no pinch / double-tap zoom while playing on iOS
  document.addEventListener("gesturestart", (e) => e.preventDefault());
})();
