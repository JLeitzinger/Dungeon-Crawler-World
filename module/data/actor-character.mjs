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

    // Iterate over ability names and create a new SchemaField for each.
    schema.abilities = new fields.SchemaField(Object.keys(CONFIG.DCC_WORLD.abilities).reduce((obj, ability) => {
      obj[ability] = new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      });
      return obj;
    }, {}));

    // LUK is not an ability score: no rolled value, no floor((score-10)/2) modifier formula.
    // It starts at 0 and only moves via race/class/item/feature luckBonus grants (see base-item.mjs).
    // Kept out of `abilities` on purpose so it never runs through the ability-modifier loop below.
    schema.luck = new fields.SchemaField({
      value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 })
    });

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

  /**
   * Aggregate skills from all items on the actor
   * Combines skill items with grantedSkills from all other items
   * @private
   */
  _aggregateSkills() {
    // Map to store aggregated skills by skill name (most reliable identifier)
    const skillsMap = new Map();

    // Get all items on this actor
    const items = this.parent?.items || [];

    // First pass: collect all skill items and their base levels
    // Use the skill name as the key since it's the most stable identifier
    for (const item of items) {
      if (item.type === 'skill') {
        const skillName = item.name;
        const baseLevel = item.system.level || 0;
        skillsMap.set(skillName, {
          uuid: item.uuid,
          id: item.id, // Embedded ID for deletion/editing
          name: item.name,
          baseLevel, // Skill item's own level (used for level-up check)
          level: baseLevel, // Total level (skill + all grants); accumulated in second pass
          category: item.system.category || 'general',
          relatedStat: item.system.relatedStat || null,
          effort: item.system.effort || 0,
          description: item.system.description || '',
          sources: [
            { type: 'skill', name: item.name, level: baseLevel, uuid: item.uuid }
          ]
        });
      }
    }

    // Second pass: add bonuses from grantedSkills on all items
    for (const item of items) {
      // Weapons only grant skills when equipped
      if (item.type === 'weapon' && !item.system?.equipped) {
        continue;
      }

      const grantedSkills = item.system?.grantedSkills || [];
      for (const granted of grantedSkills) {
        if (!granted.skillUuid) continue;

        // Extract skill name from UUID: "Compendium.dcw-content.skills.Item.Slash" -> "Slash"
        let grantedSkillName = null;
        if (granted.skillUuid.includes('Compendium.') && granted.skillUuid.includes('.skills.Item.')) {
          grantedSkillName = granted.skillUuid.split('.').pop();
          // Capitalize first letter
          grantedSkillName = grantedSkillName.charAt(0).toUpperCase() + grantedSkillName.slice(1);
        }

        if (!grantedSkillName) continue;

        const grantedLevel = granted.level || 0;

        if (skillsMap.has(grantedSkillName)) {
          // Skill exists, add to its sources
          const skill = skillsMap.get(grantedSkillName);
          skill.sources.push({
            type: item.type,
            name: item.name,
            level: grantedLevel,
            uuid: item.uuid
          });
          skill.level += grantedLevel;
        } else {
          // Skill doesn't exist as an item yet - create a placeholder
          // Look up the skill metadata from the manifest (synchronous)
          const skillManifest = CONFIG.DCC_WORLD?.skillsManifest;
          let manifestSkill = null;

          if (skillManifest?.skills) {
            // Search all categories for the skill
            for (const category of Object.values(skillManifest.skills)) {
              const found = category.find(s => s.name === grantedSkillName);
              if (found) {
                manifestSkill = found;
                break;
              }
            }
          }

          if (manifestSkill) {
            // Found in manifest, use its data
            skillsMap.set(grantedSkillName, {
              uuid: granted.skillUuid,
              id: null, // No actual item on actor
              name: manifestSkill.name,
              baseLevel: 0, // No skill item, so base level is 0
              level: grantedLevel,
              category: manifestSkill.category || 'general',
              relatedStat: manifestSkill.relatedStat || null,
              effort: 0,
              description: manifestSkill.description || '',
              sources: [
                { type: item.type, name: item.name, level: grantedLevel, uuid: item.uuid }
              ],
              missing: true // Flag that this skill item is not on the actor
            });
          } else {
            // Not found in manifest, create basic placeholder
            skillsMap.set(grantedSkillName, {
              uuid: granted.skillUuid,
              id: null,
              name: grantedSkillName,
              baseLevel: 0, // No skill item, so base level is 0
              level: grantedLevel,
              category: 'general',
              relatedStat: null,
              effort: 0,
              description: '',
              sources: [
                { type: item.type, name: item.name, level: grantedLevel, uuid: item.uuid }
              ],
              missing: true
            });
          }
        }
      }
    }

    // Store as an object for easier template access
    this.aggregatedSkills = Object.fromEntries(skillsMap);
  }

  /**
   * Aggregate LUK from all items on the actor into `this.luck.total`.
   * Weapons only contribute their luckBonus while equipped (matching grantedSkills);
   * every other item type (race, class, features, spells, skills, gear) contributes
   * unconditionally whenever owned.
   * @private
   */
  _aggregateLuck() {
    const items = this.parent?.items || [];
    let total = this.luck.value;

    for (const item of items) {
      if (item.type === 'weapon' && !item.system?.equipped) continue;
      total += item.system?.luckBonus || 0;
    }

    this.luck.total = total;
  }

  /**
   * Get a skill by UUID or name
   * @param {string} skillIdentifier - The skill UUID or name
   * @returns {Object|null} The skill object or null
   */
  getSkill(skillIdentifier) {
    if (!this.aggregatedSkills) return null;

    // First try direct lookup (for names)
    if (this.aggregatedSkills[skillIdentifier]) {
      return this.aggregatedSkills[skillIdentifier];
    }

    // If it's a UUID, extract the skill name and try again
    if (skillIdentifier.includes('Compendium.') && skillIdentifier.includes('.skills.Item.')) {
      const skillName = skillIdentifier.split('.').pop();
      // Capitalize first letter
      const normalizedName = skillName.charAt(0).toUpperCase() + skillName.slice(1);
      return this.aggregatedSkills[normalizedName] || null;
    }

    // Also try to find by matching the uuid field in each skill
    for (const skill of Object.values(this.aggregatedSkills)) {
      if (skill.uuid === skillIdentifier) {
        return skill;
      }
    }

    return null;
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