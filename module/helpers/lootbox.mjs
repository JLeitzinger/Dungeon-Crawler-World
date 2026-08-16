/**
 * Lootbox opening logic.
 *
 * Lootboxes don't carry their own loot - opening one rolls a rarity (weighted by the box's
 * tier, see CONFIG.DCC_WORLD.lootboxRarityWeights) and pulls a random matching item straight
 * out of the DCW-Content module's "Items & Equipment" and "Weapons" compendium packs. That
 * means the loot pool grows automatically as new items/weapons are added to those packs -
 * nothing here needs to change when content is added.
 */

const LOOT_PACK_KEYS = ['dcw-content.items', 'dcw-content.weapons'];

/**
 * Pick a random key from a weight map (e.g. {common: 60, uncommon: 30, ...}).
 * @param {Object<string, number>} weights
 * @returns {string|null} The picked key, or null if every weight is 0/missing.
 */
function rollWeighted(weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return null;

  let roll = Math.random() * total;
  for (const [key, w] of entries) {
    if (roll < w) return key;
    roll -= w;
  }
  return entries[entries.length - 1][0];
}

/**
 * Roll a rarity for one pull from a lootbox of the given tier.
 * @param {string} tier
 * @returns {string} An item rarity (falls back to "common" if the tier is unrecognized).
 */
export function rollLootRarity(tier) {
  const weights = CONFIG.DCC_WORLD.lootboxRarityWeights[tier];
  if (!weights) return 'common';
  return rollWeighted(weights) ?? 'common';
}

/**
 * Index both loot compendium packs and group entries by rarity.
 * @returns {Promise<Object<string, Array<{packKey: string, id: string}>>>}
 */
async function buildRarityPools() {
  const pools = {};
  for (const rarity of CONFIG.DCC_WORLD.itemRarities) pools[rarity] = [];

  for (const packKey of LOOT_PACK_KEYS) {
    const pack = game.packs.get(packKey);
    if (!pack) {
      console.warn(`DCC World: Lootbox loot pack "${packKey}" not found - is the DCW-Content module active?`);
      continue;
    }

    const index = await pack.getIndex({ fields: ['system.rarity'] });
    for (const entry of index) {
      const rarity = entry.system?.rarity || 'common';
      if (!pools[rarity]) pools[rarity] = [];
      pools[rarity].push({ packKey, id: entry._id });
    }
  }

  return pools;
}

/**
 * Given a rolled rarity, find the closest rarity that actually has loot available -
 * stepping down first (a "wasted" high roll should still pay out something), then up if
 * every rarity at or below the roll is empty.
 * @param {Object<string, Array>} pools
 * @param {string} startRarity
 * @returns {string|null} A rarity with at least one pool entry, or null if all pools are empty.
 */
function pickRarityWithLoot(pools, startRarity) {
  const order = CONFIG.DCC_WORLD.itemRarities;
  const startIndex = order.indexOf(startRarity);

  for (let i = startIndex; i >= 0; i--) {
    if (pools[order[i]]?.length) return order[i];
  }
  for (let i = startIndex + 1; i < order.length; i++) {
    if (pools[order[i]]?.length) return order[i];
  }
  return null;
}

/**
 * Open `requestedCount` lootboxes of the given tier for an actor: rolls loot, adds the
 * resulting items to the actor, consumes the boxes, and posts a chat summary.
 * @param {Actor} actor
 * @param {string} tier - One of CONFIG.DCC_WORLD.lootboxTiers
 * @param {number} requestedCount - How many to open; clamped to how many are actually owned.
 * @returns {Promise<Array|null>} The looted results, or null if nothing happened.
 */
export async function openLootboxTier(actor, tier, requestedCount = 1) {
  if (actor.type !== 'character') {
    ui.notifications.warn('Only characters can open lootboxes.');
    return null;
  }

  const boxItems = actor.items.filter(i => i.type === 'lootbox' && i.system.tier === tier);
  const totalAvailable = boxItems.reduce((sum, i) => sum + (i.system.quantity || 0), 0);
  if (totalAvailable <= 0) {
    ui.notifications.warn(`No ${tier} lootboxes to open.`);
    return null;
  }

  const count = Math.min(requestedCount, totalAvailable);

  const pools = await buildRarityPools();
  const hasAnyLoot = Object.values(pools).some(p => p.length);
  if (!hasAnyLoot) {
    ui.notifications.error('No items found in the Items & Equipment or Weapons compendiums - nothing to loot.');
    return null;
  }

  const results = [];
  for (let i = 0; i < count; i++) {
    const rolledRarity = rollLootRarity(tier);
    const actualRarity = pickRarityWithLoot(pools, rolledRarity);
    if (!actualRarity) continue;

    const pool = pools[actualRarity];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const pack = game.packs.get(pick.packKey);
    const doc = await pack.getDocument(pick.id);

    results.push({ itemData: doc.toObject(), name: doc.name, img: doc.img, rarity: actualRarity });
  }

  if (results.length === 0) {
    ui.notifications.warn('Opened the box(es), but found nothing usable in the compendiums.');
    return null;
  }

  // Add the looted items to the actor.
  const newItemData = results.map(r => {
    const data = r.itemData;
    delete data._id;
    return data;
  });
  await Item.createDocuments(newItemData, { parent: actor });

  // Consume the boxes that were opened, draining quantity across however many docs exist.
  let remaining = count;
  for (const box of boxItems) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, box.system.quantity);
    remaining -= take;

    if (take >= box.system.quantity) {
      await box.delete();
    } else {
      await box.update({ 'system.quantity': box.system.quantity - take });
    }
  }

  await sendLootboxOpenToChat(actor, tier, results);

  return results;
}

/**
 * Post a chat card summarizing what a lootbox opening yielded.
 * @param {Actor} actor
 * @param {string} tier
 * @param {Array<{name: string, img: string, rarity: string}>} results
 */
async function sendLootboxOpenToChat(actor, tier, results) {
  const templateData = {
    actorName: actor.name,
    tier,
    tierLabel: tier.charAt(0).toUpperCase() + tier.slice(1),
    count: results.length,
    plural: results.length !== 1,
    results: results.map(r => ({ name: r.name, img: r.img, rarity: r.rarity }))
  };

  const content = await renderTemplate(
    'systems/dungeon-crawler-world/templates/chat/lootbox-open-card.hbs',
    templateData
  );

  return ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    sound: CONFIG.sounds.dice
  });
}
