/*
 * Abyss Echo - save/load via localStorage + manual export/import
 */
var ABYSS = window.ABYSS = window.ABYSS || {};

ABYSS.Save = (function () {
  var slot = "main";
  var KEY = "abyss-echo-save-main";

  function setSlot(name) {
    slot = name || "main";
    KEY = "abyss-echo-save-" + slot;
  }

  function getSlot() { return slot; }

  /* normalize older saves so any version still boots cleanly */
  function normalizeState(st) {
    if (!st || typeof st !== "object") return null;
    st.version = st.version || "1.0.0";
    st.player = st.player || {};
    st.player.statuses = st.player.statuses || {};
    st.player.equipment = st.player.equipment || { weapon: null, armor: null, trinket: null };
    st.player.inventory = st.player.inventory || [];
    st.player.gold = st.player.gold || 0;
    st.player.level = st.player.level || 1;
    st.player.hp = st.player.hp || 0;
    st.player.mp = st.player.mp || 0;
    st.run = st.run || { alive: true, depth: 1, room: null, combat: null, eventDone: false, finalOpen: false, frags: 0, guards: 0 };
    if (typeof st.run.floorRooms !== "number") st.run.floorRooms = 0;
    if (typeof st.run.eventDone !== "boolean") st.run.eventDone = false;
    if (typeof st.run.finalOpen !== "boolean") st.run.finalOpen = false;
    st.stats = st.stats || {};
    st.stats.quests = st.stats.quests || { active: null, progress: 0, done: [] };
    st.stats.collected = st.stats.collected || {};
    st.stats.enemyKilled = st.stats.enemyKilled || {};
    st.stats.bossesKilled = st.stats.bossesKilled || {};
    st.stats.fragments = st.stats.fragments || [];
    st.stats.achievements = st.stats.achievements || [];
    st.stats.endings = st.stats.endings || [];
    st.stats.prestige = st.stats.prestige || 0;
    st.stats.fortuneWins = st.stats.fortuneWins || 0;
    st.stats.libraryVisits = st.stats.libraryVisits || 0;
    st.stats.eliteKills = st.stats.eliteKills || 0;
    st.stats.runeUses = st.stats.runeUses || 0;
    st.stats.playTimeSec = st.stats.playTimeSec || 0;
    st.stats.bestDepth = st.stats.bestDepth || 1;
    st.stats.bestEndless = st.stats.bestEndless || 0;
    st.stats.echoKills = st.stats.echoKills || 0;
    st.stats.totalKills = st.stats.totalKills || 0;
    st.stats.totalDeaths = st.stats.totalDeaths || 0;
    st.settings = st.settings || {};
    if (typeof st.settings.sound !== "boolean") st.settings.sound = true;
    if (typeof st.settings.music !== "boolean") st.settings.music = true;
    if (typeof st.settings.fastText !== "boolean") st.settings.fastText = false;
    if (!st.settings.lang) st.settings.lang = "zh";
    return st;
  }

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
      return normalizeState(st);
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
      return normalizeState(st);
    } catch (e) {
      return null;
    }
  }

  return {
    save: save, load: load, clear: clear, exportCode: exportCode, importCode: importCode,
    setSlot: setSlot, getSlot: getSlot, normalizeState: normalizeState
  };
})();

/* CommonJS export for node tests */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ABYSS: ABYSS };
}