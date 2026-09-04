/*
 * Abyss Echo - game content data
 * All name/desc fields are {zh, en} pairs. Purely declarative.
 */
var ABYSS = window.ABYSS = window.ABYSS || {};

ABYSS.DATA = {
  VERSION: "1.4.0",
  MAX_DEPTH: 12,
  PRESTIGE: {
    name: { zh: "深渊刻印", en: "Abyss Mark" },
    atkPerLvl: 0.04, defPerLvl: 0.04, spdPerLvl: 0.04, goldPerLvl: 0.05,
    desc: { zh: "达成结局后转生，永久获得全属性 +4%/级、金币收益 +5%/级。", en: "After any ending, transcend for permanent +4% stats and +5% gold per mark." }
  },
  BASE_HP: 60, BASE_MP: 30, BASE_ATK: 10, BASE_DEF: 5, BASE_SPD: 8, BASE_LCK: 5,
  HP_PER_LVL: 12, MP_PER_LVL: 6, ATK_PER_LVL: 2, DEF_PER_LVL: 1, SPD_PER_LVL: 1,
  XP_PER_LVL: 40,
  INV_LIMIT: 20,

  /* ---------- STATUS EFFECTS ---------- */
  statuses: {
    poison:   { name: { zh: "中毒", en: "Poison" },   desc: { zh: "每回合损失生命", en: "Lose HP each turn" },      tick: true,  kind: "harm",  damage: 4 },
    bleed:    { name: { zh: "流血", en: "Bleeding" }, desc: { zh: "每回合损失生命并减速", en: "Lose HP and speed each turn" }, tick: true, kind: "harm", damage: 5, spdMod: -2 },
    burn:     { name: { zh: "灼烧", en: "Burning" },  desc: { zh: "每回合损失生命", en: "Lose HP each turn" },      tick: true,  kind: "harm",  damage: 6 },
    weaken:   { name: { zh: "虚弱", en: "Weakened" }, desc: { zh: "攻击降低", en: "Attack reduced" },               tick: false, kind: "harm",  atkMod: -0.35 },
    enrage:   { name: { zh: "狂暴", en: "Enraged" },  desc: { zh: "攻击提升，防御降低", en: "Attack up, defense down" }, tick: false, kind: "buff", atkMod: 0.5, defMod: -0.3 },
    ward:     { name: { zh: "守护", en: "Warded" },   desc: { zh: "防御大幅提升", en: "Defense greatly increased" }, tick: false, kind: "buff", defMod: 1.0 },
    blessing: { name: { zh: "祝福", en: "Blessed" },  desc: { zh: "全属性小幅提升", en: "All stats slightly increased" }, tick: false, kind: "buff", atkMod: 0.15, defMod: 0.15, spdMod: 2 }
  },

  /* ---------- ENEMIES ---------- */
  enemies: {
    rat:        { name: { zh: "深渊巨鼠", en: "Abyssal Rat" },       tier: 1, hp: 18, atk: 7,  def: 1, spd: 9,  xp: 6,  gold: 4,  ability: null,
                  desc: { zh: "啃食深渊尸骸的巨型老鼠，牙齿泛着绿光。", en: "A giant rat gnawing abyss corpses, teeth gleaming green." } },
    bat:        { name: { zh: "洞穴蝙蝠", en: "Cave Bat" },          tier: 1, hp: 14, atk: 6,  def: 0, spd: 13, xp: 5,  gold: 3,  ability: null,
                  desc: { zh: "成群盘旋的盲眼蝙蝠，撕咬声令人头皮发麻。", en: "Blind bats swarming in circles, their screeches pierce the mind." } },
    slime:      { name: { zh: "腐化史莱姆", en: "Corrupted Slime" }, tier: 1, hp: 26, atk: 6,  def: 3, spd: 4,  xp: 7,  gold: 5,  ability: { status: "poison", chance: 0.3 },
                  desc: { zh: "黏稠的黑色软泥，缓慢蠕动着，散发恶臭。", en: "Viscous black sludge that moves slowly, reeking of rot." } },
    ghoul:      { name: { zh: "饥饿食尸鬼", en: "Starving Ghoul" },  tier: 1, hp: 22, atk: 9,  def: 1, spd: 7,  xp: 8,  gold: 6,  ability: null,
                  desc: { zh: "只剩本能的苍白腐尸，永远在寻找血肉。", en: "A pale corpse running on instinct alone, forever seeking flesh." } },
    goblin:     { name: { zh: "石肤地精", en: "Stoneskin Goblin" },  tier: 2, hp: 34, atk: 11, def: 6, spd: 8,  xp: 12, gold: 10, ability: null,
                  desc: { zh: "披着岩石外壳的狡猾地精，挥舞石制短斧。", en: "A cunning goblin wrapped in rock shell, wielding a stone axe." } },
    wolf:       { name: { zh: "暗影狼", en: "Shadow Wolf" },         tier: 2, hp: 30, atk: 13, def: 3, spd: 14, xp: 13, gold: 9,  ability: { status: "bleed", chance: 0.35 },
                  desc: { zh: "身体由阴影构成的狼群首领，爪子锋利如刃。", en: "A pack leader of shadow-made wolves, claws sharp as blades." } },
    wraith:     { name: { zh: "墓穴怨灵", en: "Tomb Wraith" },       tier: 2, hp: 27, atk: 14, def: 2, spd: 12, xp: 14, gold: 11, ability: { status: "weaken", chance: 0.4 },
                  desc: { zh: "被困在坟墓中的灵魂，哀嚎着索取生者的温度。", en: "A soul trapped in tombs, wailing for the warmth of the living." } },
    skeleton:   { name: { zh: "白骨射手", en: "Bone Archer" },       tier: 2, hp: 32, atk: 12, def: 4, spd: 10, xp: 13, gold: 12, ability: null,
                  desc: { zh: "手持骨弓的不死射手，箭矢由肋骨打磨而成。", en: "An undead archer with a bone bow, arrows carved from ribs." } },
    minion:     { name: { zh: "深渊魔仆", en: "Abyss Minion" },      tier: 3, hp: 52, atk: 16, def: 7, spd: 9,  xp: 22, gold: 18, ability: { status: "burn", chance: 0.3 },
                  desc: { zh: "侍奉深渊的低等魔物，体表燃烧着黑色火焰。", en: "A low servant of the abyss wreathed in black fire." } },
    spider:     { name: { zh: "腐蚀蜘蛛", en: "Corrosive Spider" },  tier: 3, hp: 44, atk: 15, def: 5, spd: 12, xp: 21, gold: 16, ability: { status: "poison", chance: 0.5 },
                  desc: { zh: "腹部肿胀的巨蛛，毒液能腐蚀钢铁。", en: "A bloated spider whose venom corrodes steel." } },
    leech:      { name: { zh: "血蛭", en: "Bleed Leech" },           tier: 3, hp: 50, atk: 17, def: 4, spd: 11, xp: 23, gold: 17, ability: { status: "bleed", chance: 0.45, drain: 0.5 },
                  desc: { zh: "吸血的软体生物，把猎物的血液化为自己的力量。", en: "A bloodsucking leech that turns prey's blood into its own power." } },
    golem:      { name: { zh: "迷宫魔像", en: "Labyrinth Golem" },   tier: 3, hp: 70, atk: 15, def: 12, spd: 5, xp: 25, gold: 20, ability: null,
                  desc: { zh: "守护迷宫的石之巨像，行动缓慢但坚不可摧。", en: "A stone colossus guarding the maze, slow but unbreakable." } },
    hunter:     { name: { zh: "虚空猎手", en: "Void Hunter" },       tier: 4, hp: 76, atk: 21, def: 8, spd: 15, xp: 34, gold: 28, ability: { status: "weaken", chance: 0.3 },
                  desc: { zh: "游荡在虚空边缘的猎手，弓弦振动着虚空之力。", en: "A hunter roaming the void's edge, bowstring humming with void power." } },
    watcher:    { name: { zh: "深渊监视者", en: "Abyss Watcher" },   tier: 4, hp: 84, atk: 20, def: 10, spd: 10, xp: 35, gold: 30, ability: { status: "burn", chance: 0.35 },
                  desc: { zh: "上千只眼睛组成的监视者，目光所及之处皆为灰烬。", en: "A watcher of a thousand eyes; all it beholds turns to ash." } },
    soulsucker: { name: { zh: "噬魂者", en: "Soulsucker" },          tier: 4, hp: 72, atk: 22, def: 7, spd: 13, xp: 36, gold: 32, ability: { status: "weaken", chance: 0.4, drain: 0.4 },
                  desc: { zh: "吞噬灵魂的恐怖存在，吸取的生机滋养着它的躯体。", en: "A horror that devours souls, nourished by stolen life." } },
    chaosmage:  { name: { zh: "混沌术士", en: "Chaos Mage" },        tier: 4, hp: 66, atk: 23, def: 6, spd: 12, xp: 37, gold: 34, ability: { status: "burn", chance: 0.4 },
                  desc: { zh: "操纵混沌魔法的堕落术士，火焰从不按常理燃烧。", en: "A fallen mage of chaos magic whose flames defy reason." } },
    /* Bosses */
    boss_grul:  { name: { zh: "吞噬者·格鲁尔", en: "Grul the Devourer" }, tier: 1, boss: true, hp: 90, atk: 15, def: 5, spd: 8, xp: 60, gold: 50,
                  ability: { status: "poison", chance: 0.5 },
                  desc: { zh: "盘踞在三层深渊的巨大蠕虫，吞噬一切坠落的活物。", en: "A colossal worm coiled on floor three, devouring all that falls." } },
    boss_morg:  { name: { zh: "墓穴女王·莫尔格", en: "Morgue the Tomb Queen" }, tier: 2, boss: true, hp: 130, atk: 19, def: 8, spd: 11, xp: 100, gold: 90,
                  ability: { status: "bleed", chance: 0.5 },
                  desc: { zh: "统御不死军团的女王，王座由白骨堆砌而成。", en: "Queen of the undead legions, throne built of bone." } },
    boss_steel: { name: { zh: "钢核巨像·铁心", en: "Ironheart the Steel Colossus" }, tier: 3, boss: true, hp: 180, atk: 23, def: 16, spd: 6, xp: 150, gold: 140,
                  ability: null,
                  desc: { zh: "深渊锻造的战争机器，核心是一颗仍在跳动的心脏。", en: "A war engine forged in the abyss, core a still-beating heart." } },
    boss_karaz: { name: { zh: "虚空领主·卡拉泽斯", en: "Karazes the Void Lord" }, tier: 4, boss: true, hp: 240, atk: 28, def: 12, spd: 13, xp: 220, gold: 200,
                  ability: { status: "burn", chance: 0.4 },
                  desc: { zh: "虚空之力的化身，披着星光的毁灭者。", en: "An avatar of void power, a destroyer robed in starlight." } },
    boss_abyss: { name: { zh: "深渊之主·奥伯斯", en: "Obys, Lord of the Abyss" }, tier: 5, boss: true, final: true, hp: 350, atk: 32, def: 15, spd: 12, xp: 500, gold: 500,
                  ability: { status: "burn", chance: 0.5 },
                  desc: { zh: "深渊本身孕育的意志。击败它，或成为它。", en: "The will born of the abyss itself. Defeat it, or become it." } }
  },

  /* ---------- ITEMS ---------- */
  items: {
    sword_rust:  { name: { zh: "锈蚀铁剑", en: "Rusty Iron Sword" },   type: "weapon", slot: "weapon", atk: 4,  value: 15,
                   desc: { zh: "布满锈迹的旧剑，仍然锋利。", en: "An old blade covered in rust, still sharp." } },
    bow_hunter:  { name: { zh: "猎人之弓", en: "Hunter's Bow" },       type: "weapon", slot: "weapon", atk: 7,  spd: 1, value: 35,
                   desc: { zh: "轻巧的短弓，赋予佩戴者更快的出手。", en: "A light shortbow granting quicker strikes." } },
    dagger_moon: { name: { zh: "月光匕首", en: "Moonlight Dagger" },   type: "weapon", slot: "weapon", atk: 9,  luck: 3, value: 60,
                   desc: { zh: "刃面如月色的匕首，带来好运。", en: "A dagger with a moonlit edge, bringing fortune." } },
    axe_rune:    { name: { zh: "符文战斧", en: "Rune Battleaxe" },     type: "weapon", slot: "weapon", atk: 13, value: 110,
                   desc: { zh: "铭刻符文的重斧，挥动时发出低沉的轰鸣。", en: "A rune-carved heavy axe that hums when swung." } },
    blade_shadow:{ name: { zh: "暗影之刃", en: "Shadow Blade" },       type: "weapon", slot: "weapon", atk: 16, spd: 2, value: 180,
                   desc: { zh: "由凝固的阴影铸造的长刀，轻若无物。", en: "A long blade forged of solidified shadow, weightless." } },
    spear_dragon:{ name: { zh: "龙炎之枪", en: "Dragonflame Lance" },  type: "weapon", slot: "weapon", atk: 20, value: 280,
                   desc: { zh: "枪尖燃烧着永不熄灭的龙炎。", en: "A lance whose tip burns with undying dragonfire." } },
    hammer_void: { name: { zh: "湮灭之锤", en: "Oblivion Hammer" },    type: "weapon", slot: "weapon", atk: 25, def: 2, value: 400,
                   desc: { zh: "传说能敲碎虚空的重锤。", en: "A great hammer said to shatter the void itself." } },
    blade_abyss: { name: { zh: "深渊之刃·回声", en: "Echo of the Abyss" }, type: "weapon", slot: "weapon", atk: 32, spd: 2, luck: 5, value: 800,
                   desc: { zh: "斩断深渊本身的剑，只有击败深渊之主的人才能挥动。", en: "A blade that severs the abyss itself, wieldable only by its conqueror." } },
    cloth:       { name: { zh: "破旧布衣", en: "Tattered Cloth" },     type: "armor", slot: "armor", def: 2, value: 10,
                   desc: { zh: "勉强蔽体的破布。", en: "Rags barely covering the body." } },
    leather:     { name: { zh: "皮甲", en: "Leather Armor" },          type: "armor", slot: "armor", def: 5, value: 40,
                   desc: { zh: "硝制良好的皮甲，轻便耐用。", en: "Well-cured leather, light and durable." } },
    chainmail:   { name: { zh: "锁子甲", en: "Chainmail" },            type: "armor", slot: "armor", def: 9, value: 100,
                   desc: { zh: "由无数铁环编成的铠甲。", en: "Armor woven from countless iron rings." } },
    rune_armor:  { name: { zh: "符文铠甲", en: "Runed Armor" },        type: "armor", slot: "armor", def: 14, value: 200,
                   desc: { zh: "铭刻防御符文的厚重铠甲。", en: "Heavy armor etched with warding runes." } },
    cloak_shadow:{ name: { zh: "暗影斗篷", en: "Shadow Cloak" },       type: "armor", slot: "armor", def: 12, spd: 3, value: 260,
                   desc: { zh: "融入黑暗的斗篷，行动更加迅捷。", en: "A cloak that melts into darkness, quickening movement." } },
    scale_dragon:{ name: { zh: "龙鳞甲", en: "Dragonscale Mail" },     type: "armor", slot: "armor", def: 20, value: 420,
                   desc: { zh: "用龙鳞打造的绝世铠甲。", en: "Peerless armor forged from dragon scales." } },
    armor_abyss: { name: { zh: "深渊守望甲", en: "Abyss Warden Plate" }, type: "armor", slot: "armor", def: 28, luck: 3, value: 860,
                   desc: { zh: "守望深渊的骑士铠甲，其上刻着古老的誓言。", en: "Plate of the abyss warden, etched with an ancient oath." } },
    charm_luck:  { name: { zh: "幸运符", en: "Lucky Charm" },          type: "trinket", slot: "trinket", luck: 5, value: 80,
                   desc: { zh: "据说能为持有者带来好运的护符。", en: "A charm said to bring fortune to its bearer." } },
    ring_power:  { name: { zh: "力量指环", en: "Ring of Power" },      type: "trinket", slot: "trinket", atk: 5, value: 150,
                   desc: { zh: "注入蛮力之力的指环。", en: "A ring imbued with brute strength." } },
    amulet_life: { name: { zh: "生命护符", en: "Amulet of Life" },     type: "trinket", slot: "trinket", hp: 25, value: 220,
                   desc: { zh: "蕴含生命精华的护符，提升生命上限。", en: "An amulet holding life essence, raising max HP." } },
    coin_greed:  { name: { zh: "贪婪金币", en: "Coin of Greed" },      type: "trinket", slot: "trinket", goldMult: 1.3, luck: 2, value: 300,
                   desc: { zh: "一枚永远渴望更多金币的诅咒金币。", en: "A cursed coin that forever craves more gold." } },
    phoenix:     { name: { zh: "凤凰羽毛", en: "Phoenix Feather" },    type: "trinket", slot: "trinket", revive: true, value: 500,
                   desc: { zh: "救赎之羽：战斗中被击杀时以 30% 生命重生一次。", en: "Feather of salvation: revive at 30% HP once when slain." } },
    potion_small:{ name: { zh: "治疗药水", en: "Health Potion" },      type: "consumable", heal: 30, value: 20,
                   desc: { zh: "恢复 30 点生命。", en: "Restores 30 HP." } },
    potion_big:  { name: { zh: "大治疗药水", en: "Greater Health Potion" }, type: "consumable", heal: 70, value: 55,
                   desc: { zh: "恢复 70 点生命。", en: "Restores 70 HP." } },
    potion_mana: { name: { zh: "魔力药水", en: "Mana Potion" },        type: "consumable", mana: 25, value: 40,
                   desc: { zh: "恢复 25 点魔力。", en: "Restores 25 MP." } },
    potion_antidote: { name: { zh: "解毒剂", en: "Antidote" },         type: "consumable", cure: ["poison"], value: 25,
                   desc: { zh: "解除中毒。", en: "Cures poison." } },
    bomb_fire:   { name: { zh: "燃烧弹", en: "Firebomb" },             type: "consumable", damage: 40, value: 45,
                   desc: { zh: "对敌人造成 40 点火焰伤害。", en: "Deals 40 fire damage." } },
    potion_rage: { name: { zh: "狂暴药剂", en: "Berserk Draught" },    type: "consumable", status: "enrage", value: 35,
                   desc: { zh: "使你进入狂暴状态。", en: "Enter an enraged state." } },
    holy_water:  { name: { zh: "圣水", en: "Holy Water" },             type: "consumable", cureAll: true, value: 40,
                   desc: { zh: "清除所有负面状态。", en: "Clears all negative statuses." } },
    scroll_arcane: { name: { zh: "经验典籍", en: "Arcane Tome" },      type: "consumable", xp: 40, value: 55,
                   desc: { zh: "研读后获得 40 点经验。", en: "Grants 40 XP when read." } },
    elixir_life: { name: { zh: "万灵药", en: "Elixir of Life" },       type: "consumable", heal: 9999, mana: 9999, value: 120,
                   desc: { zh: "完全恢复生命与魔力。", en: "Fully restores HP and MP." } }
  },

  /* ---------- PLAYER SKILLS ---------- */
  skills: {
    power_strike: { name: { zh: "重击", en: "Power Strike" }, mp: 6, power: 1.6, cooldown: 0,
                    desc: { zh: "奋力一击，造成 160% 伤害。", en: "A mighty blow dealing 160% damage." } },
    flurry:       { name: { zh: "连斩", en: "Flurry" },       mp: 8, power: 0.65, hits: 2, cooldown: 0,
                    desc: { zh: "快速连击两次，每次造成 65% 伤害。", en: "Strike twice, each hit dealing 65% damage." } },
    rend:         { name: { zh: "撕裂", en: "Rend" },         mp: 10, power: 1.0, status: "bleed", cooldown: 2,
                    desc: { zh: "造成伤害并施加流血。", en: "Deal damage and inflict bleeding." } },
    venom:        { name: { zh: "淬毒", en: "Venom" },        mp: 10, power: 1.0, status: "poison", cooldown: 2,
                    desc: { zh: "造成伤害并施加中毒。", en: "Deal damage and inflict poison." } },
    flame:        { name: { zh: "烈焰", en: "Flame" },        mp: 12, power: 1.3, status: "burn", cooldown: 2,
                    desc: { zh: "火焰冲击，造成 130% 伤害并施加灼烧。", en: "Flame strike dealing 130% damage and burning." } },
    leech:        { name: { zh: "吸血", en: "Leech" },        mp: 14, power: 1.1, drain: 0.5, cooldown: 3,
                    desc: { zh: "造成 110% 伤害，恢复伤害值 50% 的生命。", en: "Deal 110% damage, heal for 50% of damage dealt." } },
    berserk:      { name: { zh: "狂暴", en: "Berserk" },      mp: 12, buff: "enrage", cooldown: 4,
                    desc: { zh: "进入狂暴：攻击 +50%，防御 -30%，持续 3 回合。", en: "Enrage: +50% attack, -30% defense for 3 turns." } },
    ward:         { name: { zh: "守护", en: "Ward" },         mp: 8,  buff: "ward", cooldown: 3,
                    desc: { zh: "展开守护屏障：防御 +100%，持续 2 回合。", en: "Raise a ward: +100% defense for 2 turns." } },
    cleanse:      { name: { zh: "净化", en: "Cleanse" },      mp: 10, cleanse: true, cooldown: 3,
                    desc: { zh: "清除自身所有负面状态。", en: "Cleanse all negative statuses." } }
  },

  /* ---------- ROOM EVENTS ---------- */
  events: {
    merchant:   { name: { zh: "流浪商人", en: "Wandering Merchant" },
                  desc: { zh: "一个兜售货物的商人坐在篝火旁，目光狡黠。", en: "A merchant sits by a fire, hawking wares with cunning eyes." } },
    fountain:   { name: { zh: "神秘喷泉", en: "Mysterious Fountain" },
                  desc: { zh: "泉水中闪烁着微光，饮下它，命运将因此改变。", en: "The spring water glimmers. Drink, and fate will shift." } },
    altar:      { name: { zh: "污秽祭坛", en: "Foul Altar" },
                  desc: { zh: "祭坛上残留着深红色的血迹，似乎等待着献祭。", en: "The altar bears dark crimson stains, as if awaiting sacrifice." } },
    chest:      { name: { zh: "古老宝箱", en: "Ancient Chest" },
                  desc: { zh: "一个积满灰尘的宝箱静静地躺在角落。", en: "A dust-covered chest rests quietly in the corner." } },
    tomb:       { name: { zh: "无名墓穴", en: "Unmarked Tomb" },
                  desc: { zh: "墓碑上没有名字，只有一行用血写成的警告。", en: "The gravestone bears no name, only a warning written in blood." } },
    shrine:     { name: { zh: "崩塌神龛", en: "Crumbling Shrine" },
                  desc: { zh: "一尊不知名的神像坍塌在地，仍散发着微弱的威压。", en: "A nameless idol lies crumbled yet still faintly imposing." } },
    vein:       { name: { zh: "暗金矿脉", en: "Dark Gold Vein" },
                  desc: { zh: "墙壁中嵌着闪光的矿脉，敲击声回荡在洞穴中。", en: "Glinting ore veins run through the wall; tapping echoes through the cave." } },
    statue:     { name: { zh: "深渊雕像", en: "Abyssal Statue" },
                  desc: { zh: "雕像的双眼凝视着深渊的方向，掌心托着一枚碎片。", en: "The statue stares into the abyss, a fragment cradled in its palm." } },
    spidernest: { name: { zh: "蛛巢", en: "Spider Nest" },
                  desc: { zh: "蛛网覆盖了整个房间，中央传来窸窣声。", en: "Webs cover the whole room; rustling comes from the center." } },
    supply:     { name: { zh: "补给箱", en: "Supply Cache" },
                  desc: { zh: "一个标记着古老军徽的木箱，也许是某个远征队留下的。", en: "A crate marked with an old legion crest, left by some expedition." } },
    fortune:    { name: { zh: "占卜师", en: "Fortune Teller" },
                  desc: { zh: "披着星纹斗篷的老者摊开塔罗牌，牌面映着深渊的倒影。", en: "An elder in a star-patterned cloak spreads tarot cards that mirror the abyss." } },
    library:    { name: { zh: "深渊图书馆", en: "Abyss Library" },
                  desc: { zh: "一间堆满腐烂典籍的房间，书脊上的文字仍在蠕动。", en: "A room piled with rotting tomes whose letters still writhe." } }
  },

  /* ---------- ACHIEVEMENTS ---------- */
  achievements: {
    first_step:    { name: { zh: "初次踏入", en: "First Steps" },          desc: { zh: "踏入深渊", en: "Enter the abyss" } },
    first_blood:   { name: { zh: "初尝血腥", en: "First Blood" },          desc: { zh: "击杀第一个敌人", en: "Slay your first enemy" } },
    depth_3:       { name: { zh: "深入浅层", en: "Shallow Depths" },       desc: { zh: "到达第 3 层", en: "Reach floor 3" } },
    depth_6:       { name: { zh: "中层守望", en: "Mid Abyss" },            desc: { zh: "到达第 6 层", en: "Reach floor 6" } },
    depth_9:       { name: { zh: "深层徘徊", en: "Deep Abyss" },           desc: { zh: "到达第 9 层", en: "Reach floor 9" } },
    depth_12:      { name: { zh: "深渊之底", en: "Floor of the Abyss" },   desc: { zh: "到达第 12 层", en: "Reach floor 12" } },
    boss_1:        { name: { zh: "屠虫者", en: "Worm Slayer" },            desc: { zh: "击败吞噬者·格鲁尔", en: "Defeat Grul the Devourer" } },
    boss_2:        { name: { zh: "墓穴征服者", en: "Tomb Conqueror" },     desc: { zh: "击败墓穴女王·莫尔格", en: "Defeat Morgue the Tomb Queen" } },
    boss_3:        { name: { zh: "破钢者", en: "Steelbreaker" },           desc: { zh: "击败钢核巨像·铁心", en: "Defeat Ironheart the Steel Colossus" } },
    boss_4:        { name: { zh: "虚空驱逐者", en: "Void Expeller" },      desc: { zh: "击败虚空领主·卡拉泽斯", en: "Defeat Karazes the Void Lord" } },
    slayer:        { name: { zh: "深渊屠戮者", en: "Abyss Slayer" },       desc: { zh: "击败深渊之主·奥伯斯", en: "Defeat Obys, Lord of the Abyss" } },
    kills_25:      { name: { zh: "猎手", en: "Hunter" },                   desc: { zh: "累计击杀 25 只怪物", en: "Slay 25 monsters" } },
    kills_100:     { name: { zh: "屠夫", en: "Butcher" },                  desc: { zh: "累计击杀 100 只怪物", en: "Slay 100 monsters" } },
    level_10:      { name: { zh: "十级勇士", en: "Level 10" },             desc: { zh: "达到 10 级", en: "Reach level 10" } },
    level_20:      { name: { zh: "二十级传说", en: "Level 20" },           desc: { zh: "达到 20 级", en: "Reach level 20" } },
    rich:          { name: { zh: "深渊财主", en: "Abyss Tycoon" },         desc: { zh: "同时持有 500 金币", en: "Hold 500 gold at once" } },
    collector:     { name: { zh: "收藏家", en: "Collector" },              desc: { zh: "收集 12 种不同物品", en: "Collect 12 distinct items" } },
    survivor:      { name: { zh: "劫后余生", en: "Survivor" },             desc: { zh: "从死亡边缘被复活", en: "Be revived from the brink" } },
    truth:         { name: { zh: "真相之眼", en: "Eye of Truth" },         desc: { zh: "集齐全部真相碎片", en: "Gather all fragments of truth" } },
    elite_hunter:  { name: { zh: "精英猎手", en: "Elite Hunter" },         desc: { zh: "击杀 10 个精英怪物", en: "Slay 10 elite monsters" } },
    fortune:       { name: { zh: "幸运儿", en: "Lucky One" },              desc: { zh: "在占卜师那里赌赢 3 次", en: "Win 3 bets with the fortune teller" } },
    bookworm:      { name: { zh: "书虫", en: "Bookworm" },                 desc: { zh: "造访深渊图书馆 3 次", en: "Visit the abyss library 3 times" } },
    prestige_1:    { name: { zh: "轮回之始", en: "First Rebirth" },        desc: { zh: "完成第一次转生", en: "Transcend for the first time" } },
    bestiary:      { name: { zh: "图鉴学家", en: "Codex Scholar" },        desc: { zh: "图鉴中解锁 12 种怪物", en: "Unlock 12 monsters in the codex" } }
  },

  /* ---------- ENDINGS ---------- */
  endings: {
    abyss_lord: { name: { zh: "结局：深渊主宰", en: "Ending: Lord of the Abyss" },
                  desc: { zh: "你击败了深渊之主，坐上了它的王座。深渊的力量涌入你的身体，你成为新的主宰。从此深渊不再吞噬旅人——因为所有坠入者，都将臣服于你。",
                          en: "You slew the Lord of the Abyss and took its throne. The abyss' power floods into you; you become the new sovereign. The abyss no longer devours travelers — all who fall now bow to you." } },
    truth:      { name: { zh: "结局：深渊之眼（真结局）", en: "Ending: The Eye of Truth (True Ending)" },
                  desc: { zh: "你集齐了三枚真相碎片，看穿了深渊的本质。你没有取代深渊之主，而是将碎片之力汇入深渊核心，封印了这道永无止境的裂隙。深渊归于寂静，而你的名字被刻在裂隙的入口：『守门人』。",
                          en: "You gathered the three fragments of truth and saw the nature of the abyss. You did not usurp the Lord; instead you poured the fragments' power into the abyss core, sealing the endless rift forever. The abyss falls silent, and your name is carved at its mouth: 'The Gatekeeper'." } }
  },

  /* ---------- FRAGMENTS (true ending keys) ---------- */
  fragments: {
    frag_1: { name: { zh: "真相碎片·其一", en: "Fragment of Truth I" }, src: "altar" },
    frag_2: { name: { zh: "真相碎片·其二", en: "Fragment of Truth II" }, src: "statue" },
    frag_3: { name: { zh: "真相碎片·其三", en: "Fragment of Truth III" }, src: "boss_abyss" }
  }
};

/* CommonJS export for node tests */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ABYSS: ABYSS };
}