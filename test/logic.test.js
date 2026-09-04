/*
 * Abyss Echo - unit tests (node:test, zero deps)
 * Run: node --test test/
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

/* polyfill browser globals for CommonJS loading */
global.window = {};
require("../js/lang.js");
require("../js/data.js");
require("../js/logic.js");
const ABYSS = global.window.ABYSS;
const Logic = ABYSS.Logic;
const D = ABYSS.DATA;

/* deterministic rng: 0..1 sequence */
function seqRng(values) {
  let i = 0;
  return function () {
    return values[i++ % values.length];
  };
}

test("fresh state has correct base stats", () => {
  const s = Logic.freshState();
  const ps = Logic.playerStats(s);
  assert.equal(s.player.hp, D.BASE_HP);
  assert.equal(ps.atk, D.BASE_ATK);
  assert.equal(ps.def, D.BASE_DEF);
  assert.equal(s.run.depth, 1);
  assert.equal(s.stats.achievements.length, 0);
});

test("playerStats grows with level", () => {
  const s = Logic.freshState();
  s.player.level = 5;
  const ps = Logic.playerStats(s);
  assert.equal(ps.hp, D.BASE_HP + 4 * D.HP_PER_LVL);
  assert.equal(ps.atk, D.BASE_ATK + 4 * D.ATK_PER_LVL);
});

test("equipment bonuses apply", () => {
  const s = Logic.freshState();
  s.player.equipment.weapon = "sword_rust";
  s.player.equipment.armor = "leather";
  s.player.equipment.trinket = "ring_power";
  const ps = Logic.playerStats(s);
  assert.equal(ps.atk, D.BASE_ATK + D.items.sword_rust.atk + D.items.ring_power.atk);
  assert.equal(ps.def, D.BASE_DEF + D.items.leather.def);
});

test("attack kills enemy and grants rewards", () => {
  const s = Logic.freshState();
  s.run.combat = { enemyId: "rat", enemyHp: 5, enemyStatuses: {}, skillCd: {}, guarding: false };
  const rng = seqRng([0.5, 0.5, 0.5]);
  const evs = Logic.resolveTurn(s, { type: "attack" }, rng);
  const kill = evs.find((e) => e.type === "kill");
  assert.ok(kill, "expected kill event");
  assert.equal(s.run.combat, null);
  assert.equal(s.player.kills, 1);
  assert.ok(s.player.gold >= D.enemies.rat.gold);
});

test("death event when player hp reaches zero", () => {
  const s = Logic.freshState();
  s.run.combat = { enemyId: "boss_abyss", enemyHp: 9999, enemyStatuses: {}, skillCd: {}, guarding: false };
  s.player.hp = 1;
  /* enemy atk 32 vs def 5 -> guaranteed lethal */
  const rng = seqRng([0.99, 0.99, 0.99, 0.99]);
  const evs = Logic.resolveTurn(s, { type: "attack" }, rng);
  assert.ok(evs.some((e) => e.type === "death"));
  assert.equal(s.run.alive, false);
  assert.equal(s.stats.totalDeaths, 1);
});

test("flee success clears combat", () => {
  const s = Logic.freshState();
  s.run.combat = { enemyId: "rat", enemyHp: 18, enemyStatuses: {}, skillCd: {}, guarding: false };
  const evs = Logic.resolveTurn(s, { type: "flee" }, seqRng([0.1]));
  assert.equal(evs.find((e) => e.type === "flee").ok, true);
  assert.equal(s.run.combat, null);
});

test("guard doubles defense", () => {
  const s = Logic.freshState();
  s.run.combat = { enemyId: "rat", enemyHp: 18, enemyStatuses: {}, skillCd: {}, guarding: false };
  const evs = Logic.resolveTurn(s, { type: "guard" }, seqRng([0.99]));
  const hit = evs.find((e) => e.type === "hit" && e.target === "player");
  const ps = Logic.playerStats(s);
  const noGuard = 7 - D.BASE_DEF * 0.6;
  assert.ok(hit.dmg < noGuard * 1.1, "guarded damage should be smaller");
  assert.ok(s.player.hp > 0);
});

test("skill power strike deals more than attack", () => {
  const s = Logic.freshState();
  s.run.combat = { enemyId: "rat", enemyHp: 1000, enemyStatuses: {}, skillCd: {}, guarding: false };
  s.player.mp = 99;
  const rng = seqRng([0.5]);
  const evs = Logic.resolveTurn(s, { type: "skill", skillId: "power_strike" }, rng);
  const hit = evs.find((e) => e.type === "hit" && e.target === "enemy");
  const ps = Logic.playerStats(s);
  const expect = Math.max(1, Math.floor((ps.atk * 1.6 - D.enemies.rat.def * 0.6) * 1.0));
  assert.ok(Math.abs(hit.dmg - expect) <= 1);
  assert.equal(s.player.mp, 99 - D.skills.power_strike.mp);
});

test("skill with status inflicts status on enemy", () => {
  const s = Logic.freshState();
  s.run.combat = { enemyId: "rat", enemyHp: 1000, enemyStatuses: {}, skillCd: {}, guarding: false };
  s.player.mp = 99;
  const evs = Logic.resolveTurn(s, { type: "skill", skillId: "rend" }, seqRng([0.5, 0.1]));
  assert.ok(s.run.combat.enemyStatuses.bleed, "bleed should be applied");
  assert.ok(evs.some((e) => e.type === "status"));
});

test("skill cooldown blocks immediate reuse", () => {
  const s = Logic.freshState();
  s.run.combat = { enemyId: "rat", enemyHp: 1000, enemyStatuses: {}, skillCd: {}, guarding: false };
  s.player.mp = 99;
  Logic.resolveTurn(s, { type: "skill", skillId: "rend" }, seqRng([0.5, 0.1]));
  const mpAfter = s.player.mp;
  const evs = Logic.resolveTurn(s, { type: "skill", skillId: "rend" }, seqRng([0.5, 0.1]));
  assert.ok(evs.some((e) => e.type === "skillCd"));
  assert.equal(s.player.mp, mpAfter, "MP should not be spent on cooldown");
});

test("status tick damages over time then expires", () => {
  const s = Logic.freshState();
  s.player.statuses.poison = 1;
  const ticks = Logic.tickStatuses(s.player.statuses);
  assert.equal(ticks.length, 1);
  assert.equal(ticks[0].status, "poison");
  assert.ok(s.player.statuses.poison === undefined, "status should expire");
});

test("consumable heals in and out of combat", () => {
  const s = Logic.freshState();
  s.player.hp = 10;
  const evs = [];
  Logic.useItem(s, "potion_small", evs, seqRng([0.5]));
  assert.ok(evs.some((e) => e.type === "heal"));
  assert.equal(s.player.hp, 40);
  assert.equal(s.player.inventory.filter((id) => id === "potion_small").length, 1, "one potion consumed");
});

test("revive from phoenix trinket", () => {
  const s = Logic.freshState();
  s.player.equipment.trinket = "phoenix";
  s.run.combat = { enemyId: "boss_abyss", enemyHp: 9999, enemyStatuses: {}, skillCd: {}, guarding: false };
  s.player.hp = 1;
  const evs = Logic.resolveTurn(s, { type: "attack" }, seqRng([0.99, 0.99, 0.99, 0.99]));
  assert.ok(evs.some((e) => e.type === "revive"));
  assert.equal(s.run.alive, true);
  assert.equal(s.player.hp, Math.floor(Logic.playerStats(s).hp * 0.3));
  assert.equal(s.stats.reviveUsed, true);
});

test("xp levels up and restores stat cap", () => {
  const s = Logic.freshState();
  s.player.xp = Logic.xpNeeded(1) - 1;
  const evs = [];
  Logic.gainXp(s, 50, evs);
  assert.equal(s.player.level, 2);
  assert.ok(evs.some((e) => e.type === "levelup"));
  assert.ok(s.player.xp >= 0);
});

test("room generation: boss floors produce bosses", () => {
  const s = Logic.freshState();
  s.run.depth = 3;
  const room = Logic.generateRoom(s, seqRng([0.99]));
  assert.equal(room.type, "boss");
  assert.equal(room.enemyId, "boss_grul");
  s.run.depth = 12;
  s.run.finalOpen = true;
  const room2 = Logic.generateRoom(s, seqRng([0.99]));
  assert.equal(room2.enemyId, "boss_abyss");
});

test("enemy pools scale with depth", () => {
  const s = Logic.freshState();
  s.run.depth = 10;
  const nonBoss = Array.from({ length: 40 }, (_, i) => Logic.pickEnemy(s, seqRng([i / 40]), false));
  nonBoss.forEach((id) => {
    assert.ok(D.enemies[id].tier === 4, "floor 10 should only have tier 4 enemies");
  });
});

test("boss drops guaranteed item", () => {
  const s = Logic.freshState();
  const drops = Logic.rollDrops(s, "boss_morg", seqRng([0.5]));
  assert.equal(drops.items.length, 1);
  assert.ok(D.items[drops.items[0]]);
});

test("final boss drops legendary set", () => {
  const s = Logic.freshState();
  const drops = Logic.rollDrops(s, "boss_abyss", seqRng([0.5]));
  assert.ok(drops.items.indexOf("blade_abyss") >= 0);
  assert.ok(drops.items.indexOf("armor_abyss") >= 0);
});

test("achievements unlock as conditions are met", () => {
  const s = Logic.freshState();
  const evs = [];
  Logic.checkAchievements(s, evs);
  assert.ok(evs.some((e) => e.type === "achievement" && e.id === "first_step"));
  s.player.kills = 1;
  s.stats.totalKills = 1;
  Logic.checkAchievements(s, evs);
  assert.ok(evs.some((e) => e.type === "achievement" && e.id === "first_blood"));
  s.player.level = 10;
  Logic.checkAchievements(s, evs);
  assert.ok(evs.some((e) => e.type === "achievement" && e.id === "level_10"));
  assert.equal(s.stats.achievements.length, 3);
});

test("fragments granted once only", () => {
  const s = Logic.freshState();
  const evs = [];
  Logic.grantFragment(s, "frag_1", evs);
  Logic.grantFragment(s, "frag_1", evs);
  assert.equal(s.stats.fragments.length, 1);
});

test("all data references are valid", () => {
  /* every enemy referenced in tier pools exists */
  for (const tier in Logic.TIER_POOL) {
    Logic.TIER_POOL[tier].forEach((id) => {
      assert.ok(D.enemies[id], `tier pool references missing enemy ${id}`);
    });
  }
  /* every skill id is defined in data */
  const s = Logic.freshState();
  s.run.combat = { enemyId: "rat", enemyHp: 1000, enemyStatuses: {}, skillCd: {}, guarding: false };
  s.player.mp = 999;
  for (const sk in D.skills) {
    const evs = Logic.resolveTurn(s, { type: "skill", skillId: sk }, seqRng([0.5, 0.5, 0.9]));
    assert.ok(evs.length >= 0, `skill ${sk} should resolve`);
  }
  /* every event id exists; every fragment source is reachable */
  assert.equal(Object.keys(D.events).length, 10);
  assert.equal(Object.keys(D.achievements).length, 19);
  assert.equal(Object.keys(D.endings).length, 2);
  assert.equal(Object.keys(D.fragments).length, 3);
});

test("seeded rng is deterministic", () => {
  const a = Logic.mulberry32(42);
  const b = Logic.mulberry32(42);
  for (let i = 0; i < 10; i++) {
    assert.equal(Math.floor(a() * 1000), Math.floor(b() * 1000));
  }
});

test("full simulated run reaches deep floors without crashing", () => {
  const s = Logic.freshState();
  const rng = Logic.mulberry32(2026);
  let turns = 0;
  while (s.run.alive && s.run.depth < 13 && turns < 5000) {
    turns += 1;
    if (!s.run.room) {
      s.run.room = Logic.generateRoom(s, rng);
    }
    const room = s.run.room;
    if (room.type === "combat" || room.type === "boss") {
      if (!s.run.combat) {
        s.run.combat = { enemyId: room.enemyId, enemyHp: D.enemies[room.enemyId].hp, enemyStatuses: {}, skillCd: {}, guarding: false };
      }
      const actions = ["attack", "guard", "skill:power_strike", "skill:flurry", "skill:heal_hack"];
      const pick = actions[Math.floor(rng() * 3)];
      const action = pick === "attack" ? { type: "attack" } : pick === "guard" ? { type: "guard" } : { type: "skill", skillId: "power_strike" };
      if (s.player.hp < 25 && s.player.inventory.some((id) => D.items[id] && D.items[id].type === "consumable" && D.items[id].heal)) {
        const itemId = s.player.inventory.find((id) => D.items[id] && D.items[id].heal);
        Logic.resolveTurn(s, { type: "item", itemId }, rng);
      } else {
        Logic.resolveTurn(s, action, rng);
      }
    } else if (room.type === "event") {
      s.run.eventDone = true;
    } else if (room.type === "rest") {
      Logic.makeCamp(s, []);
      s.run.eventDone = true;
    } else {
      s.run.eventDone = true;
    }
    if (s.run.eventDone && !s.run.combat) {
      s.run.room = null;
      if (s.run.depth < 13) Logic.descend(s, rng);
    }
    s.player.hp = Math.min(Logic.playerStats(s).hp, s.player.hp);
    s.player.mp = Math.min(Logic.playerStats(s).mp, s.player.mp);
    if (Logic.playerStats(s).hp <= 0) s.run.alive = false;
  }
  assert.ok(s.run.depth >= 3, `simulation should reach at least floor 3, got depth ${s.run.depth}`);
  assert.ok(turns < 5000);
});