/**
 * Achievement granting logic - see module/helpers/macros.mjs for the GM-facing "Grant
 * Achievement" macro that drives this. Achievements are world Items (type "achievement",
 * not compendium content - these are campaign-specific, GM-authored recognitions).
 * Granting one logs an entry on the receiving character's system.achievements and,
 * if the achievement has a rewardUuid set, creates that item on the character too
 * (rewards are usually a lootbox, but any Item UUID works).
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

  const rewardUuid = achievementItem.system?.rewardUuid;
  const rewardQuantity = achievementItem.system?.rewardQuantity || 1;
  let rewardName = '';

  if (rewardUuid) {
    try {
      const rewardDoc = await fromUuid(rewardUuid);
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
        console.warn(`DCC World: Achievement reward "${rewardUuid}" not found.`);
        ui.notifications.warn(`Achievement reward not found (${rewardUuid}) - achievement granted without it.`);
      }
    } catch (error) {
      console.warn(`DCC World: Error granting achievement reward "${rewardUuid}":`, error);
    }
  }

  const achievements = foundry.utils.duplicate(actor.system.achievements || []);
  const entry = {
    name: achievementItem.name,
    img: achievementItem.img || '',
    description: achievementItem.system?.description || '',
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
