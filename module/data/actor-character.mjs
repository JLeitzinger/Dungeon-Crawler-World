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
      // Failure XP - earned from failed rolls, spent to make dice 6s for skill improvement
      failureXP: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      // Available stat increases (gained on level up)
      statIncreases: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 })
    });

    // Log of achievements granted via the "Grant Achievement" macro (see
    // module/helpers/achievements.mjs). Not embedded items - just a plain record of what
    // was earned, when, and what reward (if any) came with it.
    schema.achievements = new fields.ArrayField(new fields.SchemaField({
      name: new fields.StringField({ required: true, blank: true }),
      img: new fields.StringField({ required: true, blank: true }),
      description: new fields.StringField({ required: true, blank: true }),
      rewardName: new fields.StringField({ required: true, blank: true }),
      dateReceived: new fields.StringField({ required: true, blank: true })
    }), { required: true, initial: [] });

    // Character details
    schema.details = new fields.SchemaField({
      race: new fields.StringField({ required: true, blank: true }),
      class: new fields.StringField({ required: true, blank: true }),
      subclass: new fields.StringField({ required: true, blank: true }),
    });

    // Derived stats - HP, Stamina, Mana
    // `gainedByLevel` records the amount gained at each level-up (index 0 = level 1->2, etc.),
    // locked in via Actor#levelUp() so later stat changes don't retroactively alter past gains.
    schema.hp = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      temp: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      gainedByLevel: new fields.ArrayField(new fields.NumberField({ ...requiredInteger, min: 0 }), { required: true, initial: [] })
    });
    schema.stamina = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      gainedByLevel: new fields.ArrayField(new fields.NumberField({ ...requiredInteger, min: 0 }), { required: true, initial: [] })
    });
    schema.mana = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      gainedByLevel: new fields.ArrayField(new fields.NumberField({ ...requiredInteger, min: 0 }), { required: true, initial: [] })
    });

    // Note: Skills are now stored as items, not directly on the actor.
    // Aggregated skills will be computed in prepareDerivedData() and stored
    // as a non-persisted property for template access.
    // Ability scores and luck are defined on dccworldActorBase (shared with dccworldNPC).

    return schema;
  }

  /**
   * The resource pool spent as "effort" on skill/weapon rolls, and the system field name it
   * lives under - characters spend Stamina; NPCs (no stamina/mana split) spend Power instead.
   * @returns {{field: string, pool: {value: number, max: number}}}
   */
  get effortResource() {
    return { field: 'stamina', pool: this.stamina };
  }

  prepareDerivedData() {
    // Find class and race items on this actor
    const classItem = this.parent?.items?.find(i => i.type === 'class');
    const raceItem = this.parent?.items?.find(i => i.type === 'race');

    // Aggregate skills from all items
    this._aggregateSkills();

    // Aggregate LUK from all items (weapons only while equipped, everything else unconditionally)
    this._aggregateLuck();

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
    this._computeAbilityMods();

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

    // Calculate max resources. Gains already locked in via levelUp() are summed as-is;
    // any levels not yet locked (character predates this tracking, or was leveled by
    // hand instead of the Level Up button) fall back to today's per-level rate.
    this.hp.max = baseHP + this._sumLockedResource(this.hp.gainedByLevel, level - 1, hpPerLevel);
    this.stamina.max = 10 + this._sumLockedResource(this.stamina.gainedByLevel, level - 1, staminaPerLevel);
    this.mana.max = 10 + this._sumLockedResource(this.mana.gainedByLevel, level - 1, manaPerLevel);

    // Apply racial resource bonuses
    if (raceItem?.system?.bonuses) {
      this.hp.max += raceItem.system.bonuses.hp || 0;
      this.stamina.max += raceItem.system.bonuses.stamina || 0;
      this.mana.max += raceItem.system.bonuses.mana || 0;
    }

    // Expose today's per-level rates so Actor#levelUp() can lock in a new level's
    // gain using the same formula/precedence (class values, falling back to CON/INT mod).
    this.currentResourceRates = { hpPerLevel, staminaPerLevel, manaPerLevel };

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

  /**
   * Sum resource gains already locked in via levelUp(), padding any levels not yet
   * locked with today's per-level rate. Locked entries beyond the current level
   * (e.g. after a manual level-down) are ignored.
   * @param {number[]} gainedByLevel - Locked-in gain for each level already reached
   * @param {number} levelsGained - Number of level-ups the character has had (level - 1)
   * @param {number} currentPerLevel - Today's per-level rate, used for any un-locked levels
   * @returns {number} Total gain to add to the base resource value
   * @private
   */
  _sumLockedResource(gainedByLevel, levelsGained, currentPerLevel) {
    const locked = (gainedByLevel || []).slice(0, levelsGained);
    const lockedSum = locked.reduce((sum, gain) => sum + gain, 0);
    const missingLevels = Math.max(0, levelsGained - locked.length);
    return lockedSum + (missingLevels * currentPerLevel);
  }

  // Ability score / skill / luck helpers (_aggregateSkills, _aggregateLuck, getSkill,
  // getSkillsByCategory, getSkillStatModifier, _computeAbilityMods, _baseRollData) are
  // inherited from dccworldActorBase - shared with dccworldNPC.

  getRollData() {
    return { ...this._baseRollData(), lvl: this.attributes.level.value };
  }
}