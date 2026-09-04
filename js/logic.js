/*
 * Abyss Echo - core game logic (pure, testable, no DOM)
 * All functions operate on a plain state object and return event lists.
 */
var ABYSS = window.ABYSS = window.ABYSS || {};

ABYSS.Logic = (function () {
  var D = ABYSS.DATA;

  /* ---------- deterministic RNG helpers (seeded) ---------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- state creation ---------- */
  function freshState() {
    return {
      version: D.VERSION,
      player: {
        name: "旅人", level: 1, xp: 0, hp: D.BASE_HP, mp: D.BASE_MP,
        gold: 20, kills: 0, deaths: 0,
        inventory: ["potion_small", "potion_small", "potion_mana"],
        equipment: { weapon: null, armor: null, trinket: null },
        statuses: {}
      },
      run: {
        alive: true, depth: 1, room: null, combat: null, eventDone: false,
        finalOpen: false, frags: 0, guards: 0
      },
      stats: {
        playTimeSec: 0, bestDepth: 1, totalKills: 0, totalDeaths: 0,
        achievements: [], endings: [], bossesKilled: {}, reviveUsed: false, fragments: [],
        eliteKills: 0, fortuneWins: 0, libraryVisits: 0, prestige: 0
      },
      settings: { sound: true, fastText: false, lang: "zh" }
    };
  }

  function xpNeeded(level) {
    return Math.floor(40 * Math.pow(level, 1.35));
  }

  /* ---------- derived stats ---------- */
  function equipped(state) {
    var p = state.player, eq = p.equipment, items = D.items, out = { atk: 0, def: 0, spd: 0, luck: 0, hp: 0, goldMult: 1, revive: false };
    [eq.weapon, eq.armor, eq.trinket].forEach(function (id) {
      if (!id || !items[id]) return;
      var it = items[id];
      out.atk += it.atk || 0; out.def += it.def || 0; out.spd += it.spd || 0;
      out.luck += it.luck || 0; out.hp += it.hp || 0;
      if (it.goldMult) out.goldMult = it.goldMult;
      if (it.revive) out.revive = true;
    });
    return out;
  }

  function statusMods(statuses, kind) {
    var atk = 0, def = 0, spd = 0;
    for (var id in statuses) {
      var s = D.statuses[id];
      if (!s) continue;
      if (kind === "player" && s.kind !== "buff") continue;
      if (kind === "enemy" && s.kind === "buff") continue;
      atk += s.atkMod || 0; def += s.defMod || 0; spd += s.spdMod || 0;
    }
    return { atk: atk, def: def, spd: spd };
  }

  function playerStats(state) {
    var p = state.player, eq = equipped(state);
    var base = {
      hp: D.BASE_HP + (p.level - 1) * D.HP_PER_LVL + eq.hp,
      mp: D.BASE_MP + (p.level - 1) * D.MP_PER_LVL,
      atk: D.BASE_ATK + (p.level - 1) * D.ATK_PER_LVL + eq.atk,
      def: D.BASE_DEF + (p.level - 1) * D.DEF_PER_LVL + eq.def,
      spd: D.BASE_SPD + (p.level - 1) * D.SPD_PER_LVL + eq.spd,
      luck: D.BASE_LCK + eq.luck
    };
    /* prestige: permanent +% stats per mark */
    var pg = state.stats.prestige || 0;
    if (pg > 0) {
      base.atk = Math.floor(base.atk * (1 + D.PRESTIGE.atkPerLvl * pg));
      base.def = Math.floor(base.def * (1 + D.PRESTIGE.defPerLvl * pg));
      base.spd = Math.max(1, Math.floor(base.spd * (1 + D.PRESTIGE.spdPerLvl * pg)));
    }
    var m = statusMods(p.statuses, "player");
    base.atk = Math.max(1, Math.floor(base.atk * (1 + m.atk)));
    base.def = Math.max(0, Math.floor(base.def * (1 + m.def)));
    base.spd = Math.max(1, base.spd + m.spd);
    return base;
  }

  function enemyMaxHp(state, enemyId, elite) {
    var e = D.enemies[enemyId];
    var maxHp = e.hp;
    if (elite) maxHp = Math.floor(maxHp * 1.5);
    var pg = state.stats.prestige || 0;
    if (pg > 0) maxHp = Math.floor(maxHp * (1 + 0.03 * pg));
    return maxHp;
  }

  function enemyStats(state) {
    var c = state.run.combat, e = D.enemies[c.enemyId];
    var elite = !!c.elite;
    var maxHp = enemyMaxHp(state, c.enemyId, elite);
    var hp = c.enemyHp, atk = e.atk, def = e.def, spd = e.spd;
    if (elite) {
      atk = Math.floor(e.atk * 1.5);
      def = Math.floor(e.def * 1.5);
      spd = Math.floor(e.spd * 1.25);
    }
    /* rebirth scaling: +3% enemy power per abyss mark keeps late game spicy */
    var pg = state.stats.prestige || 0;
    if (pg > 0) {
      var factor = 1 + 0.03 * pg;
      atk = Math.floor(atk * factor);
      def = Math.floor(def * factor);
    }
    var m = statusMods(c.enemyStatuses || {}, "enemy");
    atk = Math.max(1, Math.floor(atk * (1 + m.atk)));
    def = Math.max(0, Math.floor(def * (1 + m.def)));
    spd = Math.max(1, spd + m.spd);
    return { hp: hp, maxHp: maxHp, atk: atk, def: def, spd: spd, name: e.name, elite: elite };
  }

  /* ---------- damage ---------- */
  function rollDamage(atk, def, luck, power, rng) {
    var variance = 0.9 + rng() * 0.2;
    var dmg = Math.max(1, Math.floor((atk * power - def * 0.6) * variance));
    var critChance = Math.min(0.35, 0.05 + luck * 0.01);
    var crit = rng() < critChance;
    if (crit) dmg = Math.floor(dmg * 1.7);
    return { dmg: dmg, crit: crit };
  }

  function dodgeChance(mySpd, theirSpd) {
    return Math.min(0.3, Math.max(0.05, 0.08 + (mySpd - theirSpd) * 0.02));
  }

  /* ---------- statuses ---------- */
  function hasHarmful(statuses) {
    for (var id in statuses) if (D.statuses[id] && D.statuses[id].kind === "harm") return true;
    return false;
  }

  function applyStatus(state, who, statusId, dur, events) {
    var pool = who === "player" ? state.player.statuses : state.run.combat.enemyStatuses;
    if (D.statuses[statusId]) {
      pool[statusId] = Math.max(pool[statusId] || 0, dur || 3);
      events.push({ type: "status", who: who, status: statusId, msg: "" });
    }
  }

  function tickStatuses(statuses) {
    var out = [], consumed = [];
    for (var id in statuses) {
      var s = D.statuses[id];
      if (s && s.tick) out.push({ status: id, damage: s.damage });
      statuses[id] -= 1;
      if (statuses[id] <= 0) consumed.push(id);
    }
    consumed.forEach(function (id) { delete statuses[id]; });
    return out;
  }

  /* ---------- combat resolution ----------
   * action: { type:'attack'|'guard'|'flee'|'skill'|'item', skillId?, itemId? }
   * returns events; mutates state.
   */
  function resolveTurn(state, action, rng) {
    rng = rng || Math.random;
    var events = [], p = state.player, c = state.run.combat;
    if (!c) return events;
    var e = D.enemies[c.enemyId];
    var ps = playerStats(state), es = enemyStats(state);

    /* --- player action --- */
    if (action.type === "flee") {
      var fleeOk = rng() < 0.55 + (ps.spd - es.spd) * 0.02;
      if (fleeOk) {
        events.push({ type: "flee", ok: true });
        state.run.combat = null;
        return events;
      }
      events.push({ type: "flee", ok: false });
      c.fleePenalty = (c.fleePenalty || 0) + 1;
    } else if (action.type === "guard") {
      c.guarding = true;
      events.push({ type: "guard" });
    } else if (action.type === "item") {
      useItem(state, action.itemId, events, rng);
    } else if (action.type === "skill") {
      var sk = D.skills[action.skillId];
      if (!sk) return events;
      if (p.mp < sk.mp) {
        events.push({ type: "noMp" });
        return events;
      }
      if (c.skillCd && c.skillCd[action.skillId] > 0) {
        events.push({ type: "skillCd" });
        return events;
      }
      p.mp -= sk.mp;
      if (sk.buff) {
        applyStatus(state, "player", sk.buff, 3, events);
        events.push({ type: "skill", skill: action.skillId });
      } else if (sk.cleanse) {
        for (var sid in p.statuses) {
          var s = D.statuses[sid];
          if (s && s.kind === "harm") delete p.statuses[sid];
        }
        events.push({ type: "skill", skill: action.skillId });
      } else {
        var hits = sk.hits || 1;
        for (var i = 0; i < hits && c.enemyHp > 0; i++) {
          var r = rollDamage(ps.atk, es.def, ps.luck, sk.power, rng);
          c.enemyHp -= r.dmg;
          events.push({ type: "hit", target: "enemy", dmg: r.dmg, crit: r.crit, skill: action.skillId });
        }
        if (sk.status && c.enemyHp > 0 && rng() < 0.75) {
          applyStatus(state, "enemy", sk.status, 3, events);
        }
        if (sk.drain && c.enemyHp > 0) {
          var healed = Math.max(1, Math.floor(r.dmg * sk.drain));
          p.hp = Math.min(ps.hp, p.hp + healed);
          events.push({ type: "drain", amount: healed });
        }
      }
      c.skillCd = c.skillCd || {};
      if (sk.cooldown > 0) c.skillCd[action.skillId] = sk.cooldown;
    } else { /* attack */
      var rr = rollDamage(ps.atk, es.def, ps.luck, 1, rng);
      c.enemyHp -= rr.dmg;
      events.push({ type: "hit", target: "enemy", dmg: rr.dmg, crit: rr.crit });
    }

    /* --- enemy death check --- */
    if (c && c.enemyHp <= 0) {
      var drop = rollDrops(state, c.enemyId, rng, c.elite);
      var mult = c.elite ? 2 : 1;
      var gGain = e.gold * mult;
      if (drop.goldMult) gGain = Math.floor(gGain * drop.goldMult);
      p.gold += gGain;
      p.kills += 1;
      state.stats.totalKills += 1;
      if (c.elite) state.stats.eliteKills += 1;
      p.hp = Math.min(playerStats(state).hp, p.hp);
      events.push({ type: "kill", enemy: c.enemyId, xp: e.xp * mult, gold: gGain, drops: drop.items, elite: !!c.elite });
      /* refresher: kill grants xp on a later consolidate call when not in combat */
      if (e.boss) events.push({ type: "bossKilled", enemy: c.enemyId });
      state.run.combat = null;
      state.run.eventDone = true;
      return events;
    }

    /* refresh derived stats for enemy turn */
    es = enemyStats(state);
    ps = playerStats(state);

    /* --- tick player statuses (poison etc) --- */
    var ticks = tickStatuses(p.statuses);
    ticks.forEach(function (t) {
      var amount = Math.max(0, Math.min(p.hp, Math.floor((D.statuses[t.status].damage + 0) * (0.85 + rng() * 0.3))));
      p.hp -= amount;
      events.push({ type: "tick", who: "player", status: t.status, dmg: amount });
      if (p.hp <= 0) return;
    });
    if (p.hp <= 0) {
      handleDeath(state, events);
      return events;
    }

    /* decrement skill cooldowns */
    if (c.skillCd) {
      for (var skid in c.skillCd) {
        if (c.skillCd[skid] > 0) c.skillCd[skid] -= 1;
      }
    }

    /* --- enemy turn --- */
    if (rng() >= dodgeChance(ps.spd, es.spd)) {
      var def = c.guarding ? ps.def * 2 : ps.def;
      var er = rollDamage(es.atk, def, 0, 1, rng);
      var dealt = Math.max(0, Math.min(p.hp, er.dmg));
      p.hp -= dealt;
      events.push({ type: "hit", target: "player", dmg: er.dmg, crit: er.crit, blocked: c.guarding && er.dmg > 0 });
      if (p.hp <= 0) {
        handleDeath(state, events);
        return events;
      }
      /* enemy special ability */
      if (e.ability && rng() < (e.ability.chance || 0.3)) {
        if (e.ability.status) {
          applyStatus(state, "player", e.ability.status, 3, events);
          events.push({ type: "enemyAbility", enemy: c.enemyId, status: e.ability.status });
        }
        if (e.ability.drain) {
          var heal2 = Math.min(es.maxHp, Math.floor(e.ability.drain * dealt) + 1);
          c.enemyHp = Math.min(e.hp, c.enemyHp + heal2);
          events.push({ type: "drain", target: "enemy", amount: heal2 });
        }
      }
    } else {
      events.push({ type: "dodge", who: "player" });
    }
    c.guarding = false;

    /* --- tick enemy statuses --- */
    var eticks = tickStatuses(c.enemyStatuses || {});
    eticks.forEach(function (t) {
      var amount = Math.max(0, Math.min(c.enemyHp, Math.floor(D.statuses[t.status].damage * (0.85 + rng() * 0.3))));
      c.enemyHp -= amount;
      events.push({ type: "tick", who: "enemy", status: t.status, dmg: amount });
    });
    if (c.enemyHp <= 0) {
      var drop2 = rollDrops(state, c.enemyId, rng, c.elite);
      var mult2 = c.elite ? 2 : 1;
      var g2 = Math.floor(e.gold * mult2 * drop2.goldMult);
      p.gold += g2;
      p.kills += 1;
      state.stats.totalKills += 1;
      if (c.elite) state.stats.eliteKills += 1;
      events.push({ type: "kill", enemy: c.enemyId, xp: e.xp * mult2, gold: g2, drops: drop2.items, elite: !!c.elite });
      if (e.boss) events.push({ type: "bossKilled", enemy: c.enemyId });
      state.run.combat = null;
      state.run.eventDone = true;
    }
    return events;
  }

  function useItem(state, itemId, events, rng) {
    var p = state.player, it = D.items[itemId];
    var idx = p.inventory.indexOf(itemId);
    if (it.type !== "consumable" || idx < 0) return;
    if (it.heal) {
      var ps = playerStats(state);
      var healed = Math.min(ps.hp - p.hp, it.heal);
      p.hp += healed;
      events.push({ type: "heal", amount: Math.max(0, healed), item: itemId });
    }
    if (it.mana) {
      var ps2 = playerStats(state);
      var mpHeal = Math.min(ps2.mp - p.mp, it.mana);
      p.mp += mpHeal;
      events.push({ type: "mpRestore", amount: Math.max(0, mpHeal), item: itemId });
    }
    if (it.damage && state.run.combat) {
      var c = state.run.combat;
      c.enemyHp -= it.damage;
      events.push({ type: "hit", target: "enemy", dmg: it.damage, item: itemId });
    }
    if (it.xp) {
      gainXp(state, it.xp, events);
      events.push({ type: "xpGain", amount: it.xp, item: itemId });
    }
    if (it.cure) {
      it.cure.forEach(function (sid) { delete p.statuses[sid]; });
      events.push({ type: "cure", item: itemId });
    }
    if (it.cureAll && hasHarmful(p.statuses)) {
      for (var sid in p.statuses) {
        var s = D.statuses[sid];
        if (s && s.kind === "harm") delete p.statuses[sid];
      }
      events.push({ type: "cureAll", item: itemId });
    }
    if (it.status) {
      applyStatus(state, "player", it.status, 3, events);
      events.push({ type: "buffItem", item: itemId });
    }
    p.inventory.splice(idx, 1);
    if (p.inventory.length < D.INV_LIMIT && rng() < 0.03 && false) { /* reserved */ }
  }

  function handleDeath(state, events) {
    var p = state.player;
    var revive = equipped(state).revive && !state.stats.reviveUsed;
    if (revive) {
      state.stats.reviveUsed = true;
      p.hp = Math.max(1, Math.floor(playerStats(state).hp * 0.3));
      p.inventory = p.inventory.filter(function (id) { return id !== "phoenix"; });
      if (state.run.combat && state.run.combat.enemyStatuses) {
        for (var sid in p.statuses) delete p.statuses[sid];
      }
      events.push({ type: "revive" });
      return;
    }
    p.deaths += 1;
    state.stats.totalDeaths += 1;
    state.run.alive = false;
    state.run.combat = null;
    events.push({ type: "death" });
  }

  /* ---------- loot ---------- */
  var LOOT_TABLE = [
    { tier: [1], items: ["potion_small", "potion_small", "potion_mana", "sword_rust", "cloth", "charm_luck"], weight: 1 },
    { tier: [2], items: ["potion_big", "bow_hunter", "leather", "dagger_moon", "potion_antidote", "ring_power"], weight: 1 },
    { tier: [3], items: ["potion_big", "axe_rune", "chainmail", "bomb_fire", "holy_water", "potion_rage", "amulet_life"], weight: 1 },
    { tier: [4], items: ["blade_shadow", "rune_armor", "spear_dragon", "hammer_void", "scale_dragon", "elixir_life", "scroll_arcane", "bomb_fire", "potion_big", "coin_greed", "cloak_shadow"], weight: 1 }
  ];

  function rollDrops(state, enemyId, rng, elite) {
    var e = D.enemies[enemyId], out = { items: [], goldMult: 1 };
    var eq = equipped(state);
    var prestigeGold = 1 + (D.PRESTIGE.goldPerLvl * (state.stats.prestige || 0));
    out.goldMult = (eq.goldMult || 1) * prestigeGold;
    if (e.boss) {
      /* boss guaranteed drop from its tier */
      var t = Math.min(4, e.tier + 1);
      var table = LOOT_TABLE.filter(function (l) { return l.tier.indexOf(t) >= 0; })[0] || LOOT_TABLE[3];
      out.items.push(table.items[Math.floor(rng() * table.items.length)]);
      if (e.final) {
        out.items.push("blade_abyss");
        out.items.push("armor_abyss");
      }
    } else if (rng() < 0.28) {
      var table2 = LOOT_TABLE.filter(function (l) { return l.tier.indexOf(e.tier) >= 0; })[0] || LOOT_TABLE[0];
      out.items.push(table2.items[Math.floor(rng() * table2.items.length)]);
    }
    /* elites always drop a bonus item */
    if (elite) {
      var table3 = LOOT_TABLE.filter(function (l) { return l.tier.indexOf(e.tier) >= 0; })[0] || LOOT_TABLE[0];
      out.items.push(table3.items[Math.floor(rng() * table3.items.length)]);
    }
    return out;
  }

  /* ---------- XP & levels ---------- */
  function gainXp(state, xp, events) {
    var p = state.player;
    p.xp += xp;
    events = events || [];
    while (p.xp >= xpNeeded(p.level)) {
      p.xp -= xpNeeded(p.level);
      p.level += 1;
      p.hp = Math.min(playerStats(state).hp, p.hp + D.HP_PER_LVL);
      p.mp = Math.min(playerStats(state).mp, p.mp + D.MP_PER_LVL);
      events.push({ type: "levelup", level: p.level });
    }
    return events;
  }

  /* ---------- room & encounter generation ---------- */
  var ROOM_TYPES = ["combat", "combat", "combat", "event", "event", "rest", "chest", "trap"];

  var ELITE_CHANCE = 0.15;

  function generateRoom(state, rng) {
    rng = rng || Math.random;
    var depth = state.run.depth;
    var isBossFloor = depth % 3 === 0;
    var type = isBossFloor ? "boss" : ROOM_TYPES[Math.floor(rng() * ROOM_TYPES.length)];
    var room = { type: type, eventId: null, explored: false, elite: false };
    if (type === "event") {
      var ids = Object.keys(D.events);
      room.eventId = ids[Math.floor(rng() * ids.length)];
    }
    if (type === "combat" || type === "boss") {
      room.enemyId = pickEnemy(state, rng, type === "boss");
      /* elites only spawn on normal combat, never bosses */
      room.elite = type === "combat" && rng() < ELITE_CHANCE;
    }
    return room;
  }

  var TIER_POOL = { 1: ["rat", "bat", "slime", "ghoul"], 2: ["goblin", "wolf", "wraith", "skeleton"], 3: ["minion", "spider", "leech", "golem"], 4: ["hunter", "watcher", "soulsucker", "chaosmage"] };

  function pickEnemy(state, rng, forceBoss) {
    var depth = state.run.depth;
    var bossMap = { 3: "boss_grul", 6: "boss_morg", 9: "boss_steel", 12: "boss_karaz" };
    if (state.run.finalOpen && depth >= 12) return "boss_abyss";
    if (forceBoss) {
      if (bossMap[depth]) return bossMap[depth];
      if (depth > 12 && state.run.finalOpen) return "boss_abyss";
    }
    var tier = Math.min(4, Math.ceil(depth / 3));
    var pool = TIER_POOL[tier];
    return pool[Math.floor(rng() * pool.length)];
  }

  /* ---------- exploration ---------- */
  function descend(state, rng) {
    state.run.depth += 1;
    state.run.eventDone = false;
    state.run.room = null;
    state.run.combat = null;
    return state.run.depth;
  }

  function makeCamp(state, events) {
    var ps = playerStats(state);
    state.player.hp = Math.min(ps.hp, state.player.hp + Math.floor(ps.hp * 0.4));
    state.player.mp = Math.min(ps.mp, state.player.mp + Math.floor(ps.mp * 0.5));
    events.push({ type: "camp" });
    state.run.eventDone = true;
    return events;
  }

  /* ---------- achievements ---------- */
  function checkAchievements(state, events) {
    events = events || [];
    var st = state.stats, p = state.player, list = st.achievements;
    var defs = {
      first_step: function () { return st.bestDepth >= 1; },
      first_blood: function () { return p.kills >= 1; },
      depth_3: function () { return st.bestDepth >= 3; },
      depth_6: function () { return st.bestDepth >= 6; },
      depth_9: function () { return st.bestDepth >= 9; },
      depth_12: function () { return st.bestDepth >= 12; },
      boss_1: function () { return st.bossesKilled && st.bossesKilled.boss_grul; },
      boss_2: function () { return st.bossesKilled && st.bossesKilled.boss_morg; },
      boss_3: function () { return st.bossesKilled && st.bossesKilled.boss_steel; },
      boss_4: function () { return st.bossesKilled && st.bossesKilled.boss_karaz; },
      slayer: function () { return st.bossesKilled && st.bossesKilled.boss_abyss; },
      kills_25: function () { return st.totalKills >= 25; },
      kills_100: function () { return st.totalKills >= 100; },
      level_10: function () { return p.level >= 10; },
      level_20: function () { return p.level >= 20; },
      rich: function () { return p.gold >= 500; },
      collector: function () { return collectCount(state) >= 12; },
      survivor: function () { return !!st.reviveUsed; },
      truth: function () { return st.fragments && st.fragments.length >= 3; },
      elite_hunter: function () { return st.eliteKills >= 10; },
      fortune: function () { return st.fortuneWins >= 3; },
      bookworm: function () { return st.libraryVisits >= 3; },
      prestige_1: function () { return (st.prestige || 0) >= 1; }
    };
    for (var id in defs) {
      if (list.indexOf(id) < 0 && defs[id]()) {
        list.push(id);
        events.push({ type: "achievement", id: id });
      }
    }
    return events;
  }

  function collectCount(state) {
    var seen = {};
    state.player.inventory.forEach(function (id) { seen[id] = true; });
    ["weapon", "armor", "trinket"].forEach(function (slot) {
      var id = state.player.equipment[slot];
      if (id) seen[id] = true;
    });
    return Object.keys(seen).length;
  }

  /* ---------- fragments ---------- */
  function grantFragment(state, fragId, events) {
    state.stats.fragments = state.stats.fragments || [];
    if (state.stats.fragments.indexOf(fragId) < 0) {
      state.stats.fragments.push(fragId);
      state.run.frags += 1;
      events.push({ type: "fragment", frag: fragId, count: state.stats.fragments.length });
    }
  }

  /* ---------- prestige / rebirth ---------- */
  function prestige(state) {
    var keep = {
      achievements: (state.stats.achievements || []).slice(),
      endings: (state.stats.endings || []).slice(),
      fragments: (state.stats.fragments || []).slice(),
      bossesKilled: JSON.parse(JSON.stringify(state.stats.bossesKilled || {})),
      prestige: (state.stats.prestige || 0) + 1,
      reviveUsed: !!state.stats.reviveUsed,
      playTimeSec: state.stats.playTimeSec || 0,
      totalDeaths: state.stats.totalDeaths || 0,
      bestDepth: state.stats.bestDepth || 1,
      gold: Math.floor(state.player.gold * 0.2)
    };
    var fresh = freshState();
    fresh.stats.achievements = keep.achievements;
    fresh.stats.endings = keep.endings;
    fresh.stats.fragments = keep.fragments;
    fresh.stats.bossesKilled = keep.bossesKilled;
    fresh.stats.prestige = keep.prestige;
    fresh.stats.reviveUsed = keep.reviveUsed;
    fresh.stats.playTimeSec = keep.playTimeSec;
    fresh.stats.totalDeaths = keep.totalDeaths;
    fresh.stats.bestDepth = keep.bestDepth;
    fresh.stats.eliteKills = 0;
    fresh.stats.fortuneWins = 0;
    fresh.stats.libraryVisits = 0;
    fresh.player.gold = keep.gold;
    fresh.player.name = state.player.name;
    return fresh;
  }

  return {
    mulberry32: mulberry32,
    freshState: freshState,
    xpNeeded: xpNeeded,
    playerStats: playerStats,
    enemyStats: enemyStats,
    enemyMaxHp: enemyMaxHp,
    equipped: equipped,
    rollDamage: rollDamage,
    resolveTurn: resolveTurn,
    useItem: useItem,
    gainXp: gainXp,
    generateRoom: generateRoom,
    pickEnemy: pickEnemy,
    descend: descend,
    makeCamp: makeCamp,
    checkAchievements: checkAchievements,
    grantFragment: grantFragment,
    prestige: prestige,
    applyStatus: applyStatus,
    tickStatuses: tickStatuses,
    hasHarmful: hasHarmful,
    collectCount: collectCount,
    rollDrops: rollDrops,
    TIER_POOL: TIER_POOL
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ABYSS: ABYSS };
}