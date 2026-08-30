// Import document classes.
import { dccworldActor } from './documents/actor.mjs';
import { dccworldItem } from './documents/item.mjs';
// Import sheet classes.
import { dccworldActorSheet } from './sheets/actor-sheet.mjs';
import { dccworldItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { DCC_WORLD } from './helpers/config.mjs';
import { initializeChatListeners } from './helpers/dice.mjs';
import { grantAchievementMacro, ensureSystemMacros } from './helpers/macros.mjs';
// Import DataModel classes
import * as models from './data/_module.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.dungeoncrawlerworld = {
    dccworldActor,
    dccworldItem,
    rollItemMacro,
    grantAchievementMacro,
  };

  // Add custom constants for configuration.
  CONFIG.DCC_WORLD = DCC_WORLD;

  // Populated for real once the DCW-Content skills compendium is available - see the 'ready'
  // hook below. Placeholder here so any lookup that runs before then degrades gracefully.
  CONFIG.DCC_WORLD.skillsManifest = { skills: {} };

  // No CONFIG.Combat.initiative formula: initiative is card-based (see Rules/Combat/Initiative.md)
  // and run by the AI narrating turn order rather than through Foundry's numeric Combat Tracker.

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = dccworldActor;

  // Note that you don't need to declare a DataModel
  // for the base actor/item classes - they are included
  // with the Character/NPC as part of super.defineSchema()
  CONFIG.Actor.dataModels = {
    character: models.dccworldCharacter,
    npc: models.dccworldNPC
  }
  CONFIG.Item.documentClass = dccworldItem;
  CONFIG.Item.dataModels = {
    item: models.dccworldItem,
    feature: models.dccworldFeature,
    spell: models.dccworldSpell,
    skill: models.dccworldSkill,
    class: models.dccworldClass,
    race: models.dccworldRace,
    weapon: models.dccworldWeapon,
    armor: models.dccworldArmor,
    lootbox: models.dccworldLootbox,
    god: models.dccworldGod,
    achievement: models.dccworldAchievement
  }

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('dungeon-crawler-world', dccworldActorSheet, {
    makeDefault: true,
    label: 'DCC_WORLD.SheetLabels.Actor',
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('dungeon-crawler-world', dccworldItemSheet, {
    makeDefault: true,
    types: ['item', 'feature', 'spell', 'skill', 'class', 'race', 'weapon', 'armor', 'lootbox', 'god', 'achievement'],
    label: 'DCC_WORLD.SheetLabels.Item',
  });

  // Initialize chat message listeners
  initializeChatListeners();

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

// Equality comparison helper for select dropdowns
Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});

// Division helper for XP bar percentage
Handlebars.registerHelper('divide', function (a, b) {
  if (b === 0) return 0;
  return a / b;
});

// Addition helper
Handlebars.registerHelper('add', function (a, b) {
  return a + b;
});

// Range helper for creating arrays (e.g., for dropdowns)
Handlebars.registerHelper('range', function (start, end) {
  const arr = [];
  for (let i = start; i < end; i++) {
    arr.push(i);
  }
  return arr;
});

// Greater than comparison helper
Handlebars.registerHelper('gt', function (a, b) {
  return a > b;
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

/**
 * Build CONFIG.DCC_WORLD.skillsManifest from the DCW-Content skills compendium (pack id
 * `dcw-content.skills`) rather than fetching a static JSON file - the system previously fetched
 * `systems/dungeon-crawler-world/data/skills-manifest.json`, a path that never existed (that
 * manifest is authoring-only source data that lives in, and never ships out of, the separate
 * DCW-Content repo/module - see its build-release.mjs `excludePatterns`). That 404 was silently
 * swallowed, so this always resolved to `{skills: {}}`, and every skill known only via a
 * `grantedSkills` reference (never owned as its own Skill item - true of every NPC's
 * weapon/armor-granted combat skill) fell back to the placeholder branch in
 * `_aggregateSkills` (base-actor.mjs) that hardcodes `category: 'general'`. Reading the live
 * compendium instead is correct regardless of whether DCW-Content ships a `data/` folder, since
 * the pack itself is exactly the skill metadata this needs.
 */
async function loadSkillsManifest() {
  const pack = game.packs.get('dcw-content.skills');
  if (!pack) {
    console.warn('DCC World: dcw-content.skills compendium not found - install/enable the DCW-Content module for correct skill categories (combat-skill damage rolls in particular depend on this).');
    return;
  }

  const index = await pack.getIndex({ fields: ['system.category', 'system.relatedStat', 'system.effort', 'system.description'] });
  const skills = {};
  for (const entry of index) {
    const category = entry.system?.category || 'general';
    (skills[category] ??= []).push({
      name: entry.name,
      category,
      relatedStat: entry.system?.relatedStat ?? null,
      effort: entry.system?.effort || 0,
      description: entry.system?.description || '',
      uuid: entry.uuid
    });
  }

  CONFIG.DCC_WORLD.skillsManifest = { skills };
  console.log(`DCC World: Skills manifest loaded from compendium (${index.size} skills)`);
}

Hooks.once('ready', async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));

  // Auto-create the "Grant Achievement" world macro for GMs if it doesn't exist yet.
  ensureSystemMacros();

  // Load skill metadata (category/relatedStat/effort) from the DCW-Content skills compendium.
  // This is what lets _aggregateSkills (base-actor.mjs) correctly categorize a skill that's only
  // granted by an equipped item and never owned outright as its own Skill item - the case for
  // every NPC's weapon/armor-granted combat skill, since monsters have no skill items of their
  // own to read category off of directly.
  await loadSkillsManifest();
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.dungeoncrawlerworld.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'dungeon-crawler-world.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}
