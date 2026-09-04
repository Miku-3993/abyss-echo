/*
 * Abyss Echo - localization module
 * Simple {zh, en} string pairs. UI strings live here; game content data
 * carries its own {zh,en} name/desc pairs in data.js.
 */
var ABYSS = window.ABYSS = window.ABYSS || {};

ABYSS.LANG = {
  builtin: {
    "game_title": { zh: "深渊回响", en: "Abyss Echo" },
    "game_subtitle": { zh: "文字地牢冒险", en: "Text Dungeon RPG" },
    "new_game": { zh: "新的旅程", en: "New Journey" },
    "continue": { zh: "继续探索", en: "Continue" },
    "reset": { zh: "重置存档", en: "Reset Save" },
    "reset_confirm": { zh: "确定要抹去深渊中的一切痕迹吗？此操作不可恢复。", en: "Erase every trace in the abyss? This cannot be undone." },
    "save_export": { zh: "导出存档", en: "Export Save" },
    "save_import": { zh: "导入存档", en: "Import Save" },
    "save_imported": { zh: "存档已导入", en: "Save imported" },
    "save_invalid": { zh: "存档无效", en: "Invalid save" },
    "saved": { zh: "已自动保存", en: "Game saved" },
    "hp": { zh: "生命", en: "HP" },
    "mp": { zh: "魔力", en: "MP" },
    "atk": { zh: "攻击", en: "ATK" },
    "def": { zh: "防御", en: "DEF" },
    "spd": { zh: "速度", en: "SPD" },
    "luck": { zh: "幸运", en: "LCK" },
    "gold": { zh: "金币", en: "Gold" },
    "depth": { zh: "层数", en: "Depth" },
    "level": { zh: "等级", en: "Level" },
    "xp": { zh: "经验", en: "XP" },
    "fight": { zh: "战斗", en: "Fight" },
    "attack": { zh: "攻击", en: "Attack" },
    "guard": { zh: "防御", en: "Guard" },
    "skill": { zh: "技能", en: "Skill" },
    "flee": { zh: "逃跑", en: "Flee" },
    "item": { zh: "道具", en: "Item" },
    "inventory": { zh: "背包", en: "Inventory" },
    "equipment": { zh: "装备", en: "Equipment" },
    "stats": { zh: "属性", en: "Stats" },
    "log": { zh: "日志", en: "Log" },
    "achievements": { zh: "成就", en: "Achievements" },
    "settings": { zh: "设置", en: "Settings" },
    "sound_on": { zh: "音效：开", en: "Sound: On" },
    "sound_off": { zh: "音效：关", en: "Sound: Off" },
    "fast_text": { zh: "快节奏文本", en: "Fast Text" },
    "normal_text": { zh: "打字机效果", en: "Typewriter Effect" },
    "language": { zh: "语言", en: "Language" },
    "help": { zh: "帮助", en: "Help" },
    "back": { zh: "返回", en: "Back" },
    "victory": { zh: "胜利", en: "Victory" },
    "defeat": { zh: "败亡", en: "Defeat" },
    "game_over": { zh: "你死了……", en: "You have died..." },
    "restart": { zh: "再次深入", en: "Descend Again" },
    "use": { zh: "使用", en: "Use" },
    "equip": { zh: "装备", en: "Equip" },
    "unequip": { zh: "卸下", en: "Unequip" },
    "sell": { zh: "出售", en: "Sell" },
    "buy": { zh: "购买", en: "Buy" },
    "take": { zh: "拾取", en: "Take" },
    "leave": { zh: "离开", en: "Leave" },
    "descend": { zh: "深入下一层", en: "Descend Deeper" },
    "rest": { zh: "扎营休息", en: "Make Camp" },
    "search": { zh: "搜索房间", en: "Search Room" },
    "continue_btn": { zh: "继续", en: "Continue" },
    "no_item": { zh: "空空如也", en: "Nothing here" },
    "no_gold": { zh: "金币不足", en: "Not enough gold" },
    "no_mp": { zh: "魔力不足", en: "Not enough MP" },
    "full_inventory": { zh: "背包已满", en: "Inventory full" },
    "explored": { zh: "已探索", en: "Explored" },
    "kills": { zh: "击杀", en: "Kills" },
    "deaths": { zh: "死亡次数", en: "Deaths" },
    "best_depth": { zh: "最深记录", en: "Best Depth" },
    "play_time": { zh: "游戏时间", en: "Play Time" },
    "floor": { zh: "第 {n} 层", en: "Floor {n}" },
    "floor_name_depth": { zh: "深渊第 {n} 层", en: "Abyss Floor {n}" },
    "enemy": { zh: "敌人", en: "Enemy" },
    "elite_bonus": { zh: "双倍奖励", en: "2x Rewards" },
    "dmg": { zh: "造成 {n} 点伤害", en: "dealt {n} damage" },
    "take_dmg": { zh: "受到 {n} 点伤害", en: "took {n} damage" },
    "crit": { zh: "暴击！", en: "Critical!" },
    "dodged": { zh: "闪避了攻击", en: "dodged the attack" },
    "blocked": { zh: "格挡了攻击", en: "blocked the attack" },
    "victory_msg": { zh: "战斗胜利！获得 {xp} 经验，{gold} 金币", en: "Victory! +{xp} XP, +{gold} gold" },
    "level_up": { zh: "等级提升！现在是 {n} 级", en: "Level up! Now level {n}" },
    "died": { zh: "你被 {n} 杀死了", en: "You were slain by {n}" },
    "fled": { zh: "你成功逃跑了", en: "You fled successfully" },
    "trap_hit": { zh: "触发了陷阱！", en: "A trap triggered!" },
    "chest": { zh: "你打开了宝箱", en: "You opened the chest" },
    "found_item": { zh: "发现了 {n}", en: "Found {n}" },
    "achievement_unlocked": { zh: "成就解锁：{n}", en: "Achievement unlocked: {n}" },
    "ending": { zh: "结局", en: "Ending" },
    "new_record": { zh: "新纪录！", en: "New record!" },
    "status_applied": { zh: "{n} 附着了 {s}", en: "{n} was afflicted with {s}" },
    "status_end": { zh: "{s} 效果消失了", en: "{s} wore off" },
    "healed": { zh: "恢复了 {n} 点生命", en: "restored {n} HP" },
    "mp_restore": { zh: "恢复了 {n} 点魔力", en: "restored {n} MP" },
    "skills_tab": { zh: "技能", en: "Skills" },
    "tutorial": { zh: "教程", en: "Tutorial" }
  }
};

ABYSS.T = function (key, vars) {
  var lang = ABYSS.LANG.current || "zh";
  var table = ABYSS.LANG.builtin[key] || { zh: key, en: key };
  var s = table[lang] || table.zh || key;
  if (vars) {
    for (var k in vars) {
      s = s.split("{" + k + "}").join(vars[k]);
    }
  }
  return s;
};

ABYSS.LANG.name = function (entry) {
  if (!entry) return "?";
  var lang = ABYSS.LANG.current || "zh";
  return entry.name ? (entry.name[lang] || entry.name.zh || entry.name) : (entry[lang] || entry.zh || String(entry));
};

ABYSS.LANG.desc = function (entry) {
  var lang = ABYSS.LANG.current || "zh";
  return entry.desc ? (entry.desc[lang] || entry.desc.zh || entry.desc) : "";
};

/* CommonJS export for node tests */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ABYSS: ABYSS };
}