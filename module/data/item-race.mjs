import dccworldItemBase from "./base-item.mjs";

/**
 * Race Item Data Model
 *
 * Represents a character race (Human, Elf, Dwarf, etc.) that defines:
 * - Ability score bonuses
 * - Size and speed
 * - Resource bonuses (HP, Stamina, Mana)
 * - Senses and traits
 * - Granted skills
 *
 * **Design Guidelines:**
 * - **Must grant exactly 2-3 skills from general or utility categories**
 * - **Can grant 0-2 skills from magic or combat categories**
 * - Recommended skill levels: 1-2
 *
 * @extends dccworldItemBase
 */
export default class dccworldRace extends dccworldItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    // Ability score bonuses
    schema.abilityBonuses = new fields.SchemaField({
      str: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      dex: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      con: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      int: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      wis: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      cha: new fields.NumberField({ ...requiredInteger, initial: 0 })
    });

    // Movement speed
    schema.speed = new fields.NumberField({
      ...requiredInteger,
      initial: 30,
      min: 0
    });

    // Size category
    schema.size = new fields.StringField({
      required: true,
      initial: "medium",
      choices: ["tiny", "small", "medium", "large", "huge", "gargantuan"]
    });

    // Special senses
    schema.senses = new fields.SchemaField({
      darkvision: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      blindsight: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      tremorsense: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      truesight: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 })
    });

    // Languages
    schema.languages = new fields.StringField({
      required: true,
      blank: true,
      initial: "Common"
    });

    // Racial traits (stored as text for now, could be converted to array later)
    schema.traits = new fields.StringField({
      required: true,
      blank: true,
      initial: ""
    });

    // HP, Stamina, Mana bonuses
    schema.bonuses = new fields.SchemaField({
      hp: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      stamina: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      mana: new fields.NumberField({ ...requiredInteger, initial: 0 })
    });

    return schema;
  }
}
