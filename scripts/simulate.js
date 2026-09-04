/*
 * Abyss Echo - balance simulator
 * Plays thousands of scripted runs and reports difficulty metrics.
 * Run: node scripts/simulate.js [runs]
 */
"use strict";

global.window = {};
require("../js/lang.js");
require("../js/data.js");
require("../js/logic.js");
const ABYSS = global.window.ABYSS;
const Logic = ABYSS.Logic;
const D = ABYSS.DATA;

const RUNS = parseInt(process.argv[2] || "2000", 10);

function spawnEnemy(s, room) {
  return {
    enemyId: room.enemyId,
    enemyHp: Logic.enemyMaxHp(s, room.enemyId, room.elite, room.echo),
    elite: !!room.elite,
    echo: !!room.echo,
    enemyStatuses: {},
    skillCd: {},
    guarding: false
  };
}

function chooseAction(s) {
  const c = s.run.combat;
  const ps = Logic.playerStats(s);
  const hpPct = s.player.hp / ps.hp;
  const isBoss = !!D.enemies[c.enemyId].boss;
  const healItem = pickHealItem(s);
  /* potions: proactive on bosses, reactive on trash */
  if (hpPct < (isBoss ? 0.7 : 0.45) && healItem) return { type: "item", itemId: healItem };
  if (hpPct < 0.25 && !healItem) {
    if (!isBoss && Math.random() < 0.55) return { type: "flee" };
    /* low HP with no potion: keep trading blows, guard only sometimes */
    if (Math.random() < 0.35) return { type: "guard" };
    return { type: "attack" };
  }
  const cd = c.skillCd || {};
  if (isBoss && !cd.rend && s.player.mp >= D.skills.rend.mp) return { type: "skill", skillId: "rend" };
  if (isBoss && s.player.hp > ps.hp * 0.55 && !cd.ward && s.player.mp >= D.skills.ward.mp) return { type: "skill", skillId: "ward" };
  if (!cd.power_strike && s.player.mp >= D.skills.power_strike.mp) return { type: "skill", skillId: "power_strike" };
  return { type: "attack" };
}

function pickHealItem(s) {
  const inv = s.player.inventory;
  const order = ["elixir_life", "potion_big", "potion_small"];
  for (let i = 0; i < order.length; i++) {
    if (inv.indexOf(order[i]) >= 0) return order[i];
  }
  return null;
}

function playGame(seed) {
  const s = Logic.freshState();
  const rng = Logic.mulberry32(seed);
  let turns = 0;
  while (s.run.alive && turns < 8000) {
    turns += 1;
    if (s.stats.bossesKilled && s.stats.bossesKilled.boss_abyss) break; /* game complete */
    turns += 1;
    if (s.run.combat) {
      Logic.resolveTurn(s, chooseAction(s), rng);
    } else if (s.run.room) {
      if (s.run.eventDone) {
        /* room resolved: search a second room or descend */
        s.run.room = null;
        if ((s.run.floorRooms || 0) < 2) {
          /* search again on same floor */
        } else {
          Logic.descend(s, rng);
        }
        continue;
      }
      const room = s.run.room;
      if (room.type === "combat" || room.type === "boss") {
        s.run.combat = spawnEnemy(s, room);
      } else if (room.type === "rest") {
        Logic.makeCamp(s, []);
        s.run.eventDone = true;
      } else {
        s.run.eventDone = true;
      }
    } else {
      s.run.room = Logic.generateRoom(s, rng);
      s.run.floorRooms = (s.run.floorRooms || 0) + 1;
    }
    s.player.hp = Math.min(Logic.playerStats(s).hp, s.player.hp);
  }
  s.stats.bestDepth = Math.max(s.stats.bestDepth, s.run.depth);
  return s;
}

function fmt(n) { return (Math.round(n * 10) / 10); }

const results = [];
for (let i = 0; i < RUNS; i++) results.push(playGame(i + 1));

/* state snapshot when players first reach floor 6 */
let floor6 = { n: 0, hpPct: 0, level: 0, potions: 0, gold: 0, mpPct: 0 };
results.forEach((s) => {
  if (s.stats.bestDepth >= 6) {
    const ps = Logic.playerStats(s);
    /* approximate: hp/level at death is close to at floor 6 for deaths on 6+ */
    floor6.n += 1;
    floor6.hpPct += s.player.hp / ps.hp;
    floor6.mpPct += s.player.mp / ps.mp;
    floor6.level += s.player.level;
    floor6.potions += s.player.inventory.filter((id) => { const it = D.items[id]; return it && it.type === "consumable" && (it.heal || false); }).length;
    floor6.gold += s.player.gold;
  }
});

const wins = results.filter((s) => s.stats.bossesKilled && s.stats.bossesKilled.boss_abyss).length;
const avgDepth = results.reduce((a, s) => a + s.stats.bestDepth, 0) / RUNS;
const avgKills = results.reduce((a, s) => a + s.stats.totalKills, 0) / RUNS;
const avgLevel = results.reduce((a, s) => a + s.player.level, 0) / RUNS;
const avgGold = results.reduce((a, s) => a + s.player.gold, 0) / RUNS;
const maxDepth = results.reduce((a, s) => Math.max(a, s.stats.bestDepth), 0);

const buckets = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0, "11": 0, "12": 0, "13+": 0 };
results.forEach((s) => {
  const d = s.stats.bestDepth;
  if (!s.run.alive) {
    const key = d <= 12 ? String(d) : "13+";
    buckets[key] += 1;
  }
});

const bossWins = {};
Object.keys(D.enemies).filter((k) => D.enemies[k].boss).forEach((k) => {
  bossWins[k] = results.filter((s) => s.stats.bossesKilled && s.stats.bossesKilled[k]).length;
});

console.log("=== Abyss Echo balance simulation ===");
console.log("Runs: " + RUNS);
console.log("Win rate (defeat Obys): " + fmt(wins / RUNS * 100) + "%");
console.log("Avg best depth: " + fmt(avgDepth));
console.log("Avg kills: " + fmt(avgKills) + " | Avg level: " + fmt(avgLevel) + " | Avg gold: " + fmt(avgGold));
console.log("Max depth reached: " + maxDepth);
console.log("Death distribution: " + JSON.stringify(buckets, null, 0));
const byFloor = Object.keys(buckets).filter((k) => k !== "13+").sort((a, b) => a - b);
const deathPct = byFloor.map((k) => k + ":" + Math.round(buckets[k] / RUNS * 1000) / 10 + "%").join(" ");
console.log("Boss kill counts: " + JSON.stringify(bossWins));
if (floor6.n > 0) {
  console.log("At floor 6 (n=" + floor6.n + "): avg hp% " + Math.round(floor6.hpPct / floor6.n * 100) + " | level " + (floor6.level / floor6.n).toFixed(1) + " | heal potions " + (floor6.potions / floor6.n).toFixed(1) + " | gold " + Math.round(floor6.gold / floor6.n));
}

/* -------- markdown report -------- */
let md = "# 平衡性模拟报告 / Balance Simulation Report\n\n";
md += "- 生成时间 / Generated: " + new Date().toISOString().slice(0, 10) + "\n";
md += "- 模拟局数 / Runs: **" + RUNS + "**（脚本策略：优先重击、血低用药、无药半血逃跑）\n\n";
md += "## 核心指标 / Key Metrics\n\n";
md += "| 指标 Metric | 数值 Value |\n|---|---|\n";
md += "| 通关率（击败深渊之主） Win rate | " + fmt(wins / RUNS * 100) + "% |\n";
md += "| 平均最佳深度 Avg best depth | " + fmt(avgDepth) + " |\n";
md += "| 平均击杀 Avg kills | " + fmt(avgKills) + " |\n";
md += "| 平均等级 Avg level | " + fmt(avgLevel) + " |\n";
md += "| 平均金币 Avg gold | " + fmt(avgGold) + " |\n\n";
md += "## 死亡分布 / Death Distribution\n\n";
md += "| 深度区间 Floors | 占比 Share |\n|---|---|\n";
Object.keys(buckets).forEach((k) => {
  md += "| " + k + " | " + fmt(buckets[k] / RUNS * 100) + "% |\n";
});
md += "\n## Boss 击杀统计 / Boss Kill Counts\n\n";
Object.keys(bossWins).forEach((k) => {
  md += "- " + (D.enemies[k].name.zh) + ": " + bossWins[k] + " (" + fmt(bossWins[k] / RUNS * 100) + "%)\n";
});
const winRate = wins / RUNS;
md += "\n## 分析 / Analysis\n\n";
if (winRate < 0.05) md += "- ⚠️ 通关率过低：最终 BOSS 明显过强，或前期资源太稀缺。建议降低 12 层后敌人数值或提高药水掉率。\n";
else if (winRate < 0.15) md += "- 通关率合理偏低：有挑战性，适合核心玩家。可小幅增加商店药水供给。\n";
else if (winRate <= 0.35) md += "- ✅ 通关率健康（15%-35%）：普通玩家有机会通关，硬核玩家需要规划；属于理想区间。\n";
else md += "- 通关率偏高：普通流程偏简单，可考虑提升 Boss 技能强度或减少回血资源。\n";
if (buckets["1-3"] / RUNS > 0.35) md += "- ⚠️ 大量玩家死在 1-3 层：前期战斗过难或治疗资源不足。\n";
if (buckets["13+"] / RUNS > 0.2) md += "- 最终 BOSS 是主要死亡点：符合终局定位。\n";

require("fs").writeFileSync(require("path").join(__dirname, "..", "BALANCE.md"), md);
console.log("\nReport written to BALANCE.md");