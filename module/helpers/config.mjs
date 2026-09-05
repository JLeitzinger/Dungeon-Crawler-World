export const DCC_WORLD = {};

/**
 * The set of Ability Scores used within the system.
 * @type {Object}
 */
DCC_WORLD.abilities = {
  str: 'DCC_WORLD.Ability.Str.long',
  dex: 'DCC_WORLD.Ability.Dex.long',
  con: 'DCC_WORLD.Ability.Con.long',
  int: 'DCC_WORLD.Ability.Int.long',
  wis: 'DCC_WORLD.Ability.Wis.long',
  cha: 'DCC_WORLD.Ability.Cha.long',
};

/**
 * Ability score abbreviations for display
 * @type {Object}
 */
DCC_WORLD.abilityAbbreviations = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

/**
 * Lootbox tiers, weakest to strongest.
 * @type {string[]}
 */
DCC_WORLD.lootboxTiers = ['bronze', 'silver', 'gold', 'platinum', 'legendary', 'celestial'];

/**
 * Item/weapon rarities, weakest to strongest. Matches the `rarity` field choices on
 * item-item.mjs and item-weapon.mjs.
 * @type {string[]}
 */
DCC_WORLD.itemRarities = ['common', 'uncommon', 'rare', 'legendary', 'mythic', 'celestial'];

/**
 * Relative odds of pulling each item rarity from a given lootbox tier. Values are weights,
 * not percentages - they're normalized against whatever rarities actually have matching
 * loot available (see module/helpers/lootbox.mjs#rollLootRarity).
 *
 * Each tier is a 3-rarity window (worst/mid/best) at an 80/15/5 split, and the window
 * slides one rarity higher per tier: bronze starts at common, silver at uncommon, gold at
 * rare, platinum at legendary. Platinum's window (legendary/mythic/celestial) is the last
 * one that fits - there's no rarity past celestial to slide into - so legendary and
 * celestial tier boxes instead narrow the window from the bottom: legendary drops down to
 * a 2-rarity mythic/celestial split (95/5), and celestial collapses to a guaranteed
 * celestial pull.
 * @type {Object<string, Object<string, number>>}
 */
DCC_WORLD.lootboxRarityWeights = {
  bronze:    { common: 80, uncommon: 15, rare: 5,   legendary: 0,  mythic: 0,  celestial: 0 },
  silver:    { common: 0,  uncommon: 80, rare: 15,  legendary: 5,  mythic: 0,  celestial: 0 },
  gold:      { common: 0,  uncommon: 0,  rare: 80,  legendary: 15, mythic: 5,  celestial: 0 },
  platinum:  { common: 0,  uncommon: 0,  rare: 0,   legendary: 80, mythic: 15, celestial: 5 },
  legendary: { common: 0,  uncommon: 0,  rare: 0,   legendary: 0,  mythic: 95, celestial: 5 },
  celestial: { common: 0,  uncommon: 0,  rare: 0,   legendary: 0,  mythic: 0,  celestial: 100 },
};
