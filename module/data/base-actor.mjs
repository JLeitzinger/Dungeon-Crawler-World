import dccworldDataModel from "./base-model.mjs";

export default class dccworldActorBase extends dccworldDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.health = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10 })
    });
    schema.power = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 5, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 5 })
    });
    schema.biography = new fields.StringField({ required: true, blank: true }); // equivalent to passing ({initial: ""}) for StringFields

    // Ability scores - shared by every actor type (character and npc). Iterate over ability
    // names and create a new SchemaField for each.
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

    return schema;
  }

  /**
   * Compute `.mod` and `.label` for every ability score. Uses `.total` if a subclass has
   * already applied bonuses on top of the base `.value` (e.g. dccworldCharacter's racial
   * bonuses), falling back to `.value` otherwise - so this works unmodified for actor types
   * that never set `.total` at all (e.g. dccworldNPC).
   */
  _computeAbilityMods() {
    for (const key in this.abilities) {
      const abilityScore = this.abilities[key].total ?? this.abilities[key].value;
      this.abilities[key].mod = Math.floor((abilityScore - 10) / 2);
      this.abilities[key].label = game.i18n.localize(CONFIG.DCC_WORLD.abilities[key]) ?? key;
    }
  }

  /**
   * Aggregate skills from all items on the actor. Combines skill items with grantedSkills
   * from all other items.
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
      // Weapons and armor only grant skills when equipped
      if (['weapon', 'armor'].includes(item.type) && !item.system?.equipped) {
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
   * Weapons and armor only contribute their luckBonus while equipped (matching
   * grantedSkills); every other item type (race, class, features, spells, skills, gear)
   * contributes unconditionally whenever owned.
   * @private
   */
  _aggregateLuck() {
    const items = this.parent?.items || [];
    let total = this.luck.value;

    for (const item of items) {
      if (['weapon', 'armor'].includes(item.type) && !item.system?.equipped) continue;
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

  /**
   * Shared roll-data base: flattened ability scores plus aggregated skills. Subclasses call
   * this and add their own `lvl` (character: attributes.level.value, npc: cr).
   * @returns {object}
   */
  _baseRollData() {
    const data = {};

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (this.abilities) {
      for (const [k, v] of Object.entries(this.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    data.skills = this.aggregatedSkills || {};

    return data;
  }

}