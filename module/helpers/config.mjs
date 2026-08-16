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
 * loot available (see module/helpers/lootbox.mjs#rollLootRarity). Higher tiers shift weight
 * toward rarer loot and drop the floor out from under common/uncommon results.
 * @type {Object<string, Object<string, number>>}
 */
DCC_WORLD.lootboxRarityWeights = {
  bronze:    { common: 60, uncommon: 30, rare: 8,  legendary: 2,  mythic: 0,  celestial: 0 },
  silver:    { common: 40, uncommon: 35, rare: 18, legendary: 6,  mythic: 1,  celestial: 0 },
  gold:      { common: 20, uncommon: 30, rare: 30, legendary: 15, mythic: 4,  celestial: 1 },
  platinum:  { common: 5,  uncommon: 15, rare: 30, legendary: 30, mythic: 15, celestial: 5 },
  legendary: { common: 0,  uncommon: 5,  rare: 15, legendary: 35, mythic: 30, celestial: 15 },
  celestial: { common: 0,  uncommon: 0,  rare: 5,  legendary: 20, mythic: 35, celestial: 40 },
};
