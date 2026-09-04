/*
 * Abyss Echo - procedural sound effects via Web Audio API
 * No audio files needed; everything is synthesized.
 */
var ABYSS = window.ABYSS = window.ABYSS || {};

ABYSS.Audio = (function () {
  var ctx = null, enabled = true, master = null;

  function ensure() {
    if (!ctx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.35;
        master.connect(ctx.destination);
      } catch (e) {
        return null;
      }
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function play(fn) {
    if (!enabled) return;
    var c = ensure();
    if (!c) return;
    try { fn(c); } catch (e) { /* audio is best-effort */ }
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    play(function (c) {
      var t0 = c.currentTime + (delay || 0);
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = type || "square";
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(vol || 0.2, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g); g.connect(master);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    });
  }

  function noise(dur, vol, delay, filterFreq) {
    play(function (c) {
      var t0 = c.currentTime + (delay || 0);
      var len = Math.floor(c.sampleRate * dur);
      var buf = c.createBuffer(1, len, c.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      var src = c.createBufferSource();
      src.buffer = buf;
      var g = c.createGain();
      g.gain.setValueAtTime(vol || 0.2, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      var f = c.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = filterFreq || 800;
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t0); src.stop(t0 + dur + 0.02);
    });
  }

  return {
    setEnabled: function (v) { enabled = !!v; },
    isEnabled: function () { return enabled; },
    hit: function () { tone(180, 0.12, "square", 0.25, 90); },
    crit: function () { tone(320, 0.16, "sawtooth", 0.3, 60); tone(480, 0.1, "square", 0.15, 120, 0.05); },
    playerHit: function () { tone(140, 0.14, "triangle", 0.3, 70); },
    dodge: function () { tone(700, 0.08, "sine", 0.12, 1100); },
    guard: function () { tone(220, 0.1, "square", 0.12, 180); },
    kill: function () { noise(0.3, 0.25, 0, 500); tone(90, 0.3, "sawtooth", 0.2, 40); },
    death: function () { tone(400, 0.8, "sawtooth", 0.25, 60); tone(200, 0.9, "triangle", 0.2, 50, 0.15); },
    levelup: function () { tone(440, 0.12, "square", 0.2); tone(660, 0.12, "square", 0.2, null, 0.1); tone(880, 0.2, "square", 0.2, null, 0.2); },
    item: function () { tone(520, 0.1, "sine", 0.2, 700); },
    coin: function () { tone(880, 0.08, "square", 0.12, 1200); },
    heal: function () { tone(340, 0.15, "sine", 0.25, 520); },
    skill: function () { tone(260, 0.2, "sawtooth", 0.2, 520); },
    flee: function () { tone(600, 0.1, "sine", 0.12, 900); tone(900, 0.08, "sine", 0.1, 1300, 0.06); },
    trap: function () { noise(0.2, 0.3, 0, 300); tone(120, 0.2, "square", 0.2, 60); },
    chest: function () { tone(523, 0.09, "square", 0.16); tone(659, 0.09, "square", 0.16, null, 0.08); tone(784, 0.16, "square", 0.16, null, 0.16); },
    achievement: function () { tone(587, 0.1, "triangle", 0.2); tone(880, 0.22, "triangle", 0.22, null, 0.1); },
    boss: function () { tone(110, 0.5, "sawtooth", 0.3, 55); tone(55, 0.7, "sine", 0.3, 40, 0.1); },
    descend: function () { tone(300, 0.25, "sine", 0.18, 120); tone(150, 0.35, "sine", 0.15, 70, 0.12); },
    fragment: function () { tone(660, 0.12, "sine", 0.2); tone(880, 0.12, "sine", 0.2, null, 0.09); tone(1320, 0.25, "sine", 0.2, null, 0.18); },
    ending: function () { tone(392, 0.3, "sine", 0.2); tone(494, 0.3, "sine", 0.2, null, 0.25); tone(587, 0.3, "sine", 0.2, null, 0.5); tone(784, 0.8, "sine", 0.25, null, 0.75); }
  };
})();

/* CommonJS export for node tests */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ABYSS: ABYSS };
}