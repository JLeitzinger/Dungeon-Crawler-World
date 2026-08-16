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
  };

  // Add custom constants for configuration.
  CONFIG.DCC_WORLD = DCC_WORLD;

  // Load skills manifest for skill metadata lookups
  try {
    const manifestResponse = await fetch('systems/dungeon-crawler-world/data/skills-manifest.json');
    if (manifestResponse.ok) {
      CONFIG.DCC_WORLD.skillsManifest = await manifestResponse.json();
      console.log('DCC World: Skills manifest loaded successfully');
    } else {
      console.warn('DCC World: Could not load skills manifest');
      CONFIG.DCC_WORLD.skillsManifest = { skills: {} };
    }
  } catch (error) {
    console.error('DCC World: Error loading skills manifest:', error);
    CONFIG.DCC_WORLD.skillsManifest = { skills: {} };
  }

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
    lootbox: models.dccworldLootbox,
    god: models.dccworldGod
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
    types: ['item', 'feature', 'spell', 'skill', 'class', 'race', 'weapon', 'lootbox', 'god'],
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

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
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
