import dccworldActorBase from "./base-actor.mjs";

export default class dccworldCharacter extends dccworldActorBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.attributes = new fields.SchemaField({
      level: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 })
      }),
      xp: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 300, min: 0 })
      }),
    });

    // Character details
    schema.details = new fields.SchemaField({
      race: new fields.StringField({ required: true, blank: true }),
      class: new fields.StringField({ required: true, blank: true }),
      subclass: new fields.StringField({ required: true, blank: true }),
    });

    // Derived stats - HP, Stamina, Mana
    schema.hp = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      temp: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 })
    });
    schema.stamina = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 })
    });
    schema.mana = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 })
    });

    // Iterate over ability names and create a new SchemaField for each.
    schema.abilities = new fields.SchemaField(Object.keys(CONFIG.DCC_WORLD.abilities).reduce((obj, ability) => {
      obj[ability] = new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      });
      return obj;
    }, {}));

    return schema;
  }

  prepareDerivedData() {
    // Find class and race items on this actor
    const classItem = this.parent?.items?.find(i => i.type === 'class');
    const raceItem = this.parent?.items?.find(i => i.type === 'race');

    // Apply racial ability bonuses first (before calculating modifiers)
    if (raceItem?.system?.abilityBonuses) {
      for (const [key, bonus] of Object.entries(raceItem.system.abilityBonuses)) {
        if (this.abilities[key]) {
          // Store the base value and bonus separately for display
          this.abilities[key].base = this.abilities[key].value;
          this.abilities[key].racial = bonus;
          this.abilities[key].total = this.abilities[key].value + bonus;
        }
      }
    }

    // Loop through ability scores, and add their modifiers to our sheet output.
    for (const key in this.abilities) {
      // Use total ability score if racial bonuses exist, otherwise use base value
      const abilityScore = this.abilities[key].total ?? this.abilities[key].value;

      // Calculate the modifier using d20 rules.
      this.abilities[key].mod = Math.floor((abilityScore - 10) / 2);
      // Handle ability label localization.
      this.abilities[key].label = game.i18n.localize(CONFIG.DCC_WORLD.abilities[key]) ?? key;
    }

    // Calculate derived stats based on abilities and level
    const level = this.attributes.level.value;
    const conMod = this.abilities.con.mod;
    const intMod = this.abilities.int.mod;

    // Get class-based resource calculations if class exists
    let baseHP = 10;
    let hpPerLevel = Math.max(1, conMod + 2);
    let staminaPerLevel = Math.max(1, conMod + 1);
    let manaPerLevel = Math.max(1, intMod + 1);

    if (classItem?.system) {
      baseHP = classItem.system.baseHP || 10;
      hpPerLevel = classItem.system.hpPerLevel || hpPerLevel;
      staminaPerLevel = classItem.system.staminaPerLevel || staminaPerLevel;
      manaPerLevel = classItem.system.manaPerLevel || manaPerLevel;
    }

    // Calculate max resources
    this.hp.max = baseHP + (hpPerLevel * (level - 1));
    this.stamina.max = 10 + (staminaPerLevel * (level - 1));
    this.mana.max = 10 + (manaPerLevel * (level - 1));

    // Apply racial resource bonuses
    if (raceItem?.system?.bonuses) {
      this.hp.max += raceItem.system.bonuses.hp || 0;
      this.stamina.max += raceItem.system.bonuses.stamina || 0;
      this.mana.max += raceItem.system.bonuses.mana || 0;
    }

    // XP to next level: 300 * current level
    this.attributes.xp.max = 300 * level;

    // Ensure current values don't exceed max
    if (this.hp.value > this.hp.max) this.hp.value = this.hp.max;
    if (this.stamina.value > this.stamina.max) this.stamina.value = this.stamina.max;
    if (this.mana.value > this.mana.max) this.mana.value = this.mana.max;

    // Store references for easy access in templates
    this.classItem = classItem;
    this.raceItem = raceItem;
  }

  getRollData() {
    const data = {};

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (this.abilities) {
      for (let [k,v] of Object.entries(this.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    data.lvl = this.attributes.level.value;

    return data
  }
}