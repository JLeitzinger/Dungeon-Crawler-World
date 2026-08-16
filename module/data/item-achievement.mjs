import dccworldDataModel from "./base-model.mjs";

/**
 * Achievement Item Data Model
 *
 * A reusable definition of an achievement a GM can hand out via the "Grant Achievement"
 * macro (see module/helpers/macros.mjs), which can also create these inline. Achievements
 * are authored as world Items (Items directory, not a compendium pack) - they're
 * campaign-specific GM content, unlike the shared DCW-Content packs. Granting one logs an
 * entry on the receiving character's system.achievements and, depending on rewardType,
 * creates a reward item on the character too (see module/helpers/achievements.mjs):
 *   - "none": no automatic reward.
 *   - "lootbox": creates a lootbox of rewardTier - doesn't need any pre-authored lootbox
 *     Item to exist anywhere, since a lootbox only needs a tier to be opened.
 *   - "item": creates whatever Item rewardUuid points to (any type).
 *
 * @extends dccworldDataModel
 */
export default class dccworldAchievement extends dccworldDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.description = new fields.StringField({ required: true, blank: true });

    schema.rewardType = new fields.StringField({
      required: true,
      initial: "lootbox",
      choices: ["none", "lootbox", "item"]
    });

    // Used when rewardType is "lootbox".
    schema.rewardTier = new fields.StringField({
      required: true,
      initial: "bronze",
      choices: ["bronze", "silver", "gold", "platinum", "legendary", "celestial"]
    });

    // Used when rewardType is "item". UUID of an Item to grant.
    schema.rewardUuid = new fields.StringField({ required: true, blank: true });

    schema.rewardQuantity = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });

    return schema;
  }
}
