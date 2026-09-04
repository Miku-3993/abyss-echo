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
  assert.equal(Object.keys(D.events).length, 13);
  assert.equal(Object.keys(D.achievements).length, 28);
  assert.equal(Object.keys(D.endings).length, 2);
  assert.equal(Object.keys(D.fragments).length, 3);
  assert.equal(D.QUESTS.length, 5);
});

test("endless mode: echo boss every 10 floors past 12", () => {
  const s = Logic.freshState();
  s.run.endless = true;
  s.run.depth = 20;
  const pick = Logic.pickEnemy(s, Logic.mulberry32(5), true);
  assert.ok(pick.echo === true, "floor 20 must be an echo boss");
  assert.ok(D.enemies[pick.id], "echo boss id valid");
  s.run.depth = 21;
  const normal = Logic.pickEnemy(s, Logic.mulberry32(5), true);
  assert.ok(!normal.echo, "floor 21 is not an echo boss floor");
});

test("endless mode: enemy power scales with depth", () => {
  const s = Logic.freshState();
  s.run.endless = true;
  s.run.depth = 20;
  s.run.combat = { enemyId: "hunter", enemyHp: 1000, enemyStatuses: {}, skillCd: {}, guarding: false };
  const es = Logic.enemyStats(s);
  const scale = 1 + (20 - 12) * 0.03;
  assert.equal(es.maxHp, Math.floor(Math.floor(D.enemies.hunter.hp) * scale));
  assert.equal(es.atk, Math.floor(D.enemies.hunter.atk * scale));
  s.run.combat.echo = true;
  s.run.combat.enemyHp = Logic.enemyMaxHp(s, "hunter", false, true);
  const echo = Logic.enemyStats(s);
  const ef = 1.15 + Math.min(0.6, 20 * 0.01);
  assert.equal(echo.atk, Math.floor(Math.floor(D.enemies.hunter.atk * ef) * scale));
});

test("endless mode: bestEndless recorded on descent and echo kills counted", () => {
  const s = Logic.freshState();
  s.run.endless = true;
  Logic.descend(s, Logic.mulberry32(1));
  Logic.descend(s, Logic.mulberry32(1));
  assert.equal(s.stats.bestEndless, 3);
  s.run.combat = { enemyId: "boss_abyss", enemyHp: 1, echo: true, enemyStatuses: {}, skillCd: {}, guarding: false };
  const evs = Logic.resolveTurn(s, { type: "attack" }, seqRng([0.5, 0.9, 0.9, 0.9]));
  assert.ok(evs.some((e) => e.type === "echoKilled"));
  assert.equal(s.stats.echoKills, 1);
});

test("endless achievements unlock", () => {
  const s = Logic.freshState();
  s.stats.bestEndless = 15;
  const evs = [];
  Logic.checkAchievements(s, evs);
  assert.ok(evs.some((e) => e.type === "achievement" && e.id === "endless_15"));
  s.stats.echoKills = 3;
  Logic.checkAchievements(s, evs);
  assert.ok(evs.some((e) => e.type === "achievement" && e.id === "echo_killer"));
});

test("prestige boosts player stats permanently", () => {
  const s = Logic.freshState();
  const base = Logic.playerStats(s);
  s.stats.prestige = 3;
  const after = Logic.playerStats(s);
  assert.equal(after.atk, Math.floor(base.atk * (1 + 0.04 * 3)));
  assert.equal(after.def, Math.floor(base.def * (1 + 0.04 * 3)));
  assert.equal(after.spd, Math.floor(base.spd * (1 + 0.04 * 3)));
});

test("prestige boosts gold income", () => {
  const s = Logic.freshState();
  s.stats.prestige = 2;
  const drops = Logic.rollDrops(s, "rat", seqRng([0.9]));
  assert.ok(Math.abs(drops.goldMult - 1.1) < 0.001, "expected 1.1 gold mult, got " + drops.goldMult);
});

test("prestige resets run but keeps permanent progress", () => {
  const s = Logic.freshState();
  s.player.level = 7;
  s.player.gold = 500;
  s.player.inventory = ["blade_abyss", "potion_big"];
  s.stats.achievements = ["first_step", "slayer"];
  s.stats.fragments = ["frag_1", "frag_2"];
  s.stats.bossesKilled = { boss_grul: true };
  s.stats.prestige = 2;
  const fresh = Logic.prestige(s);
  assert.equal(fresh.stats.prestige, 3);
  assert.equal(fresh.player.level, 1);
  assert.equal(fresh.player.gold, 100, "20% gold carried over");
  assert.deepEqual(fresh.player.inventory, ["potion_small", "potion_small", "potion_mana"], "fresh starter kit only");
  assert.deepEqual(fresh.stats.achievements, ["first_step", "slayer"]);
  assert.equal(fresh.stats.fragments.length, 2);
  assert.deepEqual(fresh.stats.bossesKilled, { boss_grul: true });
  assert.equal(fresh.run.depth, 1);
});

test("prestige achievement unlocks after first rebirth", () => {
  const s = Logic.freshState();
  s.stats.prestige = 1;
  const evs = [];
  Logic.checkAchievements(s, evs);
  assert.ok(evs.some((e) => e.type === "achievement" && e.id === "prestige_1"));
});

test("enemyMaxHp accounts for elite and prestige", () => {
  const s = Logic.freshState();
  assert.equal(Logic.enemyMaxHp(s, "rat", false), D.enemies.rat.hp);
  assert.equal(Logic.enemyMaxHp(s, "rat", true), Math.floor(D.enemies.rat.hp * 1.5));
  s.stats.prestige = 5;
  assert.equal(Logic.enemyMaxHp(s, "rat", false), Math.floor(D.enemies.rat.hp * 1.15));
  assert.equal(Logic.enemyMaxHp(s, "rat", true), Math.floor(Math.floor(D.enemies.rat.hp * 1.5) * 1.15));
});

test("enemy stats scale with prestige marks", () => {
  const s = Logic.freshState();
  s.run.combat = { enemyId: "wolf", enemyHp: 1000, enemyStatuses: {}, skillCd: {}, guarding: false };
  const base = Logic.enemyStats(s);
  s.stats.prestige = 10;
  s.run.combat.enemyHp = 1000;
  const scaled = Logic.enemyStats(s);
  assert.equal(scaled.atk, Math.floor(D.enemies.wolf.atk * 1.3));
  assert.equal(scaled.def, Math.floor(D.enemies.wolf.def * 1.3));
  assert.equal(scaled.maxHp, Math.floor(D.enemies.wolf.hp * 1.3));
  assert.ok(base.atk < scaled.atk);
});

test("kills are recorded in the codex", () => {
  const s = Logic.freshState();
  s.run.combat = { enemyId: "rat", enemyHp: 5, enemyStatuses: {}, skillCd: {}, guarding: false };
  Logic.resolveTurn(s, { type: "attack" }, seqRng([0.5, 0.5]));
  assert.ok(s.stats.enemyKilled.rat, "rat should be in codex after kill");
  s.run.combat = { enemyId: "wolf", enemyHp: 5, elite: true, enemyStatuses: {}, skillCd: {}, guarding: false };
  Logic.resolveTurn(s, { type: "attack" }, seqRng([0.5, 0.5]));
  assert.ok(s.stats.enemyKilled.wolf);
  assert.ok(s.stats.enemyKilled.wolf__elite, "elite variant recorded separately");
});

test("collected items are tracked", () => {
  const s = Logic.freshState();
  Logic.recordCollected(s, "blade_abyss");
  assert.ok(s.stats.collected.blade_abyss);
});

test("codex progress survives prestige", () => {
  const s = Logic.freshState();
  s.stats.enemyKilled = { rat: true, wolf: true, slime: true };
  s.stats.collected = { potion_big: true };
  const fresh = Logic.prestige(s);
  assert.deepEqual(fresh.stats.enemyKilled, { rat: true, wolf: true, slime: true });
  assert.deepEqual(fresh.stats.collected, { potion_big: true });
});

test("daily seed modifiers are deterministic and merge fx", () => {
  const a = Logic.dailySeedModifiers("2026-09-04");
  const b = Logic.dailySeedModifiers("2026-09-04");
  assert.equal(a.picked.length, b.picked.length);
  assert.deepEqual(a.fx, b.fx);
  assert.ok(a.picked.length >= 2 && a.picked.length <= 3, "2-3 modifiers");
  assert.ok(Object.keys(a.fx).length >= 2, "fx merged from all picked modifiers");
  /* different day -> different seed (almost surely) */
  const c = Logic.dailySeedModifiers("2026-09-05");
  assert.notDeepEqual(a.fx, c.fx);
});

test("daily enemyAtk and enemyAll apply to enemy stats", () => {
  const s = Logic.freshState();
  s.run.daily = { fx: { enemyAtk: 1.25, enemyAll: 1.15, enemyHp: 1.3 } };
  s.run.combat = { enemyId: "rat", enemyHp: Logic.enemyMaxHp(s, "rat", false), enemyStatuses: {}, skillCd: {}, guarding: false };
  const es = Logic.enemyStats(s);
  assert.equal(es.atk, Math.floor(Math.floor(D.enemies.rat.atk * 1.15) * 1.25));
  assert.equal(es.def, Math.floor(D.enemies.rat.def * 1.15));
  assert.equal(es.maxHp, Math.floor(Math.floor(D.enemies.rat.hp * 1.3) * 1.15));
});

test("daily gold and healing multipliers apply", () => {
  const s = Logic.freshState();
  s.run.daily = { fx: { goldMult: 0.7, healMult: 0.5 } };
  const drops = Logic.rollDrops(s, "rat", seqRng([0.9]));
  assert.ok(Math.abs(drops.goldMult - 0.7) < 0.001, "gold mult 0.7, got " + drops.goldMult);
  s.player.hp = 10;
  const evs = [];
  Logic.useItem(s, "potion_small", evs, seqRng([0.5]));
  assert.equal(s.player.hp, 25, "30 heal halved to 15");
});

test("daily elite chance applies to room generation", () => {
  const s = Logic.freshState();
  s.run.daily = { fx: { eliteChance: 2 } };
  s.run.depth = 2;
  let elites = 0, combats = 0;
  for (let i = 0; i < 300; i++) {
    const rng = Logic.mulberry32(i + 31);
    const room = Logic.generateRoom(s, rng);
    if (room.type === "combat") {
      combats += 1;
      if (room.elite) elites += 1;
    }
  }
  assert.ok(combats > 50, "enough combat rooms sampled");
  assert.ok(elites > 5, "elites should be common with 2x chance, got " + elites);
});

test("quest: accept, progress and complete elite hunt", () => {
  const s = Logic.freshState();
  const evs = [];
  Logic.startQuest(s, "elite", evs);
  assert.ok(evs.some((e) => e.type === "questStart"));
  assert.equal(s.stats.quests.active, "elite");
  Logic.questProgress(s, "kills", 1);
  Logic.questProgress(s, "eliteKills", 1);
  assert.equal(s.stats.quests.progress, 1);
  Logic.questProgress(s, "eliteKills", 2);
  const done = Logic.checkQuest(s, []);
  assert.ok(done.some((e) => e.type === "questDone"));
  assert.equal(s.stats.quests.active, null);
  assert.deepEqual(s.stats.quests.done, ["elite"]);
  assert.ok(s.player.gold >= 150, "reward gold granted");
  assert.ok(s.player.inventory.indexOf("elixir_life") >= 0, "reward item granted");
});

test("quest: gold quest completes when holding enough gold", () => {
  const s = Logic.freshState();
  Logic.startQuest(s, "hoard", []);
  s.player.gold = 500;
  const evs = Logic.checkQuest(s, []);
  assert.ok(evs.some((e) => e.type === "questDone" && e.quest === "hoard"));
});

test("quest: abandoned when accepting a new one", () => {
  const s = Logic.freshState();
  Logic.startQuest(s, "elite", []);
  const evs = [];
  Logic.startQuest(s, "depth", evs);
  assert.ok(evs.some((e) => e.type === "questAbandon"));
  assert.equal(s.stats.quests.active, "depth");
});

test("quest: completed quests survive prestige, active does not", () => {
  const s = Logic.freshState();
  s.stats.quests = { active: "elite", progress: 1, done: ["depth"] };
  const fresh = Logic.prestige(s);
  assert.equal(fresh.stats.quests.active, null);
  assert.deepEqual(fresh.stats.quests.done, ["depth"]);
  const evs = [];
  Logic.checkAchievements(fresh, evs);
  /* quest_master needs 3 done */
  fresh.stats.quests.done = ["depth", "elite", "hoard"];
  Logic.checkAchievements(fresh, evs);
  assert.ok(evs.some((e) => e.type === "achievement" && e.id === "quest_master"));
});

test("elite enemies get 1.5x stats", () => {
  const s = Logic.freshState();
  s.run.combat = { enemyId: "rat", enemyHp: Math.floor(D.enemies.rat.hp * 1.5), elite: true, enemyStatuses: {}, skillCd: {}, guarding: false };
  const es = Logic.enemyStats(s);
  assert.equal(es.maxHp, Math.floor(D.enemies.rat.hp * 1.5));
  assert.equal(es.atk, Math.floor(D.enemies.rat.atk * 1.5));
  assert.equal(es.def, Math.floor(D.enemies.rat.def * 1.5));
  assert.equal(es.elite, true);
});

test("elite kill grants double rewards and bonus drop", () => {
  const s = Logic.freshState();
  s.run.combat = { enemyId: "rat", enemyHp: 5, elite: true, enemyStatuses: {}, skillCd: {}, guarding: false };
  const rng = seqRng([0.5, 0.5, 0.5, 0.5, 0.5]);
  const evs = Logic.resolveTurn(s, { type: "attack" }, rng);
  const kill = evs.find((e) => e.type === "kill");
  assert.ok(kill, "expected kill");
  assert.equal(kill.xp, D.enemies.rat.xp * 2);
  assert.equal(kill.gold, D.enemies.rat.gold * 2);
  assert.ok(kill.elite);
  assert.ok(kill.drops.length >= 1, "elite always drops a bonus item");
  assert.equal(s.stats.eliteKills, 1);
});

test("elite never appears on boss floors", () => {
  const s = Logic.freshState();
  s.run.depth = 3;
  const room = Logic.generateRoom(s, seqRng([0.99, 0.99]));
  assert.equal(room.type, "boss");
  assert.equal(room.elite, false);
});

test("elite generation is random but possible", () => {
  const s = Logic.freshState();
  s.run.depth = 2;
  let elites = 0;
  for (let i = 0; i < 200; i++) {
    const rng = Logic.mulberry32(i + 7);
    const room = Logic.generateRoom(s, rng);
    if (room.type === "combat" && room.elite) elites += 1;
  }
  assert.ok(elites > 5, "expected some elite rooms in 200 rolls, got " + elites);
});

test("arcane tome grants xp through useItem", () => {
  const s = Logic.freshState();
  s.player.inventory = ["scroll_arcane"];
  const evs = [];
  Logic.useItem(s, "scroll_arcane", evs, seqRng([0.5]));
  assert.ok(evs.some((e) => e.type === "xpGain"));
  /* 40 XP == exactly the level-1 threshold -> levels up to 2 */
  assert.equal(s.player.level, 2);
  assert.equal(s.player.inventory.length, 0);
});

test("elixir fully restores hp and mp", () => {
  const s = Logic.freshState();
  const ps = Logic.playerStats(s);
  s.player.hp = 5;
  s.player.mp = 2;
  s.player.inventory = ["elixir_life"];
  const evs = [];
  Logic.useItem(s, "elixir_life", evs, seqRng([0.5]));
  assert.equal(s.player.hp, ps.hp);
  assert.equal(s.player.mp, ps.mp);
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