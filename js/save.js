/*
 * Abyss Echo - save/load via localStorage + manual export/import
 */
var ABYSS = window.ABYSS = window.ABYSS || {};

ABYSS.Save = (function () {
  var KEY = "abyss-echo-save-v1";

  function save(state) {
    try {
      state.stats.playTimeSec = (state.stats.playTimeSec || 0);
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var st = JSON.parse(raw);
      if (!st || !st.version || !st.player) return null;
      return st;
    } catch (e) {
      return null;
    }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  function exportCode(state) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  }

  function importCode(code) {
    try {
      var json = decodeURIComponent(escape(atob(code.replace(/\s/g, ""))));
      var st = JSON.parse(json);
      if (!st || !st.version || !st.player) return null;
      return st;
    } catch (e) {
      return null;
    }
  }

  return { save: save, load: load, clear: clear, exportCode: exportCode, importCode: importCode };
})();

/* CommonJS export for node tests */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ABYSS: ABYSS };
}