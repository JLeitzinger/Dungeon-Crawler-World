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

    // Whether this item shows a "use" control on the sheet (see Actor#useItem in
    // documents/actor.mjs). Non-consumable gear (armor, tools, torches) just ignores the
    // fields below.
    schema.consumable = new fields.BooleanField({ required: true, initial: false });

    // What using this item restores, and how much - clamped to the resource's max like
    // regen already is. Blank/0 = doesn't restore anything on its own (e.g. a pure
    // regen-boost item, though none exist yet).
    schema.restoreResource = new fields.StringField({
      required: true,
      blank: true,
      initial: "",
      choices: ["", "hp", "stamina", "mana"]
    });
    schema.restoreAmount = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });

    // "+regenBoostAmount to regen for the next regenBoostUses Regen rolls" - see
    // rollResourceRegen in helpers/dice.mjs. regenBoostUses > 0 is what makes an item "a
    // potion" for Actor#useItem's cooldown/Poisoned rule - a bandage just leaves this at 0
    // and is exempt.
    schema.regenBoostAmount = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.regenBoostUses = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });

    return schema;
  }
}