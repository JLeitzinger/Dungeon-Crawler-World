/**
 * Achievement granting logic - see module/helpers/macros.mjs for the GM-facing "Grant
 * Achievement" macro that drives this. Achievements are world Items (type "achievement",
 * not compendium content - these are campaign-specific, GM-authored recognitions).
 * Granting one logs an entry on the receiving character's system.achievements and, based
 * on rewardType, creates a reward item on the character too:
 *   - "lootbox": builds a lootbox of rewardTier directly (no pre-authored lootbox Item
 *     needs to exist anywhere - a lootbox only needs a tier to be opened).
 *   - "item": creates whatever Item rewardUuid points to.
 *   - "none": no reward.
 */

/**
 * Grant an achievement to a character: logs it and creates the reward item, if any.
 * @param {Actor} actor - Must be type 'character'
 * @param {Item} achievementItem - A world Item of type 'achievement'
 * @returns {Promise<Object|null>} The logged achievement entry, or null if not applicable
 */
export async function grantAchievement(actor, achievementItem) {
  if (actor.type !== 'character') {
    ui.notifications.warn('Only characters can receive achievements.');
    return null;
  }

  const system = achievementItem.system || {};
  const rewardType = system.rewardType || 'none';
  const rewardQuantity = system.rewardQuantity || 1;
  let rewardName = '';

  if (rewardType === 'lootbox' && system.rewardTier) {
    const tier = system.rewardTier;
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
    const lootboxData = {
      name: `${tierLabel} Lootbox`,
      type: 'lootbox',
      system: { description: '', tier, quantity: rewardQuantity }
    };
    await Item.createDocuments([lootboxData], { parent: actor });
    rewardName = rewardQuantity > 1 ? `${tierLabel} Lootbox x${rewardQuantity}` : `${tierLabel} Lootbox`;
  } else if (rewardType === 'item' && system.rewardUuid) {
    try {
      const rewardDoc = await fromUuid(system.rewardUuid);
      if (rewardDoc) {
        const rewardData = rewardDoc.toObject();
        delete rewardData._id;
        // Reward items with a quantity field (e.g. lootboxes) get stacked to rewardQuantity;
        // anything else is just granted as-is.
        if ('quantity' in (rewardData.system || {})) {
          rewardData.system.quantity = rewardQuantity;
        }
        await Item.createDocuments([rewardData], { parent: actor });
        rewardName = rewardQuantity > 1 ? `${rewardDoc.name} x${rewardQuantity}` : rewardDoc.name;
      } else {
        console.warn(`DCC World: Achievement reward "${system.rewardUuid}" not found.`);
        ui.notifications.warn(`Achievement reward not found (${system.rewardUuid}) - achievement granted without it.`);
      }
    } catch (error) {
      console.warn(`DCC World: Error granting achievement reward "${system.rewardUuid}":`, error);
    }
  }

  const achievements = foundry.utils.duplicate(actor.system.achievements || []);
  const entry = {
    name: achievementItem.name,
    img: achievementItem.img || '',
    description: system.description || '',
    rewardName,
    dateReceived: new Date().toLocaleDateString()
  };
  achievements.push(entry);
  await actor.update({ 'system.achievements': achievements });

  await sendAchievementEarnedToChat(actor, achievementItem, rewardName);

  return entry;
}

/**
 * Post a chat card announcing an earned achievement.
 * @param {Actor} actor
 * @param {Item} achievementItem
 * @param {string} rewardName
 */
async function sendAchievementEarnedToChat(actor, achievementItem, rewardName) {
  const templateData = {
    actorName: actor.name,
    achievementName: achievementItem.name,
    achievementImg: achievementItem.img,
    description: achievementItem.system?.description || '',
    rewardName
  };

  const content = await renderTemplate(
    'systems/dungeon-crawler-world/templates/chat/achievement-earned-card.hbs',
    templateData
  );

  return ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    sound: CONFIG.sounds.notification
  });
}
