import dccworldItemBase from "./base-item.mjs";

/**
 * Race Item Data Model
 *
 * Represents a character race (Human, Elf, Dwarf, etc.) that defines:
 * - Ability score bonuses
 * - Size and speed
 * - Resource bonuses (HP, Stamina, Mana)
 * - Senses
 * - Languages
 * - Racial features (references to feature items)
 * - Granted skills
 *
 * **Design Guidelines:**
 * - **Must grant exactly 2 skills from general or utility categories**
 * - **Must grant exactly 1 skill from magic or combat categories**
 * - **Total ability bonuses must equal exactly 3**
 * - Recommended skill levels: 1-2
 * - Features should be created as feature items and referenced here
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

    // Racial features (references to feature items)
    // Format: Array of {featureUuid: string, level: number}
    schema.features = new fields.ArrayField(
      new fields.ObjectField({
        required: true,
        nullable: false,
        initial: {}
      }),
      {
        required: true,
        initial: []
      }
    );

    // HP, Stamina, Mana bonuses
    schema.bonuses = new fields.SchemaField({
      hp: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      stamina: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      mana: new fields.NumberField({ ...requiredInteger, initial: 0 })
    });

    return schema;
  }
}
