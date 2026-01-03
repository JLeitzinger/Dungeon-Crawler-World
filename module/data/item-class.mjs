import dccworldItemBase from "./base-item.mjs";

export default class dccworldClass extends dccworldItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    // Hit die type for HP calculation
    schema.hitDie = new fields.StringField({
      required: true,
      initial: "d8",
      choices: ["d6", "d8", "d10", "d12"]
    });

    // Primary ability for the class (used for class features)
    schema.primaryAbility = new fields.StringField({
      required: true,
      initial: "str",
      choices: ["str", "dex", "con", "int", "wis", "cha"]
    });

    // Secondary ability (optional)
    schema.secondaryAbility = new fields.StringField({
      required: false,
      initial: "",
      choices: ["", "str", "dex", "con", "int", "wis", "cha"]
    });

    // Base HP at level 1
    schema.baseHP = new fields.NumberField({
      ...requiredInteger,
      initial: 10,
      min: 1
    });

    // HP per level (calculated from hit die)
    schema.hpPerLevel = new fields.NumberField({
      ...requiredInteger,
      initial: 5,
      min: 1
    });

    // Stamina and Mana modifiers
    schema.staminaPerLevel = new fields.NumberField({
      ...requiredInteger,
      initial: 2,
      min: 0
    });

    schema.manaPerLevel = new fields.NumberField({
      ...requiredInteger,
      initial: 2,
      min: 0
    });

    // Saving throw proficiencies
    schema.saves = new fields.SchemaField({
      str: new fields.BooleanField({ initial: false }),
      dex: new fields.BooleanField({ initial: false }),
      con: new fields.BooleanField({ initial: false }),
      int: new fields.BooleanField({ initial: false }),
      wis: new fields.BooleanField({ initial: false }),
      cha: new fields.BooleanField({ initial: false })
    });

    // Class features by level (stored as text for now)
    schema.features = new fields.StringField({
      required: true,
      blank: true,
      initial: ""
    });

    // Subclass options
    schema.subclasses = new fields.StringField({
      required: true,
      blank: true,
      initial: ""
    });

    // Starting skills granted by this class
    // Stored as an object where keys are skill IDs
    schema.startingSkills = new fields.ObjectField({
      required: true,
      initial: {}
    });

    return schema;
  }
}
