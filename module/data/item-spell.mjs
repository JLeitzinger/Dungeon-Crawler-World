import dccworldItemBase from "./base-item.mjs";

export default class dccworldSpell extends dccworldItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.spellLevel = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 1, max: 9 });
    schema.castStat = new fields.StringField({ required: false, nullable: true, blank: true, initial: null });
    schema.diceCount = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 1 });

    return schema;
  }
}