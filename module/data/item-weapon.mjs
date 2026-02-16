import dccworldItemBase from "./base-item.mjs";

/**
 * Weapon Item Data Model
 *
 * Represents a weapon that can grant combat skills and has damage/attack properties.
 * Weapons grant 1-2 combat skills and may have special features for higher rarities.
 *
 * **Design Guidelines:**
 * - Common weapons: Basic combat skills, no special features
 * - Uncommon weapons: 1 simple feature or slight bonus
 * - Rare weapons: 1-2 meaningful features
 * - Legendary weapons: 2-3 powerful features
 * - Mythic weapons: 3-4 exceptional features
 * - Celestial weapons: 4+ extraordinary features
 *
 * @extends dccworldItemBase
 */
export default class dccworldWeapon extends dccworldItemBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.quantity = new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 });
    schema.weight = new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 });

    // Roll formula fields (number of dice, die size, bonus)
    schema.roll = new fields.SchemaField({
      diceNum: new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 }),
      diceSize: new fields.StringField({ initial: "d20" }),
      diceBonus: new fields.StringField({ initial: "+@str.mod+ceil(@lvl / 2)" })
    });

    schema.formula = new fields.StringField({ blank: true });

    // Rarity field
    schema.rarity = new fields.StringField({
      required: true,
      initial: "common",
      choices: ["common", "uncommon", "rare", "legendary", "mythic", "celestial"]
    });

    // Effort (stamina cost per combat skill roll)
    schema.effort = new fields.NumberField({
      ...requiredInteger,
      initial: 0,
      min: 0
    });

    // Range (melee or distance in feet)
    schema.range = new fields.StringField({
      required: true,
      initial: "melee",
      blank: false
    });

    // Granted features (array of feature objects with UUID and level)
    // Higher rarity weapons should have more/better features
    schema.grantedFeatures = new fields.ArrayField(
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

    return schema;
  }

  prepareDerivedData() {
    // Build the formula dynamically using string interpolation
    const roll = this.roll;
    this.formula = `${roll.diceNum}${roll.diceSize}${roll.diceBonus}`;
  }
}
