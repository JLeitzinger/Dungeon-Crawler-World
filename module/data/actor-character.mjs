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

    // Note: Skills are now stored as items, not directly on the actor.
    // Aggregated skills will be computed in prepareDerivedData() and stored
    // as a non-persisted property for template access.

    return schema;
  }

  prepareDerivedData() {
    // Find class and race items on this actor
    const classItem = this.parent?.items?.find(i => i.type === 'class');
    const raceItem = this.parent?.items?.find(i => i.type === 'race');

    // Aggregate skills from all items
    this._aggregateSkills();

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

  /**
   * Aggregate skills from all items on the actor
   * Combines skill items with grantedSkills from all other items
   * @private
   */
  _aggregateSkills() {
    // Map to store aggregated skills by skill UUID
    const skillsMap = new Map();

    // Get all items on this actor
    const items = this.parent?.items || [];

    // First pass: collect all skill items and their base levels
    for (const item of items) {
      if (item.type === 'skill') {
        const skillUuid = item.uuid;
        skillsMap.set(skillUuid, {
          uuid: skillUuid,
          id: item.id,
          name: item.name,
          level: item.system.level || 0,
          category: item.system.category || 'general',
          relatedStat: item.system.relatedStat || null,
          effort: item.system.effort || 0,
          description: item.system.description || '',
          sources: [
            { type: 'skill', name: item.name, level: item.system.level || 0, uuid: item.uuid }
          ]
        });
      }
    }

    // Second pass: add bonuses from grantedSkills on all items
    for (const item of items) {
      const grantedSkills = item.system?.grantedSkills || [];
      for (const granted of grantedSkills) {
        if (!granted.skillUuid) continue;

        const skillUuid = granted.skillUuid;
        const grantedLevel = granted.level || 0;

        if (skillsMap.has(skillUuid)) {
          // Skill exists, add to its sources
          const skill = skillsMap.get(skillUuid);
          skill.sources.push({
            type: item.type,
            name: item.name,
            level: grantedLevel,
            uuid: item.uuid
          });
          skill.level += grantedLevel;
        } else {
          // Skill doesn't exist as an item yet - create a placeholder
          // This can happen if an item grants a skill that hasn't been added to the actor yet
          // We'll need to look up the skill from world items
          skillsMap.set(skillUuid, {
            uuid: skillUuid,
            id: null, // Will be resolved
            name: 'Unknown Skill',
            level: grantedLevel,
            category: 'general',
            relatedStat: null,
            effort: 0,
            description: '',
            sources: [
              { type: item.type, name: item.name, level: grantedLevel, uuid: item.uuid }
            ],
            missing: true // Flag that this skill item is not on the actor
          });
        }
      }
    }

    // Try to resolve missing skills from world items
    for (const [skillUuid, skill] of skillsMap.entries()) {
      if (skill.missing) {
        // Try to find this skill in world items
        const worldSkill = game.items?.find(i => i.uuid === skillUuid && i.type === 'skill');
        if (worldSkill) {
          skill.name = worldSkill.name;
          skill.category = worldSkill.system.category || 'general';
          skill.relatedStat = worldSkill.system.relatedStat || null;
          skill.effort = worldSkill.system.effort || 0;
          skill.description = worldSkill.system.description || '';
          skill.missing = false;
        }
      }
    }

    // Store as an object for easier template access
    this.aggregatedSkills = Object.fromEntries(skillsMap);
  }

  /**
   * Get a skill by UUID
   * @param {string} skillUuid - The skill UUID
   * @returns {Object|null} The skill object or null
   */
  getSkill(skillUuid) {
    return this.aggregatedSkills?.[skillUuid] || null;
  }

  /**
   * Get all skills in a category
   * @param {string} category - The category to filter by
   * @returns {Array} Array of skills in that category
   */
  getSkillsByCategory(category) {
    if (!this.aggregatedSkills) return [];
    return Object.values(this.aggregatedSkills).filter(skill => skill.category === category);
  }

  /**
   * Get the stat modifier that applies to a skill
   * @param {Object} skill - The skill object
   * @returns {number} The stat modifier
   */
  getSkillStatModifier(skill) {
    if (!skill.relatedStat || !this.abilities[skill.relatedStat]) {
      return 0;
    }
    return this.abilities[skill.relatedStat].mod || 0;
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

    // Add aggregated skills to roll data
    data.skills = this.aggregatedSkills || {};

    return data
  }
}