import dccworldItemBase from "./base-item.mjs";

export default class dccworldSpell extends dccworldItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.spellLevel = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 1, max: 15 });
    schema.castStat = new fields.StringField({ required: false, nullable: true, blank: true, initial: null });
    schema.diceCount = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 1 });
    schema.prowess = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 });
    schema.castingTime = new fields.StringField({ required: false, blank: false, initial: "instantaneous" });
    schema.range = new fields.StringField({ required: false, blank: false, initial: "self" });
    schema.duration = new fields.StringField({ required: false, blank: false, initial: "instantaneous" });
    schema.description = new fields.HTMLField({ required: false, blank: true, initial: "" });

    return schema;
  }
}