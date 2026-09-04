/* Abyss Echo - entry point */
(function () {
  /* register service worker for offline play & installability (http(s) only) */
  if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* offline-friendly, not required */ });
    });
  }

  function start() {
    var autostart = window.ABYSS_AUTOSTART || (window.location && window.location.search.indexOf("autostart=1") >= 0);
    /* ?autostart=1 jumps straight into a fresh run (used by preview & CI screenshots) */
    var saved = null;
    if (!autostart) {
      saved = ABYSS.Save.load();
    } else {
      ABYSS.Save.clear();
    }
    ABYSS.UI.boot(saved);
    if (autostart) ABYSS.UI.autostart();
    document.getElementById("boot").classList.add("hidden");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();