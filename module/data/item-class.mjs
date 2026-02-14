import dccworldItemBase from "./base-item.mjs";

/**
 * Class Item Data Model
 *
 * Represents a character class (Fighter, Wizard, etc.) that defines:
 * - Resource scaling (HP, Stamina, Mana per level)
 * - Base hit points at level 1
 * - Granted skills (3-5 skills appropriate to the class theme)
 *
 * **Design Guidelines:**
 * - Martial classes: Grant combat + utility skills
 * - Magic classes: Grant magic + general/utility skills
 * - Rogue classes: Grant utility + combat skills
 * - Recommended skill levels: 1-3
 *
 * @extends dccworldItemBase
 */
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

    // Ability score bonuses per level (stat boost progression)
    schema.abilityBonuses = new fields.SchemaField({
      str: new fields.NumberField({ required: false, initial: 0, min: 0 }),
      dex: new fields.NumberField({ required: false, initial: 0, min: 0 }),
      con: new fields.NumberField({ required: false, initial: 0, min: 0 }),
      int: new fields.NumberField({ required: false, initial: 0, min: 0 }),
      wis: new fields.NumberField({ required: false, initial: 0, min: 0 }),
      cha: new fields.NumberField({ required: false, initial: 0, min: 0 })
    });

    // Level at which this class was acquired (for multiclassing)
    schema.levelAcquired = new fields.NumberField({
      required: true,
      initial: 1,
      integer: true,
      min: 1
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

    // Granted features (array of feature UUIDs)
    schema.grantedFeatures = new fields.ArrayField(
      new fields.StringField({ required: false, blank: false }),
      { required: true, initial: [] }
    );

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

    return schema;
  }
}
