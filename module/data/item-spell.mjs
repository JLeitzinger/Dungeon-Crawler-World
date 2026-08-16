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

    // Whether this spell deals damage - gates the damage-roll formula/button.
    // Non-offensive spells (buffs, utility, healing) just use the cast roll's total as their effect.
    schema.offensive = new fields.BooleanField({ required: true, initial: false });

    // Damage roll formula fields, mirroring a weapon's roll/formula (see item-weapon.mjs).
    // Only meaningful when offensive is true. diceBonus should reference this spell's castStat,
    // e.g. "+@int.mod" - it can't be inferred automatically since castStat varies per spell.
    schema.roll = new fields.SchemaField({
      diceNum: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1, min: 1 }),
      diceSize: new fields.StringField({ initial: "d6" }),
      diceBonus: new fields.StringField({ initial: "" })
    });

    schema.formula = new fields.StringField({ blank: true });

    return schema;
  }

  prepareDerivedData() {
    const roll = this.roll;
    this.formula = `${roll.diceNum}${roll.diceSize}${roll.diceBonus}`;
  }
}