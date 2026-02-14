import dccworldItemBase from "./base-item.mjs";

/**
 * Skill Item Data Model
 * Skills are items that can be learned by characters and improved through use.
 * They have a level (1-15) that determines how many dice are rolled.
 */
export default class dccworldSkill extends dccworldItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    // The skill's level (1-15), determines dice pool size
    schema.level = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
      min: 0,
      max: 15
    });

    // Category for organizing skills
    schema.category = new fields.StringField({
      required: true,
      initial: "general",
      choices: ["combat", "magic", "utility", "general"]
    });

    // Related ability score (optional) - adds modifier to skill rolls
    schema.relatedStat = new fields.StringField({
      required: false,
      nullable: true,
      initial: null,
      choices: ["str", "dex", "con", "int", "wis", "cha"]
    });

    // Effort cost (stamina spent when using this skill)
    schema.effort = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0
    });

    return schema;
  }
}
