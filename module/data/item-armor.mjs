import dccworldItemBase from "./base-item.mjs";

/**
 * Armor Item Data Model
 *
 * Represents armor and shields. Grants combat skills (typically Block or Dodge) only while
 * equipped - mirrors dccworldWeapon's equip/effort pattern exactly, including how equipped
 * armor's effort feeds into the equipped-item-effort lookup in Actor#rollSkill.
 *
 * Unlike weapons, armor also has a passive `damageReduction`: flat damage subtracted in
 * Actor#applyDamage whenever this armor is equipped, regardless of which skill (if any) was
 * rolled to defend - see the design notes in Rules/Combat/ (Block vs Dodge).
 */
export default class dccworldArmor extends dccworldItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.quantity = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });
    schema.weight = new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 });

    schema.rarity = new fields.StringField({
      required: true,
      initial: "common",
      choices: ["common", "uncommon", "rare", "legendary", "mythic", "celestial"]
    });

    // Effort (stamina cost per Block/Dodge roll) - same role as weapon effort.
    schema.effort = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });

    // Flat damage reduction applied to any hit while equipped - passive, not tied to
    // whether the defender actually rolled Block or Dodge for that hit.
    schema.damageReduction = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });

    // Equipped status - determines if armor grants skills/luck and applies its damage reduction.
    schema.equipped = new fields.BooleanField({ required: true, initial: false });

    return schema;
  }
}
