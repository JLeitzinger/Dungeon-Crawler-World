import dccworldDataModel from "./base-model.mjs";

/**
 * Achievement Item Data Model
 *
 * A reusable definition of an achievement a GM can hand out via the "Grant Achievement"
 * macro (see module/helpers/macros.mjs). Achievements are authored as world Items (Items
 * directory, not a compendium pack) - they're campaign-specific GM content, unlike the
 * shared DCW-Content packs. Granting one logs an entry on the receiving character's
 * system.achievements and, if rewardUuid is set, creates that item on the character too
 * (see module/helpers/achievements.mjs). Rewards are usually a lootbox, but any Item UUID
 * works.
 *
 * @extends dccworldDataModel
 */
export default class dccworldAchievement extends dccworldDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.description = new fields.StringField({ required: true, blank: true });

    // UUID of an Item to grant as a reward. Blank = no automatic reward.
    schema.rewardUuid = new fields.StringField({ required: true, blank: true });

    schema.rewardQuantity = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });

    return schema;
  }
}
