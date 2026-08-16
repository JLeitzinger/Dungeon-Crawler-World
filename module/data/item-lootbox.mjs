import dccworldDataModel from "./base-model.mjs";

/**
 * Lootbox Item Data Model
 *
 * A stackable, consumable container. Doesn't grant anything on its own - opening one
 * (see module/helpers/lootbox.mjs) pulls a random item from the "Items & Equipment" and
 * "Weapons" compendium packs, weighted toward higher rarities as tier increases, and adds
 * it to the actor. Opening consumes one box regardless of what it yields.
 *
 * @extends dccworldDataModel
 */
export default class dccworldLootbox extends dccworldDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.description = new fields.StringField({ required: true, blank: true });

    schema.tier = new fields.StringField({
      required: true,
      initial: "bronze",
      choices: ["bronze", "silver", "gold", "platinum", "legendary", "celestial"]
    });

    schema.quantity = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });

    return schema;
  }
}
