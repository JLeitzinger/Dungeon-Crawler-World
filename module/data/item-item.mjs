import dccworldItemBase from "./base-item.mjs";

export default class dccworldItem extends dccworldItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.quantity = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });
    schema.weight = new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 });

    // Rarity field - same choices as weapons. Drives lootbox loot tables (see
    // module/helpers/lootbox.mjs); items without an explicit rarity default to common.
    schema.rarity = new fields.StringField({
      required: true,
      initial: "common",
      choices: ["common", "uncommon", "rare", "legendary", "mythic", "celestial"]
    });

    return schema;
  }
}