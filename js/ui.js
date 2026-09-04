/*
 * Abyss Echo - UI rendering & interaction layer
 * Consumes ABYSS.Logic events, renders DOM, wires game feel.
 */
var ABYSS = window.ABYSS = window.ABYSS || {};

ABYSS.UI = (function () {
  var D = ABYSS.DATA, L = ABYSS.LANG, T = ABYSS.T, Logic = ABYSS.Logic;
  var STATUS_ICONS = { poison: "☠", bleed: "🩸", burn: "🔥", weaken: "⚠", enrage: "💢", ward: "⛨", blessing: "✨", haste: "💨" };
  var $ = function (id) { return document.getElementById(id); };
  var state = null, rng = Math.random, typeTimer = null, autosaveTimer = null;
  var sceneContext = null; /* per-room data: merchant stock, chest item, etc. */

  /* ================= event stream consumption ================= */
  var EVENT_SOUNDS = {
    hit: "playerHit", crit: "crit", dodge: "dodge", guard: "guard", kill: "kill",
    death: "death", levelup: "levelup", heal: "heal", mpRestore: "heal",
    achievement: "achievement", trap: "trap", chest: "chest", coin: "coin",
    skill: "skill", flee: "flee", boss: "boss", fragment: "fragment", ending: "ending"
  };

  function consumeEvents(events) {
    var logs = [];
    var enemyShake = false, playerFlash = false;
    events.forEach(function (ev) {
      var cls = "log-" + ev.type;
      var txt = null;
      switch (ev.type) {
        case "hit":
          if (ev.target === "enemy") {
            txt = (ev.crit ? "⚡ " : "") + T("dmg", { n: ev.dmg }) + "（敌人）";
            enemyShake = true;
          } else {
            txt = (ev.crit ? "⚡ " : "") + T("take_dmg", { n: ev.dmg }) + (ev.blocked ? " 🛡" : "");
            playerFlash = true;
          }
          break;
        case "dodge": txt = T("dodged"); cls = "log-good"; break;
        case "guard": txt = T("guard") + "…"; break;
        case "kill": {
          var en = D.enemies[ev.enemy];
          txt = (ev.elite ? "🌟 " : "") + T("victory_msg", { xp: ev.xp, gold: ev.gold });
          /* XP is granted inside Logic.resolveTurn; UI only renders */
          if (ev.drops && ev.drops.length) {
            ev.drops.forEach(function (it) {
              addItemSilent(it);
              txt += " ［" + T("found_item", { n: L.name(D.items[it]) }) + "］";
              var itd = D.items[it];
              if (itd && (itd.value >= 300 || it.indexOf("relic_") === 0 || it.indexOf("blade_abyss") === 0 || it.indexOf("armor_abyss") === 0)) {
                pushToast(T("loot_legend", { n: L.name(itd) }), T("loot_your"), "⚜");
              }
            });
          }
          ABYSS.Audio.kill();
          if (ev.enemy.indexOf("boss") === 0) {
            state.stats.bossesKilled = state.stats.bossesKilled || {};
            state.stats.bossesKilled[ev.enemy] = true;
            ABYSS.Audio.boss();
            if (ev.enemy === "boss_abyss") {
              Logic.grantFragment(state, "frag_3", events);
              /* defeating the final boss triggers the ending */
              sceneContext = sceneContext || {};
              sceneContext.ending = "abyss_lord";
            }
          }
          break;
        }
        case "death": txt = T("game_over"); ABYSS.Audio.death(); break;
        case "revive": txt = "🔥 " + L.name(D.items.phoenix) + " " + T("victory_msg", { xp: 0, gold: 0 }); txt = "🔥 " + L.name(D.items.phoenix) + "！你从死亡边缘归来（30% 生命）"; break;
        case "levelup": txt = "⬆ " + T("level_up", { n: ev.level }); ABYSS.Audio.levelup(); break;
        case "tick":
          txt = (ev.who === "player" ? "☠ " : "☠ ") + L.name(D.statuses[ev.status]) + " -" + ev.dmg;
          break;
        case "status": break;
        case "enemyAbility": txt = "☣ " + T("status_afflicted", { n: L.name(D.enemies[ev.enemy]), s: L.name(D.statuses[ev.status]) }); break;
        case "drain": txt = "🩸 " + T("healed", { n: ev.amount }); cls = "log-good"; break;
        case "heal": txt = "💚 " + T("healed", { n: ev.amount }); cls = "log-good"; break;
        case "mpRestore": txt = "💙 " + T("mp_restore", { n: ev.amount }); cls = "log-good"; break;
        case "cure": case "cureAll": txt = "✨ " + L.name(D.items[ev.item]) + " " + T("took_effect"); cls = "log-good"; break;
        case "buffItem": txt = "🔥 " + L.name(D.items[ev.item]) + " " + T("took_effect"); break;
        case "xpGain": txt = "📖 " + T("found_item", { n: L.name(D.items[ev.item]) }) + " +" + ev.amount + " XP"; cls = "log-gold"; break;
        case "flee": txt = ev.ok ? T("fled") : T("flee_fail"); cls = ev.ok ? "log-good" : "log-bad"; break;
        case "noMp": txt = T("no_mp"); cls = "log-bad"; break;
        case "skillCd": txt = T("skill_cd"); cls = "log-bad"; break;
        case "skill": txt = "✦ " + L.name(D.skills[ev.skill]); break;
        case "achievement":
          txt = "🏆 " + T("achievement_unlocked", { n: L.name(D.achievements[ev.id]) });
          cls = "log-gold";
          ABYSS.Audio.achievement();
          pushToast(T("achievement_unlocked", { n: L.name(D.achievements[ev.id]) }), T("achievements"), "🏆");
          break;
        case "fragment": txt = "💠 " + T("found_item", { n: L.name(D.fragments[ev.frag]) }) + "（" + ev.count + "/3）"; cls = "log-gold"; ABYSS.Audio.fragment(); break;
        case "camp": txt = T("camp_rest"); cls = "log-good"; break;
        case "trapDamage": txt = "☠ " + T("trap_hit") + " -" + ev.dmg; cls = "log-bad"; break;
        case "gold": txt = "🪙 +" + ev.amount + " " + T("gold"); cls = "log-gold"; break;
        case "found": txt = "📦 " + T("found_item", { n: L.name(D.items[ev.item]) }); cls = "log-good"; break;
        case "eventText": txt = ev.text; cls = "log-event"; break;
        case "shop": txt = "🛒 " + ev.text; cls = "log-gold"; break;
        case "ending": txt = "🏁 " + ev.text; cls = "log-gold"; break;
        case "prestige": txt = T("prestige_gained", { n: ev.level }); cls = "log-gold"; break;
        case "echoKilled": txt = T("echo_shattered", { n: L.name(D.enemies[ev.enemy]) }); cls = "log-gold"; ABYSS.Audio.boss(); break;
        case "questStart": txt = "📋 " + T("quest_start") + "：" + L.name(D.QUESTS.filter(function (q) { return q.id === ev.quest; })[0]); cls = "log-gold"; break;
        case "questAbandon": txt = "📋 " + T("quest_abandon") + "：" + L.name(D.QUESTS.filter(function (q) { return q.id === ev.quest; })[0]); break;
        case "charge": txt = "💢 " + L.name(D.enemies[ev.enemy]) + " " + T("charging") + "！"; cls = "log-bad"; ABYSS.Audio.boss(); break;
        case "forged": txt = "⚒ " + T("forge_up", { n: L.name(D.items[ev.item]), l: ev.level }); cls = "log-gold"; ABYSS.Audio.item(); break;
        case "bossPhase": {
          txt = "🌋 " + L.name(D.enemies[ev.enemy]) + " " + T("boss_enraged") + "！";
          cls = "log-bad";
          ABYSS.Audio.boss();
          break;
        }
        case "questDone": {
          var qDen = D.QUESTS.filter(function (q) { return q.id === ev.quest; })[0];
          txt = "🏆 " + T("quest_done") + "：" + L.name(qDen) + (ev.gold ? "（+🪙" + ev.gold + "）" : "");
          if (ev.items && ev.items.length) {
            ev.items.forEach(function (it) { txt += " ［" + T("found_item", { n: L.name(D.items[it]) }) + "］"; });
          }
          ABYSS.Audio.achievement();
          cls = "log-gold";
          break;
        }
        case "boss": txt = "💀 " + ev.text; cls = "log-bad"; break;
        default: txt = ev.text || "";
      }
      if (txt) logs.push({ text: txt, cls: cls });
      var snd = EVENT_SOUNDS[ev.type];
      if (snd && ABYSS.Audio[snd] && ev.type !== "kill") ABYSS.Audio[snd]();
    });
    /* combat feedback animations */
    if (enemyShake) {
      var card = document.querySelector(".enemy-card");
      if (card) {
        card.classList.remove("shake");
        void card.offsetWidth;
        card.classList.add("shake");
        events.forEach(function (ev) {
          if (ev.type === "hit" && ev.target === "enemy") spawnFloat(card, ev.dmg, ev.crit, false);
        });
      }
    }
    if (playerFlash) {
      var hud = document.querySelector(".hud");
      if (hud) {
        hud.classList.remove("hud-flash");
        void hud.offsetWidth;
        hud.classList.add("hud-flash");
      }
      var pc = document.querySelector(".enemy-card");
      if (pc) {
        events.forEach(function (ev) {
          if (ev.type === "hit" && ev.target === "player") spawnFloat(pc, ev.dmg, ev.crit, true);
        });
      }
    }
    /* levelup events generated by gainXp during consume loop get appended;
       render log + HUD once at the end */
    logs.forEach(function (lg) { pushLog(lg.text, lg.cls); });
    renderHUD();
    return logs;
  }

  function addItemSilent(itemId) {
    if (state.player.inventory.length >= D.INV_LIMIT) return false;
    state.player.inventory.push(itemId);
    Logic.recordCollected(state, itemId);
    return true;
  }

  function flavorText(kind) {
    var pool = D.FLAVOR && D.FLAVOR[kind];
    if (!pool || !pool.length) return "";
    return pool[Math.floor(Math.random() * pool.length)][ABYSS.LANG.current === "en" ? "en" : "zh"] || "";
  }
  function enemyStatusBadges(statuses) {
    var parts = [];
    for (var sid in statuses || {}) {
      var sd = D.statuses[sid];
      if (!sd) continue;
      parts.push("<span class='status-badge st-enemy' title='" + L.name(sd) + "'>" + (STATUS_ICONS[sid] || "•") + "</span>");
    }
    return parts.join("");
  }

  function spawnFloat(anchor, value, crit, onPlayer) {
    var el = document.createElement("div");
    el.className = "float-dmg" + (crit ? " float-crit" : "") + (onPlayer ? " float-taken" : "");
    el.textContent = "-" + value;
    var rect = anchor.getBoundingClientRect();
    el.style.position = "fixed";
    el.style.left = (rect.left + rect.width / 2 + (Math.random() * 40 - 20)) + "px";
    el.style.top = (rect.top + 14) + "px";
    document.body.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 900);
  }
  function pushToast(title, sub, icon) {
    var host = document.getElementById("toast");
    if (!host) return;
    var card = document.createElement("div");
    card.className = "toast-card";
    var ic = document.createElement("div");
    ic.className = "toast-icon";
    ic.textContent = icon || "🏆";
    var body = document.createElement("div");
    body.className = "toast-body";
    var t = document.createElement("div");
    t.className = "toast-title";
    t.textContent = title;
    var s = document.createElement("div");
    s.className = "toast-sub";
    s.textContent = sub || "";
    body.appendChild(t);
    body.appendChild(s);
    card.appendChild(ic);
    card.appendChild(body);
    host.appendChild(card);
    setTimeout(function () {
      card.classList.add("toast-out");
      setTimeout(function () {
        if (card.parentNode) card.parentNode.removeChild(card);
      }, 420);
    }, 3200);
  }
  function pushLog(text, cls) {
    var box = $("log");
    if (!box) return;
    var line = document.createElement("div");
    line.className = "log-line " + (cls || "");
    line.textContent = text;
    box.appendChild(line);
    if (state.settings && state.settings.fastText) {
      box.scrollTop = box.scrollHeight;
    } else if (typeTimer) {
      typeText(line, text, box);
    } else {
      box.scrollTop = box.scrollHeight;
    }
    while (box.children.length > 400) box.removeChild(box.firstChild);
  }

  function typeText(line, text, box) {
    clearTimeout(typeTimer);
    line.textContent = "";
    var i = 0;
    (function step() {
      if (i <= text.length) {
        line.textContent = text.slice(0, i);
        box.scrollTop = box.scrollHeight;
        i += 1;
        typeTimer = setTimeout(step, 8);
      } else {
        typeTimer = null;
      }
    })();
  }

  /* ================= HUD ================= */
  function renderHUD() {
    var p = state.player, ps = Logic.playerStats(state);
    var hpPct = Math.max(0, Math.round(p.hp / ps.hp * 100));
    var mpPct = Math.max(0, Math.round(p.mp / ps.mp * 100));
    $("hud-hp").style.width = hpPct + "%";
    $("hud-hp").textContent = p.hp + "/" + ps.hp;
    $("hud-mp").style.width = mpPct + "%";
    $("hud-mp").textContent = p.mp + "/" + ps.mp;
    $("hud-level").textContent = p.level;
    $("hud-gold").textContent = p.gold;
    $("hud-depth").textContent = state.run.depth;
    $("hud-prestige").textContent = state.stats.prestige || 0;
    var eq = Logic.equipped(state);
    $("hud-atk").textContent = ps.atk + (eq.atk ? " (+" + eq.atk + ")" : "");
    $("hud-def").textContent = ps.def + (eq.def ? " (+" + eq.def + ")" : "");
    $("hud-spd").textContent = ps.spd;
    $("hud-luck").textContent = ps.luck;
    $("hud-atk").parentNode.title = T("atk");
    $("hud-def").parentNode.title = T("def");
    $("hud-spd").parentNode.title = T("spd");
    $("hud-luck").parentNode.title = T("luck");
    $("hud-xp").textContent = p.xp + "/" + Logic.xpNeeded(p.level);
    $("hud-xpbar").style.width = Math.min(100, Math.round(p.xp / Logic.xpNeeded(p.level) * 100)) + "%";
    /* active quest indicator */
    var qEl = $("hud-quest");
    if (qEl) {
      var q = Logic.questDef(state);
      if (q) {
        var qs = state.stats.quests;
        qEl.textContent = "📋 " + L.name(q) + " " + qs.progress + "/" + q.target;
        qEl.style.display = "";
      } else {
        qEl.style.display = "none";
      }
    }
    /* active status badges */
    var stRow = $("hud-statuses");
    if (stRow) {
      stRow.innerHTML = "";
      for (var sid in p.statuses) {
        var sd = D.statuses[sid];
        if (!sd) continue;
        var b = document.createElement("span");
        b.className = "status-badge " + (sd.kind === "harm" ? "st-bad" : "st-good");
        b.textContent = STATUS_ICONS[sid] || "•";
        b.title = L.name(sd);
        stRow.appendChild(b);
      }
    }
    /* run mode tag */
    var mEl = $("hud-mode");
    if (mEl) {
      if (state.run.daily) { mEl.textContent = "☀️ " + T("daily"); mEl.style.display = ""; }
      else if (state.run.endless) { mEl.textContent = "🌀 " + T("endless"); mEl.style.display = ""; }
      else mEl.style.display = "none";
    }
    /* difficulty tag */
    var dEl = $("hud-diff");
    if (dEl) {
      var df = state.settings && state.settings.difficulty;
      if (df && df !== "normal") {
        dEl.textContent = "🎚 " + L.name(D.DIFFICULTY[df]);
        dEl.classList.toggle("diff-hard", df === "abyss");
        dEl.classList.toggle("diff-easy", df === "easy");
        dEl.style.display = "";
      } else {
        dEl.style.display = "none";
      }
    }
    /* truth fragment progress */
    var fEl = $("hud-frags");
    if (fEl) {
      var fn = (state.stats.fragments || []).length;
      if (fn > 0) {
        $("hud-frags-n").textContent = fn;
        fEl.style.display = "";
      } else {
        fEl.style.display = "none";
      }
    }
  }

  function renderSaveNotify() {
    var el = $("saveNotify");
    el.classList.add("show");
    setTimeout(function () { el.classList.remove("show"); }, 1200);
  }

  /* ================= scene ================= */
  function showScene() {
    var r = state.run;
    var box = $("scene");
    box.innerHTML = "";
    /* boss-fight atmosphere */
    var isBossFight = !!(r.combat && D.enemies[r.combat.enemyId] && D.enemies[r.combat.enemyId].boss);
    box.classList.toggle("boss-fight", isBossFight);
    if (!r.alive) { showDeath(); return; }
    if (sceneContext && sceneContext.ending) { showEnding(sceneContext.ending); return; }
    if (!r.combat && ABYSS.Audio.musicType !== "explore") {
      /* gentle ambient while exploring */
      ABYSS.Audio.startMusic("explore");
    }
    var title = document.createElement("div");
    title.className = "scene-title";
    title.textContent = T("floor", { n: r.depth }) + (r.endless && state.stats.bestEndless > r.depth ? "  ·  🎯 " + T("best_floor", { n: state.stats.bestEndless }) : "");
    box.appendChild(title);
    /* daily modifiers persistent tag */
    if (r.daily && r.daily.mods && r.daily.mods.length) {
      var dtag = document.createElement("div");
      dtag.className = "daily-tag";
      dtag.textContent = "☀️ " + r.daily.mods.map(function (mid) {
        var m = D.DAILY.modifiers.filter(function (x) { return x.id === mid; })[0];
        return m ? L.name(m) : mid;
      }).join(" · ");
      box.appendChild(dtag);
    }
    /* echo boss foreshadowing in endless mode */
    if (r.endless && r.depth >= 13 && r.depth % D.ENDLESS.bossEvery === 9) {
      var warn = document.createElement("div");
      warn.className = "boss-warning";
      warn.textContent = "⚠ " + T("echo_next");
      box.appendChild(warn);
    }

    /* room already resolved this floor: show combat summary, more search or descent */
    if (r.room && r.eventDone) {
      if (r.combatSummary && (r.room.type === "combat" || r.room.type === "boss")) {
        var sum = r.combatSummary;
        var card = document.createElement("div");
        card.className = "combat-summary";
        var sn = D.enemies[sum.enemy];
        var sHead = document.createElement("div");
        sHead.className = "sum-name";
        sHead.textContent = "⚔ " + T("combat_summary") + "：" + (sum.echo ? "🌪 " : "") + (sum.elite ? "🌟 " : "") + (sn.boss ? "💀 " : "👹 ") + L.name(sn);
        card.appendChild(sHead);
        var sBody = document.createElement("div");
        sBody.className = "sum-body";
        sBody.innerHTML = "🕐 " + T("turns", { n: sum.stats.turns }) +
          " · ⚔ " + T("dmg_dealt", { n: sum.stats.dmgDealt }) +
          " · 🛡 " + T("dmg_taken", { n: sum.stats.dmgTaken }) +
          (sum.stats.heals ? " · 💚 " + T("healed", { n: sum.stats.heals }) : "");
        card.appendChild(sBody);
        box.appendChild(card);
        r.combatSummary = null;
      }
      var searched = r.floorRooms || 0;
      box.appendChild(p(searched < 2 ? T("room_searched_more") : T("room_searched_done")));
      if (searched < 2) {
        var btnS = mkButton("🔍 " + T("search") + "（" + (2 - searched) + "）", "btn", function () {
          rng = Logic.mulberry32(Date.now() % 2147483647);
          r.room = Logic.generateRoom(state, rng);
          r.eventDone = false;
          r.floorRooms = (r.floorRooms || 0) + 1;
          saveAndRender();
        });
        box.appendChild(btnS);
      }
      var btnD = mkButton("⬇ " + T("descend"), "btn-main", function () {
        pushLog("🕯 " + flavorText("descend"), "log-event");
        Logic.descend(state, rng);
        if (state.run.daily && state.run.daily.deepHeal) {
          var ps = Logic.playerStats(state);
          state.player.hp = Math.min(ps.hp, state.player.hp + Math.floor(ps.hp * state.run.daily.deepHeal));
        }
        if (state.run.endless && state.run.depth > 0 && state.run.depth % 25 === 0) {
          pushLog("🎉 " + T("ms_25", { n: state.run.depth }), "log-gold");
          ABYSS.Audio.achievement();
          if (state.run.depth % 50 === 0) {
            pushToast(T("ms_50", { n: state.run.depth }), T("ms_50_sub"), "🏆");
          }
        }
        saveAndRender();
      });
      box.appendChild(btnD);
      return;
    }

    if (r.combat) { renderCombat(box); return; }
    if (!r.room) {
      var btn = mkButton(T("search"), "btn-main", function () {
        rng = Logic.mulberry32(Date.now() % 2147483647);
        r.room = Logic.generateRoom(state, rng);
        r.eventDone = false;
        r.floorRooms = (r.floorRooms || 0) + 1;
        saveAndRender();
      });
      box.appendChild(p(flavorText("mist")));
      box.appendChild(btn);
      return;
    }
    var room = r.room;
    if (room.type === "combat" || room.type === "boss") {
      if (!r.combat) startCombat(room.enemyId, room.elite, room.echo);
      renderCombat(box);
      return;
    }
    if (room.type === "rest") {
      box.appendChild(p(T("camp_spot")));
      var btnRest = mkButton(T("rest"), "btn-main", function () {
        var evs = [];
        Logic.makeCamp(state, evs);
        consumeEvents(evs);
        r.eventDone = true;
        saveAndRender();
      });
      box.appendChild(btnRest);
      return;
    }
    if (room.type === "chest") {
      box.appendChild(p(T("chest") + "…"));
      var btnChest = mkButton(T("take"), "btn-main", function () {
        var pick = ["potion_small", "potion_mana", "potion_big", "bomb_fire", "gold"];
        var prize = pick[Math.floor(Math.random() * pick.length)];
        var evs = [];
        ABYSS.Audio.chest();
        if (prize === "gold") {
          var g = 15 + Math.floor(Math.random() * 30) * state.run.depth;
          state.player.gold += g;
          evs.push({ type: "gold", amount: g });
        } else {
          if (addItemSilent(prize)) evs.push({ type: "found", item: prize });
          else evs.push({ type: "eventText", text: T("full_inventory") });
        }
        r.eventDone = true;
        consumeEvents(evs);
        saveAndRender();
      });
      box.appendChild(btnChest);
      return;
    }
    if (room.type === "trap") {
      box.appendChild(p(T("trap_hit") + "…"));
      var btnTrap = mkButton(T("continue_btn"), "btn-main", function () {
        var evs = [];
        var dmg = 8 + state.run.depth * 3;
        if (Math.random() < 0.25) {
          evs.push({ type: "dodge", who: "player" });
          evs.push({ type: "eventText", text: T("trap_dodged") });
        } else {
          state.player.hp = Math.max(1, state.player.hp - dmg);
          evs.push({ type: "trapDamage", dmg: dmg });
        }
        r.eventDone = true;
        ABYSS.Audio.trap();
        consumeEvents(evs);
        saveAndRender();
      });
      box.appendChild(btnTrap);
      return;
    }
    if (room.type === "event") { renderEvent(box, room.eventId); return; }
    if (room.type === "boss" && r.combat) { renderCombat(box); return; }
    box.appendChild(p("…"));
  }

  function p(text) {
    var el = document.createElement("p");
    el.className = "scene-text";
    el.textContent = text;
    return el;
  }

  function mkButton(text, cls, onClick) {
    var b = document.createElement("button");
    b.className = "btn " + (cls || "");
    b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  }

  /* ================= combat ================= */
  function startCombat(enemyId, elite, echo) {
    var base = Logic.enemyMaxHp(state, enemyId, elite, echo);
    var c = { enemyId: enemyId, enemyHp: base, elite: !!elite, echo: !!echo, enemyStatuses: {}, skillCd: {}, guarding: false };
    state.run.combat = c;
    ABYSS.Audio.startMusic("combat");
    if (echo) ABYSS.Audio.boss();
    else if (D.enemies[enemyId].boss) ABYSS.Audio.boss();
  }

  function renderCombat(box) {
    var c = state.run.combat;
    if (!c) return;
    var e = D.enemies[c.enemyId];
    var es = Logic.enemyStats(state);
    var ps = Logic.playerStats(state);
    var head = document.createElement("div");
    head.className = "enemy-card" + (es.elite ? " enemy-elite" : "") + (c.echo ? " enemy-echo" : "") + (es.enraged ? " enemy-enraged" : "");
    head.innerHTML = "<div class='enemy-name'>" + (c.echo ? "🌪 " : "") + (e.boss ? "💀 " : (es.elite ? "🌟 " : "👹 ")) + (c.echo ? T("echo_prefix") : es.elite ? T("elite_prefix") : "") + L.name(e) + (es.enraged ? " 🌋" : "") + "</div>" +
      "<div class='enemy-hpbar'><div class='enemy-hpfill' style='width:" + Math.max(0, Math.round(es.hp / es.maxHp * 100)) + "%'></div></div>" +
      "<div class='enemy-statuses'>" + enemyStatusBadges(c.enemyStatuses) + "</div>" +
      "<div class='enemy-info'>" + T("atk") + " " + es.atk + " · " + T("def") + " " + es.def + " · " + T("spd") + " " + es.spd + (es.elite ? " · 🌟 " + T("elite_bonus") : "") + "</div>" +
      "<div class='enemy-desc'>" + L.desc(e) + "</div>";
    box.appendChild(head);

    var actions = document.createElement("div");
    actions.className = "actions";
    actions.appendChild(mkButton("⚔ " + T("attack"), "btn-attack", function () {
      resolve({ type: "attack" });
    }));
    actions.appendChild(mkButton("🛡 " + T("guard"), "btn-guard", function () {
      resolve({ type: "guard" });
    }));
    actions.appendChild(mkButton("🏃 " + T("flee"), "btn-flee", function () {
      resolve({ type: "flee" });
    }));
    box.appendChild(actions);

    /* skills */
    var sk = document.createElement("div");
    sk.className = "skill-row";
    for (var id in D.skills) {
      (function (skillId) {
        var s = D.skills[skillId];
        var b = mkButton("✦ " + L.name(s) + " (" + s.mp + ")", "btn-skill", function () {
          resolve({ type: "skill", skillId: skillId });
        });
        if (c.skillCd && c.skillCd[skillId] > 0) {
          b.classList.add("disabled");
          b.textContent += "  [" + c.skillCd[skillId] + "]";
        }
        if (state.player.mp < s.mp) b.classList.add("disabled");
        b.title = L.desc(s);
        sk.appendChild(b);
      })(id);
    }
    box.appendChild(sk);

    /* consumables */
    var items = document.createElement("div");
    items.className = "item-row";
    var consumables = state.player.inventory.filter(function (id) { return D.items[id] && D.items[id].type === "consumable"; });
    if (consumables.length === 0) {
      items.appendChild(p("（" + T("no_item") + "）"));
    } else {
      consumables.forEach(function (id) {
        var b = mkButton(L.name(D.items[id]) + " ×" + countInInv(id), "btn-item", function () {
          resolve({ type: "item", itemId: id });
        });
        b.title = L.desc(D.items[id]);
        items.appendChild(b);
      });
    }
    box.appendChild(items);
  }

  function countInInv(id) {
    return state.player.inventory.filter(function (x) { return x === id; }).length;
  }

  function resolve(action) {
    var evs = Logic.resolveTurn(state, action, rng);
    consumeEvents(evs);
    afterTurn();
  }

  function afterTurn() {
    /* check lingering combat render */
    if (state.run.alive && !state.run.combat) {
      /* combat ended: apply end-of-combat bookkeeping (kills, frags) already done */
      var evs = [];
      Logic.checkAchievements(state, evs);
      consumeEvents(evs);
    }
    if (!state.run.alive) {
      Logic.checkAchievements(state, []);
    }
    renderHUD();
    saveNow();
    showScene();
  }

  /* ================= events ================= */
  function renderEvent(box, eventId) {
    var ev = D.events[eventId];
    var r = state.run;
    box.appendChild(p("📜 " + L.desc(ev)));

    var choices = [];
    switch (eventId) {
      case "merchant": buildMerchantChoices(choices); break;
      case "fountain": choices = [
        { text: T("ev_fountain_drink"), fn: function () {
            var ps = Logic.playerStats(state);
            state.player.hp = Math.min(ps.hp, state.player.hp + Math.floor(ps.hp * 0.4));
            var evs = [{ type: "heal", amount: Math.floor(ps.hp * 0.4) }];
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("ev_fountain_grab"), fn: function () {
            var evs = [];
            if (Math.random() < 0.3) {
              Logic.applyStatus(state, "player", "weaken", 3, evs);
              evs.push({ type: "eventText", text: T("ev_fountain_curse") });
            } else {
              state.player.gold += 30;
              evs.push({ type: "gold", amount: 30 });
            }
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } }
      ]; break;
      case "altar": {
        var fragGive = state.stats.fragments && state.stats.fragments.indexOf("frag_1") >= 0;
        choices = [
          { text: T("ev_altar_gift"), can: state.player.gold >= 50, fn: function () {
              state.player.gold -= 50;
              Logic.applyStatus(state, "player", "blessing", 5, []);
              var evs = [{ type: "eventText", text: T("ev_altar_bless") }, { type: "status", who: "player", status: "blessing" }];
              r.eventDone = true; consumeEvents(evs); saveAndRender();
            } },
          { text: T("ev_altar_frag"), can: !fragGive, fn: function () {
              var evs = [];
              Logic.grantFragment(state, "frag_1", evs);
              r.eventDone = true; consumeEvents(evs); saveAndRender();
            } },
          { text: T("ev_altar_defile"), fn: function () {
              state.player.hp = Math.max(1, state.player.hp - 15);
              state.player.gold += 60;
              var evs = [{ type: "trapDamage", dmg: 15 }, { type: "gold", amount: 60 }];
              r.eventDone = true; consumeEvents(evs); saveAndRender();
            } },
          { text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } }
        ];
        break;
      }
      case "chest": break;
      case "tomb": choices = [
        { text: T("ev_tomb_dig"), fn: function () {
            var evs = [];
            if (Math.random() < 0.5) {
              var it = ["ring_power", "charm_luck", "potion_big", "gold"][Math.floor(Math.random() * 4)];
              if (it === "gold") { state.player.gold += 40; evs.push({ type: "gold", amount: 40 }); }
              else if (addItemSilent(it)) evs.push({ type: "found", item: it });
            } else {
              var dmg = 12 + state.run.depth * 2;
              state.player.hp = Math.max(1, state.player.hp - dmg);
              evs.push({ type: "trapDamage", dmg: dmg });
              evs.push({ type: "eventText", text: T("ev_tomb_hand") });
            }
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } }
      ]; break;
      case "shrine": choices = [
        { text: T("ev_shrine_pray"), fn: function () {
            Logic.applyStatus(state, "player", "blessing", 5, []);
            var evs = [{ type: "eventText", text: T("ev_shrine_power") }];
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("ev_shrine_smash"), fn: function () {
            state.player.gold += 25;
            var evs = [{ type: "gold", amount: 25 }, { type: "eventText", text: T("ev_shrine_coins") }];
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } }
      ]; break;
      case "vein": choices = [
        { text: T("ev_vein_mine"), fn: function () {
            var evs = [];
            if (Math.random() < 0.1) {
              var dmg = 20 + state.run.depth * 3;
              state.player.hp = Math.max(1, state.player.hp - dmg);
              evs.push({ type: "trapDamage", dmg: dmg });
            } else {
              var g = 20 + Math.floor(Math.random() * 25) * state.run.depth;
              state.player.gold += g;
              evs.push({ type: "gold", amount: g });
            }
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } }
      ]; break;
      case "statue": {
        var frag2 = state.stats.fragments && state.stats.fragments.indexOf("frag_2") >= 0;
        choices = [
          { text: T("ev_statue_frag"), can: !frag2, fn: function () {
              var evs = [];
              Logic.grantFragment(state, "frag_2", evs);
              r.eventDone = true; consumeEvents(evs); saveAndRender();
            } },
          { text: T("ev_statue_gaze"), fn: function () {
              var evs = [];
              if (Math.random() < 0.05) {
                Logic.applyStatus(state, "player", "weaken", 5, evs);
                evs.push({ type: "eventText", text: T("ev_statue_mad") });
              } else {
                Logic.applyStatus(state, "player", "blessing", 5, evs);
                evs.push({ type: "eventText", text: T("ev_statue_truth") });
              }
              r.eventDone = true; consumeEvents(evs); saveAndRender();
            } },
          { text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } }
        ];
        break;
      }
      case "spidernest": choices = [
        { text: T("ev_nest_attack"), fn: function () {
            var evs = [];
            if (Math.random() < 0.6) {
              var it = ["potion_antidote", "potion_antidote", "gold"][Math.floor(Math.random() * 3)];
              if (it === "gold") { state.player.gold += 25; evs.push({ type: "gold", amount: 25 }); }
              else if (addItemSilent(it)) evs.push({ type: "found", item: it });
              if (Math.random() < 0.4) Logic.applyStatus(state, "player", "poison", 3, evs);
            } else {
              startCombat("spider");
              evs.push({ type: "boss", text: T("ev_nest_spider") });
            }
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } }
      ]; break;
      case "supply": choices = [
        { text: T("ev_supply_open"), fn: function () {
            var evs = [];
            var it = ["potion_small", "potion_mana", "potion_big", "bomb_fire"][Math.floor(Math.random() * 4)];
            if (addItemSilent(it)) evs.push({ type: "found", item: it });
            else evs.push({ type: "eventText", text: T("full_inventory") });
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } }
      ]; break;
      case "fortune": choices = [
        { text: T("ev_fortune_pay"), can: state.player.gold >= 50, fn: function () {
            state.player.gold -= 50;
            Logic.applyStatus(state, "player", "blessing", 3, []);
            state.stats.fortuneWins += 1;
            var evs = [{ type: "eventText", text: T("ev_fortune_glow") }, { type: "status", who: "player", status: "blessing" }];
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("ev_fortune_free"), fn: function () {
            var evs = [];
            var roll = Math.random();
            if (roll < 0.4) {
              state.player.gold += 30;
              state.stats.fortuneWins += 1;
              evs.push({ type: "gold", amount: 30 });
              evs.push({ type: "eventText", text: T("ev_fortune_gold") });
            } else if (roll < 0.7) {
              Logic.applyStatus(state, "player", "blessing", 3, evs);
              state.stats.fortuneWins += 1;
              evs.push({ type: "eventText", text: T("ev_fortune_ally") });
            } else {
              Logic.applyStatus(state, "player", "weaken", 3, evs);
              evs.push({ type: "eventText", text: T("ev_fortune_omen") });
            }
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } }
      ]; break;
      case "library": choices = [
        { text: T("ev_library_60"), can: state.player.gold >= 80, fn: function () {
            state.player.gold -= 80;
            state.stats.libraryVisits += 1;
            var evs = [];
            Logic.gainXp(state, 40, evs);
            evs.push({ type: "xpGain", amount: 40, item: "scroll_arcane" });
            evs.push({ type: "eventText", text: T("ev_library_read") });
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("ev_library_recipe"), can: state.player.gold >= 60, fn: function () {
            state.player.gold -= 60;
            state.stats.libraryVisits += 1;
            var evs = [];
            if (addItemSilent("potion_mana") && addItemSilent("potion_mana")) evs.push({ type: "found", item: "potion_mana" });
            else evs.push({ type: "eventText", text: T("full_inventory") });
            evs.push({ type: "eventText", text: T("ev_library_trace") });
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("ev_library_free"), fn: function () {
            state.stats.libraryVisits += 1;
            var evs = [];
            if (Math.random() < 0.3) {
              var it = ["potion_small", "potion_mana", "scroll_arcane"][Math.floor(Math.random() * 3)];
              if (addItemSilent(it)) evs.push({ type: "found", item: it });
              else evs.push({ type: "eventText", text: T("full_inventory") });
            } else {
              evs.push({ type: "eventText", text: T("ev_library_rot") });
            }
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } }
      ]; break;
      case "questboard": {
        var qs = state.stats.quests;
        var doneIds = (qs && qs.done) || [];
        var available = D.QUESTS.filter(function (q) { return doneIds.indexOf(q.id) < 0; });
        if (doneIds.length) {
          choices.push({
            text: "🏅 " + T("quest_completed", { n: doneIds.length }) + ": " + doneIds.map(function (id) {
              var q = D.QUESTS.filter(function (x) { return x.id === id; })[0];
              return q ? L.name(q) : id;
            }).join(" / "),
            can: false,
            fn: function () {}
          });
        }
        if (qs && qs.active) {
          var cur = Logic.questDef(state);
          choices.push({
            text: "📌 " + T("quest_current") + "：" + L.name(cur) + "（" + qs.progress + "/" + cur.target + "）",
            can: false,
            fn: function () {}
          });
        }
        /* offer up to 2 random undone quests */
        var shuffled = available.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 2);
        shuffled.forEach(function (q) {
          var rewardTxt = (q.reward.gold ? "🪙" + q.reward.gold + " " : "") + (q.reward.items || []).map(function (it) { return L.name(D.items[it]); }).join("、");
          choices.push({
            text: "📋 " + L.name(q) + "（" + L.name(q.giver) + "）：" + L.desc(q) + "　【" + T("reward") + "：" + rewardTxt + "】",
            fn: function () {
              var evs = [];
              Logic.startQuest(state, q.id, evs);
              r.eventDone = true;
              consumeEvents(evs);
              saveAndRender();
            }
          });
        });
        choices.push({ text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } });
        break;
      }
      case "blacksmith": {
        var smithStock = ["rune_power", "rune_guard", "rune_wind", "phoenix"];
        /* enchant: strengthen currently equipped gear */
        var enchSlot = ["weapon", "armor", "trinket"].find(function (sl) { return state.player.equipment[sl]; });
        var enchId = enchSlot ? state.player.equipment[enchSlot] : null;
        var enchLvl = enchId ? Logic.forgeLevel(state, enchId) : 0;
        if (enchId && enchLvl < 5) {
          var enchCost = 100 * (enchLvl + 1) * 2;
          var canEnch = state.player.gold >= enchCost;
          choices.push({
            text: "⚒ " + T("forge_enchant", { n: L.name(D.items[enchId]), l: enchLvl + 1, c: enchCost }),
            can: canEnch,
            fn: function () {
              if (!canEnch && state.player.gold < enchCost) { pushLog(T("no_gold"), "log-bad"); return; }
              state.player.gold -= enchCost;
              var evs = [];
              Logic.forgeUpgrade(state, enchId, evs);
              evs.push({ type: "eventText", text: T("forge_enchant_done", { n: L.name(D.items[enchId]), l: Logic.forgeLevel(state, enchId) }) });
              ABYSS.Audio.item();
              r.eventDone = true; consumeEvents(evs); saveAndRender();
            }
          });
        }
        var gearPool = genStock().filter(function (id) { return D.items[id] && D.items[id].type !== "consumable"; });
        var gearItem = gearPool.length ? gearPool[Math.floor(Math.random() * gearPool.length)] : "chainmail";
        /* repair service */
        choices.push({
          text: "🔧 " + L.desc(D.FORGE) + "（" + T("hp") + " 全恢复）",
          can: state.player.gold >= D.FORGE.serviceCost,
          fn: function () {
            if (state.player.gold < D.FORGE.serviceCost) { pushLog(T("no_gold"), "log-bad"); return; }
            state.player.gold -= D.FORGE.serviceCost;
            var ps = Logic.playerStats(state);
            state.player.hp = ps.hp;
            var evs = [{ type: "heal", amount: ps.hp }, { type: "eventText", text: T("ev_forge_healed") }];
            ABYSS.Audio.heal();
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          }
        });
        smithStock.forEach(function (itemId) {
          var it = D.items[itemId];
          var price = it.value;
          var canBuy = state.player.gold >= price && state.player.inventory.length < D.INV_LIMIT;
          choices.push({
            text: "🛒 " + L.name(it) + " — " + price + " " + T("gold") + "（" + L.desc(it) + "）",
            can: canBuy,
            fn: function () {
              if (!canBuy && state.player.gold < price) { pushLog(T("no_gold"), "log-bad"); return; }
              if (!canBuy && state.player.inventory.length >= D.INV_LIMIT) { pushLog(T("full_inventory"), "log-bad"); return; }
              state.player.gold -= price;
              addItemSilent(itemId);
              ABYSS.Audio.item();
              var evs = [{ type: "shop", text: T("ev_forge_buy", { n: L.name(it) }) }];
              r.eventDone = true; consumeEvents(evs); saveAndRender();
            }
          });
        });
        var git = D.items[gearItem];
        var gPrice = Math.floor(git.value * 0.8);
        var canGear = state.player.gold >= gPrice && state.player.inventory.length < D.INV_LIMIT;
        choices.push({
          text: "⚒ " + T("ev_forge_gear", { n: L.name(git), g: gPrice }),
          can: canGear,
          fn: function () {
            if (!canGear && state.player.gold < gPrice) { pushLog(T("no_gold"), "log-bad"); return; }
            if (!canGear && state.player.inventory.length >= D.INV_LIMIT) { pushLog(T("full_inventory"), "log-bad"); return; }
            state.player.gold -= gPrice;
            addItemSilent(gearItem);
            ABYSS.Audio.item();
            var evs = [{ type: "shop", text: T("ev_forge_made", { n: L.name(git) }) }];
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          }
        });
        choices.push({ text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } });
        break;
      }
      case "mirage": choices = [
        { text: T("ev_mirage_fight"), fn: function () {
            var evs = [];
            startCombat("phantom", Math.random() < 0.15);
            evs.push({ type: "boss", text: T("ev_mirage_phantom") });
            r.eventDone = false;
            consumeEvents(evs);
            saveAndRender();
          } },
        { text: T("ev_mirage_smoke"), fn: function () {
            var evs = [];
            var roll = Math.random();
            if (roll < 0.3) {
              evs.push({ type: "eventText", text: T("ev_mirage_ash"), });
            } else if (roll < 0.6) {
              var g = 25 + Math.floor(Math.random() * 30);
              state.player.gold += g;
              evs.push({ type: "gold", amount: g });
            } else {
              var it = ["potion_small", "potion_mana", "potion_big"][Math.floor(Math.random() * 3)];
              if (addItemSilent(it)) evs.push({ type: "found", item: it });
            }
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } }
      ]; break;
      case "battlefield": choices = [
        { text: T("ev_field_sword"), fn: function () {
            var evs = [];
            var pool = ["sword_rust", "bow_hunter", "dagger_moon", "axe_rune", "blade_shadow"];
            var idx = Math.min(pool.length - 1, Math.floor(state.run.depth / 3));
            var it = pool[idx];
            if (addItemSilent(it)) evs.push({ type: "found", item: it });
            else evs.push({ type: "eventText", text: T("full_inventory") });
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("ev_field_pouch"), fn: function () {
            var g = 40 + Math.floor(Math.random() * 50);
            state.player.gold += g;
            var evs = [{ type: "gold", amount: g }];
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("ev_field_bury"), fn: function () {
            var evs = [];
            Logic.applyStatus(state, "player", "blessing", 5, evs);
            evs.push({ type: "eventText", text: T("ev_field_bless") });
            r.eventDone = true; consumeEvents(evs); saveAndRender();
          } },
        { text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } }
      ]; break;
      case "vault": {
        /* left / middle / right chest: 60% treasure, 40% curse */
        var prize = Math.random();
        var reveal = function (label) {
          var evs = [];
          if (prize < 0.6) {
            var roll = Math.random();
            if (roll < 0.4) {
              var it = ["potion_big", "rune_power", "scroll_arcane", "potion_rage"][Math.floor(Math.random() * 4)];
              if (addItemSilent(it)) evs.push({ type: "found", item: it });
              else evs.push({ type: "eventText", text: T("full_inventory") });
            } else if (roll < 0.7) {
              var g = 80 + Math.floor(Math.random() * 70);
              state.player.gold += g;
              evs.push({ type: "gold", amount: g });
            } else {
              Logic.applyStatus(state, "player", "blessing", 5, evs);
              evs.push({ type: "eventText", text: T("ev_vault_bless") });
            }
            ABYSS.Audio.chest();
          } else {
            state.player.hp = Math.max(1, state.player.hp - 15);
            Logic.applyStatus(state, "player", Math.random() < 0.5 ? "weaken" : "poison", 3, evs);
            evs.push({ type: "trapDamage", dmg: 15 });
            evs.push({ type: "eventText", text: T("ev_vault_curse") });
            ABYSS.Audio.trap();
          }
          r.eventDone = true; consumeEvents(evs); saveAndRender();
        };
        choices = [
          { text: T("ev_vault_left"), fn: function () { reveal("left"); } },
          { text: T("ev_vault_middle"), fn: function () { reveal("middle"); } },
          { text: T("ev_vault_right"), fn: function () { reveal("right"); } },
          { text: T("leave"), fn: function () { r.eventDone = true; saveAndRender(); } }
        ];
        break;
      }
    }

    if (choices.length === 0) {
      box.appendChild(p("（" + T("no_item") + "）"));
    }
    choices.forEach(function (ch) {
      var b = mkButton(ch.text, "btn-choice", ch.fn);
      if (ch.can === false) b.classList.add("disabled");
      box.appendChild(b);
    });
  }

  function buildMerchantChoices(choices) {
    if (!sceneContext || !sceneContext.stock) {
      sceneContext = sceneContext || {};
      sceneContext.stock = genStock();
    }
    var stock = sceneContext.stock;
    stock.forEach(function (itemId) {
      var it = D.items[itemId];
      var price = it.value;
      var canBuy = state.player.gold >= price && state.player.inventory.length < D.INV_LIMIT;
      choices.push({
        text: "🛒 " + L.name(it) + " — " + price + " " + T("gold") + "（" + (it.type === "consumable" ? T("use") : T("equip")) + "）",
        can: canBuy,
        fn: function () {
          if (!canBuy && state.player.gold < price) {
            pushLog(T("no_gold"), "log-bad");
            return;
          }
          if (!canBuy && state.player.inventory.length >= D.INV_LIMIT) {
            pushLog(T("full_inventory"), "log-bad");
            return;
          }
          state.player.gold -= price;
          addItemSilent(itemId);
          ABYSS.Audio.item();
          var evs = [{ type: "shop", text: T("ev_forge_buy", { n: L.name(it) }) }];
          consumeEvents(evs);
          saveAndRender();
        }
      });
    });
    choices.push({
      text: T("leave"),
      fn: function () { state.run.eventDone = true; saveAndRender(); }
    });
  }

  function genStock() {
    var depth = state.run.depth;
    var pool = [];
    if (depth <= 3) pool = ["sword_rust", "bow_hunter", "cloth", "leather", "charm_luck", "potion_small", "potion_mana", "potion_antidote"];
    else if (depth <= 6) pool = ["dagger_moon", "axe_rune", "chainmail", "ring_power", "potion_big", "potion_mana", "potion_antidote"];
    else if (depth <= 9) pool = ["blade_shadow", "rune_armor", "amulet_life", "potion_big", "bomb_fire", "holy_water"];
    else pool = ["spear_dragon", "hammer_void", "scale_dragon", "cloak_shadow", "coin_greed", "elixir_life", "scroll_arcane", "potion_big", "bomb_fire", "potion_rage"];
    var stock = [];
    while (stock.length < 4) {
      var pick = pool[Math.floor(Math.random() * pool.length)];
      if (stock.indexOf(pick) < 0) stock.push(pick);
    }
    return stock;
  }

  /* ================= death & endings & descend ================= */
  function showDeath() {
    var box = $("scene");
    box.innerHTML = "";
    if (state.run.daily || state.run.endless) {
      recordDailyBest();
      ABYSS.Save.setSlot("main");
      state.run.daily = null;
      state.run.endless = false;
    }
    var t = document.createElement("div");
    t.className = "scene-title gameover";
    t.textContent = T("game_over");
    box.appendChild(t);
    var e = D.enemies[state.run.lastAttacker];
    box.appendChild(p(T("died", { n: e ? L.name(e) : "深渊" })));
    if (e && e.boss) pushToast(T("boss_felled"), T("dies_to", { n: L.name(e) }), "💀");
    box.appendChild(p(T("deeper_dark")));
    /* journey summary card */
    var jc = document.createElement("div");
    jc.className = "combat-summary";
    var st = state.stats;
    var jh = document.createElement("div");
    jh.className = "sum-name";
    jh.textContent = "📊 " + T("journey_summary");
    jc.appendChild(jh);
    var jb = document.createElement("div");
    jb.className = "sum-body";
    var mins = Math.floor((st.playTimeSec || 0) / 60);
    var secs = (st.playTimeSec || 0) % 60;
    jb.innerHTML =
      T("depth") + " " + state.run.depth + "（" + T("best") + " " + st.bestDepth + "）" +
      " · " + T("kills") + " " + st.totalKills +
      " · " + T("elite_kills") + " " + (st.eliteKills || 0) +
      " · " + T("level") + " " + state.player.level +
      " · 🪙 " + state.player.gold +
      "<br>" + T("play_time") + " " + mins + ":" + String(secs).padStart(2, "0") +
      " · " + T("achievements") + " " + (st.achievements || []).length +
      " · " + T("multikill_bosses") + " " + Object.keys(st.bossesKilled || {}).length + "/5" +
      (st.fragments && st.fragments.length ? " · 💠 " + st.fragments.length + "/3" : "");
    jc.appendChild(jb);
    box.appendChild(jc);
    box.appendChild(mkButton(T("restart"), "btn-main", function () {
      state = Logic.freshState();
      state.settings = defaultSettings();
      ABYSS.LANG.current = state.settings.lang;
      saveNow();
      newRun();
    }));
  }

  function showEnding(endingId) {
    var box = $("scene");
    box.innerHTML = "";
    var en = D.endings[endingId];
    Logic.markDifficultyClear(state);
    if (state.run.daily || state.run.endless) {
      recordDailyBest();
      ABYSS.Save.setSlot("main");
      state.run.daily = null;
      state.run.endless = false;
    }
    state.stats.endings = state.stats.endings || [];
    if (state.stats.endings.indexOf(endingId) < 0) state.stats.endings.push(endingId);
    ABYSS.Audio.ending();
    var t = document.createElement("div");
    t.className = "scene-title ending-title";
    t.textContent = L.name(en);
    box.appendChild(t);
    box.appendChild(p(T("ending") + "："));
    var d = document.createElement("p");
    d.className = "scene-text ending-desc";
    d.textContent = L.desc(en);
    box.appendChild(d);
    var evs = [];
    Logic.checkAchievements(state, evs);
    if (evs.length) consumeEvents(evs);
    var actions = document.createElement("div");
    actions.className = "actions";
    actions.appendChild(mkButton("🖋 " + T("restart"), "btn-main", function () {
      state = Logic.freshState();
      state.settings = defaultSettings();
      ABYSS.LANG.current = state.settings.lang;
      saveNow();
      newRun();
    }));
    actions.appendChild(mkButton("🌀 " + L.name(D.PRESTIGE) + " +1", "btn-gold", function () {
      if (!confirm(L.desc(D.PRESTIGE) + " " + T("reset_confirm"))) return;
      var mark = (state.stats.prestige || 0) + 1;
      state = Logic.prestige(state);
      state.settings = defaultSettings();
      ABYSS.LANG.current = state.settings.lang;
      var evs2 = [];
      Logic.checkAchievements(state, evs2);
      consumeEvents([{ type: "prestige", level: mark }].concat(evs2));
      saveNow();
      newRun();
    }));
    box.appendChild(actions);
  }

  function defaultSettings() {
    var s = ABYSS.Save.load();
    if (s && s.settings) return s.settings;
    return { sound: true, music: true, fastText: false, lang: navigator.language && navigator.language.indexOf("zh") === 0 ? "zh" : "en" };
  }

  /* ================= magic door to final boss ================= */
  function checkFinalDoor() {
    if (state.run.finalOpen) return;
    if (state.stats.bossesKilled && state.stats.bossesKilled.boss_karaz) {
      state.run.finalOpen = true;
      pushLog(T("rift_opened"), "log-bad");
    }
  }

  /* ================= save & boot ================= */
  function saveNow() {
    ABYSS.Save.save(state);
  }

  function saveAndRender() {
    saveNow();
    renderSaveNotify();
    /* quest completion check runs on every state change */
    var qevs = [];
    Logic.checkQuest(state, qevs);
    if (qevs.length) consumeEvents(qevs);
    renderHUD();
    checkFinalDoor();
    showScene();
    renderHUD();
  }

  function newRun() {
    state.run.alive = true;
    /* reuse existing run state */
    showScene();
    renderHUD();
    pushLog(T("awaken_intro"), "log-event");
    pushLog(T("tutorial") + ": " + T("tutorial_moves"), "log-event");
    saveNow();
  }

  function renderStaticTexts() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = T(el.getAttribute("data-i18n"));
    });
  }

  function boot(savedState) {
    ABYSS.LANG.current = (savedState && savedState.settings && savedState.settings.lang) || "zh";
    state = savedState || Logic.freshState();
    state.settings = state.settings || defaultSettings();
    ABYSS.LANG.current = state.settings.lang;
    ABYSS.Audio.setEnabled(state.settings.sound !== false);
    ABYSS.Audio.setMusic(state.settings.music !== false);
    renderStaticTexts();
    bindGlobalUI();
    renderHUD();
    if (savedState) showScene();
    else showTitle();
    autosaveTimer = setInterval(function () {
      if (state.run.alive) {
        state.stats.playTimeSec = (state.stats.playTimeSec || 0) + 1;
        if (state.stats.playTimeSec % 15 === 0) saveNow();
      }
    }, 1000);
  }

  function showTitle() {
    $("title-screen").classList.add("visible");
    $("game-screen").classList.remove("visible");
    ABYSS.Audio.stopMusic();
    showDailyBest();
    /* endless mode unlocks with first rebirth */
    var saved = ABYSS.Save.load();
    var endlessBtn = $("btn-endless");
    if (endlessBtn) {
      endlessBtn.style.display = (saved && saved.stats && saved.stats.prestige >= 1) ? "" : "none";
    }
  }

  function autostart() {
    hideTitle();
    state = Logic.freshState();
    state.settings = defaultSettings();
    ABYSS.LANG.current = state.settings.lang;
    newRun();
  }

  /* preview/e2e hook: force an ending scene (used by screenshot tooling) */
  function debugShowEnding(endingId) {
    state.stats.endings = state.stats.endings || [];
    sceneContext = sceneContext || {};
    sceneContext.ending = endingId;
    showScene();
    renderHUD();
  }

  /* preview/e2e hook: force a combat scene (used by screenshot tooling) */
  function debugStartCombat(enemyId, elite, echo) {
    state.run.room = { type: "combat", enemyId: enemyId, elite: !!elite, echo: !!echo };
    var base = Logic.enemyMaxHp(state, enemyId, elite, echo);
    state.run.combat = { enemyId: enemyId, enemyHp: base, elite: !!elite, echo: !!echo, enemyStatuses: {}, skillCd: {}, guarding: false };
    state.run.eventDone = false;
    showScene();
    renderHUD();
  }

  function hideTitle() {
    $("title-screen").classList.remove("visible");
    $("game-screen").classList.add("visible");
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function recordDailyBest() {
    try {
      var cur = { date: todayStr(), depth: state.stats.bestDepth, kills: state.stats.totalKills };
      var prev = JSON.parse(localStorage.getItem("abyss-echo-daily-best") || "null");
      if (!prev || prev.date !== cur.date || cur.depth > prev.depth || (cur.depth === prev.depth && cur.kills > prev.kills)) {
        localStorage.setItem("abyss-echo-daily-best", JSON.stringify(cur));
      }
      /* daily streak tracking */
      try {
        var streak = JSON.parse(localStorage.getItem("abyss-echo-daily-streak") || "null");
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        var yStr = yesterday.getFullYear() + "-" + String(yesterday.getMonth() + 1).padStart(2, "0") + "-" + String(yesterday.getDate()).padStart(2, "0");
        var n = 1;
        if (streak && streak.lastDate === yStr) n = streak.current + 1;
        else if (streak && streak.lastDate === cur.date) n = streak.current;
        localStorage.setItem("abyss-echo-daily-streak", JSON.stringify({ current: n, best: Math.max(n, streak ? streak.best || 0 : 0), lastDate: cur.date }));
      } catch (e) { /* ignore */ }
      /* keep a rolling 14-day history */
      var hist = [];
      try { hist = JSON.parse(localStorage.getItem("abyss-echo-daily-history") || "[]"); } catch (e) { hist = []; }
      var today = hist.filter(function (h) { return h.date === cur.date; });
      if (today.length === 0) hist.push(cur);
      hist = hist.filter(function (h) { return h.depth > 0; }).slice(-14);
      localStorage.setItem("abyss-echo-daily-history", JSON.stringify(hist));
    } catch (e) { /* ignore */ }
  }

  function showDailyBest() {
    var el = $("daily-best");
    if (!el) return;
    try {
      var best = JSON.parse(localStorage.getItem("abyss-echo-daily-best") || "null");
      var lines = [];
      if (best && best.date === todayStr()) {
        lines.push(T("daily_best", { n: best.depth, k: best.kills }));
      }
      var hist = [];
      try { hist = JSON.parse(localStorage.getItem("abyss-echo-daily-history") || "[]"); } catch (e) { hist = []; }
      if (hist.length > 1) {
        hist.slice(-7).reverse().forEach(function (h) {
          lines.push("▸ " + h.date + " · " + T("floor", { n: h.depth }) + " · " + T("kills") + " " + h.kills);
        });
      }
      /* daily streak badge */
      try {
        var streak = JSON.parse(localStorage.getItem("abyss-echo-daily-streak") || "null");
        if (streak && streak.best >= 2) {
          lines.push("🔥 " + T("daily_streak", { n: streak.best }) + " · " + T("daily_streak_now", { n: streak.current }));
        }
      } catch (e) { /* ignore */ }
      /* achievement completion */
      var mainSaved = ABYSS.Save.load();
      var achUnlocked = mainSaved && mainSaved.stats ? (mainSaved.stats.achievements || []).length : 0;
      lines.push(T("ach_progress", { n: achUnlocked, t: Object.keys(D.achievements).length }));
      var daily = Logic.dailySeedModifiers(todayStr());
      if (daily.picked && daily.picked.length) {
        lines.push(T("daily_today") + ": " + daily.picked.map(function (m) { return T("daily_today_item", { n: L.name(m), d: L.desc(m) }); }).join(" | "));
      }
      el.innerHTML = lines.join("<br>");
      el.classList.toggle("visible", lines.length > 0);
    } catch (e) { /* ignore */ }
  }

  function startDaily() {
    var daily = Logic.dailySeedModifiers(todayStr());
    var msg = T("daily_enter") + "\n" + daily.picked.map(function (m) { return "· " + L.name(m) + "：" + L.desc(m); }).join("\n") + "\n\n" + T("daily_rules");
    if (!confirm(msg)) return;
    ABYSS.Save.setSlot("daily");
    state = Logic.freshState();
    state.settings = defaultSettings();
    ABYSS.LANG.current = state.settings.lang;
    state.run.daily = { fx: daily.fx, mods: daily.picked.map(function (m) { return m.id; }) };
    hideTitle();
    newRun();
    var intro = ["☀️ " + L.name(D.DAILY) + "！"];
    daily.picked.forEach(function (m) { intro.push("· " + L.name(m) + "：" + L.desc(m)); });
    intro.forEach(function (t) { pushLog(t, "log-gold"); });
  }

  function startEndless() {
  var p = ABYSS.Save.load();
  if (!p || !(p.stats && p.stats.prestige >= 1)) {
    pushLog(T("endless_locked"), "log-bad");
    return;
  }
  ABYSS.Save.setSlot("endless");
  state = Logic.endlessSetup(Logic.freshState());
  state.settings = defaultSettings();
  ABYSS.LANG.current = state.settings.lang;
  hideTitle();
  newRun();
  pushLog("🌀 " + L.name(D.ENDLESS) + "！", "log-gold");
  pushLog(L.desc(D.ENDLESS), "log-gold");
  pushLog(T("endless_start"), "log-gold");
}

  function bindGlobalUI() {
    $("btn-new").addEventListener("click", function () {
      if (ABYSS.Save.load()) {
        if (!confirm(T("reset_confirm"))) return;
      }
      ABYSS.Save.setSlot("main");
      ABYSS.Save.clear();
      state = Logic.freshState();
      state.settings = defaultSettings();
      ABYSS.LANG.current = state.settings.lang;
      newRun();
      hideTitle();
    });
    $("btn-daily").addEventListener("click", startDaily);
    $("btn-endless").addEventListener("click", startEndless);
    $("btn-continue").addEventListener("click", function () {
      ABYSS.Save.setSlot("main");
      var saved = ABYSS.Save.load();
      if (!saved) {
        pushLog(T("no_save_new"));
        ABYSS.Save.clear();
        state = Logic.freshState();
        state.settings = defaultSettings();
        ABYSS.LANG.current = state.settings.lang;
        newRun();
      } else {
        state = saved;
        ABYSS.LANG.current = state.settings.lang || "zh";
        renderHUD();
        showScene();
      }
      hideTitle();
    });
    $("btn-settings").addEventListener("click", openSettings);
    $("btn-inv").addEventListener("click", openInventory);
    $("btn-ach").addEventListener("click", openAchievements);
    $("btn-stats").addEventListener("click", openStats);
    $("btn-codex").addEventListener("click", openCodex);
    $("btn-help").addEventListener("click", openHelp);
    $("modal-close").addEventListener("click", closeModal);

    document.addEventListener("keydown", function (e) {
      if (!$("game-screen").classList.contains("visible")) return;
      var modal = $("modal");
      if (modal.classList.contains("visible")) {
        if (e.key === "Escape") closeModal();
        return;
      }
      /* keyboard shortcuts for combat */
      if (state.run.combat) {
        var keys = { "1": "attack", "2": "guard", "3": "flee" };
        if (keys[e.key]) {
          resolve({ type: keys[e.key] });
        } else if (e.key >= "4" && e.key <= "9") {
          var skillIds = Object.keys(D.skills);
          var idx = parseInt(e.key, 10) - 4;
          if (skillIds[idx]) resolve({ type: "skill", skillId: skillIds[idx] });
        }
      }
    });
  }

  /* ================= modals ================= */
  function openModal(title, bodyFn) {
    var modal = $("modal"), content = $("modal-body");
    content.innerHTML = "";
    var h = document.createElement("h3");
    h.textContent = title;
    content.appendChild(h);
    bodyFn(content);
    modal.classList.add("visible");
    ABYSS.UI.activeModal = modal;
  }

  function closeModal() {
    $("modal").classList.remove("visible");
  }

  function openSettings() {
    openModal(T("settings"), function (c) {
      var langSel = document.createElement("select");
      langSel.id = "sel-lang";
      [["zh", "中文"], ["en", "English"]].forEach(function (pair) {
        var o = document.createElement("option");
        o.value = pair[0]; o.textContent = pair[1];
        if (state.settings.lang === pair[0]) o.selected = true;
        langSel.appendChild(o);
      });
      langSel.addEventListener("change", function () {
        state.settings.lang = langSel.value;
        ABYSS.LANG.current = state.settings.lang;
        renderStaticTexts();
        saveNow();
        showScene();
        renderHUD();
        closeModal();
      });
      var row1 = document.createElement("div");
      row1.className = "setting-row";
      row1.appendChild(document.createElement("span")).textContent = T("language") + "：";
      row1.appendChild(langSel);
      c.appendChild(row1);

      var chkSound = document.createElement("input");
      chkSound.type = "checkbox";
      chkSound.checked = state.settings.sound;
      chkSound.addEventListener("change", function () {
        state.settings.sound = chkSound.checked;
        ABYSS.Audio.setEnabled(state.settings.sound);
        saveNow();
      });
      var row2 = document.createElement("div");
      row2.className = "setting-row";
      row2.appendChild(document.createElement("span")).textContent = T("sound_on").split("：")[0] + "：";
      row2.appendChild(chkSound);
      c.appendChild(row2);

      var chkMusic = document.createElement("input");
      chkMusic.type = "checkbox";
      chkMusic.checked = state.settings.music !== false;
      chkMusic.addEventListener("change", function () {
        state.settings.music = chkMusic.checked;
        ABYSS.Audio.setMusic(state.settings.music);
        saveNow();
      });
      var rowMusic = document.createElement("div");
      rowMusic.className = "setting-row";
      rowMusic.appendChild(document.createElement("span")).textContent = T("music_on").split("：")[0] + "：";
      rowMusic.appendChild(chkMusic);
      c.appendChild(rowMusic);

      var diffRow = document.createElement("div");
      diffRow.className = "setting-row";
      diffRow.appendChild(document.createElement("span")).textContent = T("difficulty") + "：";
      var diffSel = document.createElement("select");
      Object.keys(D.DIFFICULTY).forEach(function (id) {
        var o = document.createElement("option");
        o.value = id;
        o.textContent = L.name(D.DIFFICULTY[id]) + " — " + L.desc(D.DIFFICULTY[id]);
        if (state.settings.difficulty === id || (!state.settings.difficulty && id === "normal")) o.selected = true;
        diffSel.appendChild(o);
      });
      diffSel.addEventListener("change", function () {
        state.settings.difficulty = diffSel.value;
        saveNow();
        pushLog(T("difficulty_set", { n: L.name(D.DIFFICULTY[state.settings.difficulty]) }), "log-gold");
      });
      diffRow.appendChild(diffSel);
      c.appendChild(diffRow);
      var chkFast = document.createElement("input");
      chkFast.type = "checkbox";
      chkFast.checked = state.settings.fastText;
      chkFast.addEventListener("change", function () {
        state.settings.fastText = chkFast.checked;
        saveNow();
      });
      var row3 = document.createElement("div");
      row3.className = "setting-row";
      row3.appendChild(document.createElement("span")).textContent = T("fast_text") + "：";
      row3.appendChild(chkFast);
      c.appendChild(row3);

      var btns = document.createElement("div");
      btns.className = "modal-actions";
      btns.appendChild(mkButton(T("save_export"), "btn", function () {
        var code = ABYSS.Save.exportCode(state);
        var ta = document.createElement("textarea");
        ta.value = code;
        ta.readOnly = true;
        ta.className = "export-box";
        c.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) { /* ignored */ }
      }));
      var importBtn = mkButton(T("save_import"), "btn", function () {
        var ta = document.createElement("textarea");
        ta.placeholder = "Paste save code…";
        ta.className = "export-box";
        c.appendChild(ta);
        var doIt = mkButton(T("continue_btn"), "btn", function () {
          var st = ABYSS.Save.importCode(ta.value);
          if (st) {
            state = st;
            ABYSS.LANG.current = st.settings.lang || "zh";
            saveNow();
            pushLog(T("save_imported"), "log-good");
            renderHUD();
            showScene();
            closeModal();
          } else {
            pushLog(T("save_invalid"), "log-bad");
          }
        });
        c.appendChild(doIt);
      });
      btns.appendChild(importBtn);
      var resetBtn = mkButton(T("reset") + " ⚠", "btn btn-danger", function () {
        if (confirm(T("reset_confirm"))) {
          ABYSS.Save.clear();
          state = Logic.freshState();
          state.settings = defaultSettings();
          ABYSS.LANG.current = state.settings.lang;
          newRun();
          closeModal();
        }
      });
      btns.appendChild(resetBtn);
      var aboutBtn = mkButton("ℹ " + T("about"), "btn", function () {
        openModal(T("about"), function (c2) {
          var box = document.createElement("div");
          box.innerHTML = "<p class='help-line'><b>🕳 " + T("game_title") + "</b> v" + D.VERSION + "</p>" +
            "<p class='help-line'>" + T("game_subtitle") + "</p>" +
            "<p class='help-line'>" + T("about_desc") + "</p>" +
            "<p class='help-line'><a href='https://github.com/Miku-3993/abyss-echo' target='_blank'>GitHub</a> · <a href='https://miku-3993.github.io/abyss-echo/' target='_blank'>Play</a> · <a href='https://github.com/Miku-3993/abyss-echo/blob/main/docs/GAMEPLAY.md' target='_blank'>" + T("guide") + "</a></p>";
          c2.appendChild(box);
          c2.appendChild(mkButton(T("back"), "btn", closeModal));
        });
      });
      btns.appendChild(aboutBtn);
      c.appendChild(btns);
    });
  }

  function openInventory() {
    openModal(T("inventory"), function (c) {
      var ps = Logic.playerStats(state);
      var eq = Logic.equipped(state);
      var eqInfo = document.createElement("div");
      eqInfo.className = "eq-info";
      var lines = ["⚔ " + T("atk") + " " + ps.atk, "🛡 " + T("def") + " " + ps.def, "⚡ " + T("spd") + " " + ps.spd, "🍀 " + T("luck") + " " + ps.luck];
      var relicEquipped = [state.player.equipment.weapon, state.player.equipment.armor, state.player.equipment.trinket].filter(function (id) { return id && id.indexOf("relic_") === 0; }).length;
      if (relicEquipped >= 3) {
        eqInfo.innerHTML = lines.join(" · ") + "<br><span class='set-active'>⚜ " + T("set_active") + "</span>";
      } else if (relicEquipped > 0) {
        eqInfo.innerHTML = lines.join(" · ") + "<br><span class='set-progress'>⚜ " + T("set_progress", { n: relicEquipped }) + "</span>";
      }
      c.appendChild(eqInfo);

      var slots = document.createElement("div");
      slots.className = "eq-slots";
      ["weapon", "armor", "trinket"].forEach(function (slot) {
        var id = state.player.equipment[slot];
        var el = document.createElement("div");
        el.className = "eq-slot";
        el.innerHTML = "<span class='slot-label'>" + slot.toUpperCase() + "</span> <span class='slot-item'>" +
          (id ? L.name(D.items[id]) : "—") + "</span>";
        if (id) {
          var btn = mkButton(T("unequip"), "btn btn-small", function () {
            state.player.equipment[slot] = null;
            addItemSilent(id);
            ABYSS.Audio.item();
            saveNow();
            openInventory();
          });
          el.appendChild(btn);
        }
        slots.appendChild(el);
      });
      c.appendChild(slots);

      /* filter tags */
      var filterRow = document.createElement("div");
      filterRow.className = "inv-filters";
      var filters = ["all", "weapon", "armor", "trinket", "consumable"];
      filters.forEach(function (ft) {
        var b = mkButton(T("inv_filter_" + ft), "btn btn-small" + (openInventory.filter === ft ? " btn-active" : ""), function () {
          openInventory.filter = ft;
          openInventory();
        });
        filterRow.appendChild(b);
      });
      c.appendChild(filterRow);

      var grid = document.createElement("div");
      grid.className = "inv-grid";
      var curFilter = openInventory.filter || "all";
      state.player.inventory.filter(function (id) {
        if (curFilter === "all") return true;
        var it = D.items[id];
        return it && it.type === curFilter;
      }).forEach(function (id) {
        var it = D.items[id];
        var card = document.createElement("div");
        card.className = "inv-card";
        var nm = document.createElement("div");
        nm.className = "inv-name";
        nm.textContent = L.name(it);
        var fl = Logic.forgeLevel(state, id);
        if (fl > 0) {
          nm.textContent += "  +" + fl;
          nm.classList.add("inv-forged");
        }
        var dd = document.createElement("div");
        dd.className = "inv-desc";
        dd.textContent = L.desc(it);
        card.appendChild(nm);
        card.appendChild(dd);
        if (it.type !== "consumable") {
          var eqIdNow = state.player.equipment[it.slot];
          if (eqIdNow && eqIdNow !== id) {
            var cmp = D.items[eqIdNow];
            var diffParts = [];
            ["atk", "def", "spd", "luck", "hp"].forEach(function (k) {
              var a = it[k] || 0, b = cmp[k] || 0;
              if (a !== b) diffParts.push(k.toUpperCase() + (a > b ? "+" : "") + (a - b));
            });
            if (diffParts.length) {
              var diff = document.createElement("div");
              diff.className = "inv-diff " + (diffParts.some(function (s) { return s.indexOf("+") > 0; }) ? "" : "");
              diff.textContent = T("vs_equipped") + "：" + diffParts.join(" ");
              card.appendChild(diff);
            }
          }
        }
        if (it.type !== "consumable") {
          var slot = it.slot;
          var eqId = state.player.equipment[slot];
          var isEquipped = eqId === id;
          var btnLabel = isEquipped ? "✓ " + T("equip") : T("equip");
          var btn = mkButton(btnLabel, "btn btn-small " + (isEquipped ? "btn-equipped" : ""), function () {
            if (eqId) addItemSilent(eqId);
            state.player.equipment[slot] = id;
            var idx = state.player.inventory.indexOf(id);
            if (idx >= 0) state.player.inventory.splice(idx, 1);
            ABYSS.Audio.item();
            saveNow();
            openInventory();
          });
          card.appendChild(btn);
          if (!isEquipped) {
            var sellBtn = mkButton(T("sell") + " " + it.value + "🪙", "btn btn-small", function () {
              state.player.gold += it.value;
              var idx = state.player.inventory.indexOf(id);
              if (idx >= 0) state.player.inventory.splice(idx, 1);
              ABYSS.Audio.coin();
              saveNow();
              openInventory();
            });
            card.appendChild(sellBtn);
          }
        } else {
          var useBtn = mkButton(T("use"), "btn btn-small", function () {
            if (state.run.combat) {
              var evs = Logic.resolveTurn(state, { type: "item", itemId: id }, rng);
              consumeEvents(evs);
              afterTurn();
            } else {
              var evs2 = [];
              ABYSS.Logic.useItem(state, id, evs2, rng);
              consumeEvents(evs2);
              saveNow();
            }
            closeModal();
          });
          card.appendChild(useBtn);
        }
        grid.appendChild(card);
      });
      if (state.player.inventory.length === 0) c.appendChild(p("（" + T("no_item") + "）"));
      c.appendChild(grid);
    });
  }

  function openStats() {
    openModal(T("stats"), function (c) {
      var st = state.stats, p = state.player;
      var grid = document.createElement("div");
      grid.className = "stats-grid";
      var mins = Math.floor((st.playTimeSec || 0) / 60);
      var secs = (st.playTimeSec || 0) % 60;
      var cells = [
        [T("kills"), st.totalKills],
        [T("level"), p.level],
        [T("gold"), p.gold],
        ["🌀 " + L.name(D.PRESTIGE), st.prestige || 0],
        [T("best_depth"), st.bestDepth],
        [T("deaths"), st.totalDeaths],
        [T("play_time"), mins + ":" + String(secs).padStart(2, "0")],
        ["💠 " + T("fragment", {}), (st.fragments || []).length + "/3"],
        [T("achievements"), (st.achievements || []).length + "/" + Object.keys(D.achievements).length],
        ["🌟 " + L.name(D.achievements.elite_hunter), st.eliteKills],
        [T("winrate"), st.fights ? Math.round(st.wins / st.fights * 100) + "% (" + st.wins + "/" + st.fights + ")" : "—"]
      ];
      cells.forEach(function (pair) {
        var cell = document.createElement("div");
        cell.className = "stat-cell";
        var l = document.createElement("div");
        l.className = "stat-label";
        l.textContent = pair[0];
        var v = document.createElement("div");
        v.className = "stat-value";
        v.textContent = pair[1];
        cell.appendChild(l);
        cell.appendChild(v);
        grid.appendChild(cell);
      });
      c.appendChild(grid);
      /* boss kill list */
      var bosses = document.createElement("div");
      bosses.className = "ach-list";
      ["boss_grul", "boss_morg", "boss_steel", "boss_karaz", "boss_abyss"].forEach(function (id) {
        var got = st.bossesKilled && st.bossesKilled[id];
        var el = document.createElement("div");
        el.className = "ach-item " + (got ? "ach-got" : "ach-locked");
        el.innerHTML = "<span class='ach-icon'>" + (got ? "💀" : "❓") + "</span>" +
          "<span class='ach-name'>" + L.name(D.enemies[id]) + "</span>" +
          "<span class='ach-desc'>" + (got ? T("defeated") : T("undefeated")) + "</span>";
        bosses.appendChild(el);
      });
      var bh = document.createElement("h4");
      bh.textContent = "💀 " + T("enemy") + " Boss";
      c.appendChild(bh);
      c.appendChild(bosses);
      var endList = document.createElement("p");
      endList.className = "scene-stats";
      endList.textContent = "🏁 " + T("ending") + "：" + ((st.endings && st.endings.length) ? st.endings.map(function (id) { return L.name(D.endings[id]); }).join(" / ") : "—");
      c.appendChild(endList);
    });
  }

  function openAchievements() {
    openModal(T("achievements"), function (c) {
      var list = document.createElement("div");
      list.className = "ach-list";
      var unlocked = state.stats.achievements || [];
      for (var id in D.achievements) {
        (function (aid) {
          var got = unlocked.indexOf(aid) >= 0;
          var el = document.createElement("div");
          el.className = "ach-item " + (got ? "ach-got" : "ach-locked");
          el.innerHTML = "<span class='ach-icon'>" + (got ? "🏆" : "🔒") + "</span>" +
            "<span class='ach-name'>" + L.name(D.achievements[aid]) + "</span>" +
            "<span class='ach-desc'>" + L.desc(D.achievements[aid]) + "</span>";
          list.appendChild(el);
        })(id);
      }
      c.appendChild(list);
      var st = document.createElement("p");
      st.className = "scene-stats";
      st.textContent = unlocked.length + "/" + Object.keys(D.achievements).length + " " + T("achievements");
      c.appendChild(st);
    });
  }

  function openCodex() {
    openModal(T("codex"), function (c) {
      var tabs = document.createElement("div");
      tabs.className = "codex-tabs";
      var enemyTab = mkButton("👹 " + T("monsters"), "btn btn-small", null);
      var itemTab = mkButton("🎒 " + T("items"), "btn btn-small", null);
      tabs.appendChild(enemyTab);
      tabs.appendChild(itemTab);
      c.appendChild(tabs);

      var list = document.createElement("div");
      list.className = "codex-list";
      c.appendChild(list);

      var knownEnemies = Object.keys(state.stats.enemyKilled || {}).filter(function (k) { return k.indexOf("__elite") < 0; });
      var knownElite = Object.keys(state.stats.enemyKilled || {}).filter(function (k) { return k.indexOf("__elite") >= 0; }).map(function (k) { return k.replace("__elite", ""); });
      var knownItems = Object.keys(state.stats.collected || {});

      function renderEnemies() {
        list.innerHTML = "";
        enemyTab.classList.add("btn-active");
        itemTab.classList.remove("btn-active");
        var progress = document.createElement("p");
        progress.className = "scene-stats";
        progress.textContent = knownEnemies.length + "/" + Object.keys(D.enemies).length + " " + T("monsters") + " (" + Math.round(knownEnemies.length / Object.keys(D.enemies).length * 100) + "%)";
        list.appendChild(progress);
        for (var id in D.enemies) {
          (function (eid) {
            var got = knownEnemies.indexOf(eid) >= 0;
            var el = document.createElement("div");
            el.className = "codex-item " + (got ? "codex-got" : "codex-locked");
            if (got) {
              var e = D.enemies[eid];
              el.innerHTML = "<div class='codex-name'>" + (e.boss ? "💀 " : "👹 ") + L.name(e) + (knownElite.indexOf(eid) >= 0 ? " 🌟" : "") + "</div>" +
                "<div class='codex-desc'>" + L.desc(e) + "</div>" +
                "<div class='codex-meta'>❤" + e.hp + " ⚔" + e.atk + " 🛡" + e.def + " ⚡" + e.spd + " · " + T("xp") + " " + e.xp + " · 🪙" + e.gold + "</div>";
            } else {
              el.innerHTML = "<div class='codex-name codex-unknown'>？？？</div><div class='codex-desc'>" + T("codex_unknown") + "</div>";
            }
            list.appendChild(el);
          })(id);
        }
      }

      function renderItems() {
        list.innerHTML = "";
        itemTab.classList.add("btn-active");
        enemyTab.classList.remove("btn-active");
        var progress = document.createElement("p");
        progress.className = "scene-stats";
        progress.textContent = knownItems.length + "/" + Object.keys(D.items).length + " " + T("items") + " (" + Math.round(knownItems.length / Object.keys(D.items).length * 100) + "%)";
        list.appendChild(progress);
        for (var id in D.items) {
          (function (iid) {
            var got = knownItems.indexOf(iid) >= 0;
            var el = document.createElement("div");
            el.className = "codex-item " + (got ? "codex-got" : "codex-locked");
            if (got) {
              var it = D.items[iid];
              var meta = "";
              if (it.atk) meta += "⚔+" + it.atk + " ";
              if (it.def) meta += "🛡+" + it.def + " ";
              if (it.spd) meta += "⚡+" + it.spd + " ";
              if (it.luck) meta += "🍀+" + it.luck + " ";
              if (it.heal) meta += "💚" + (it.heal >= 9999 ? "∞" : it.heal) + " ";
              if (it.mana) meta += "💙" + (it.mana >= 9999 ? "∞" : it.mana) + " ";
              if (it.xp) meta += "📖+" + it.xp + "XP ";
              el.innerHTML = "<div class='codex-name'>" + L.name(it) + "</div>" +
                "<div class='codex-desc'>" + L.desc(it) + "</div>" +
                (meta ? "<div class='codex-meta'>" + meta + "</div>" : "");
            } else {
              el.innerHTML = "<div class='codex-name codex-unknown'>？？？</div><div class='codex-desc'>" + T("codex_unknown") + "</div>";
            }
            list.appendChild(el);
          })(id);
        }
      }

      enemyTab.addEventListener("click", renderEnemies);
      itemTab.addEventListener("click", renderItems);
      renderEnemies();
    });
  }

  function openHelp() {
    openModal(T("help"), function (c) {
      var lines = [
        T("help_explore"),
        T("help_combat"),
        T("help_cooldown"),
        T("help_elite"),
        T("help_boss"),
        T("help_fragments"),
        T("help_prestige_ui"),
        T("help_inv"),
        T("help_save"),
        T("help_keys")
      ];
      lines.forEach(function (line) {
        var d = document.createElement("p");
        d.className = "help-line";
        d.textContent = line;
        c.appendChild(d);
      });
      c.appendChild(mkButton(T("back"), "btn", closeModal));
    });
  }

  return {
    boot: boot,
    autostart: autostart,
    renderStaticTexts: renderStaticTexts,
    debugStartCombat: debugStartCombat,
    debugShowEnding: debugShowEnding,
    get state() { return state; }
  };
})();

/* CommonJS export for node tests */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ABYSS: ABYSS };
}



































