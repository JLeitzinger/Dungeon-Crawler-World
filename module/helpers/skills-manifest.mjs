/**
 * Skills Manifest Helper
 *
 * Provides access to the skills-manifest.json registry for looking up skill UUIDs
 * and metadata when creating items that grant skill bonuses.
 */

let _cachedSkillsMap = null;

/**
 * Get the skills manifest from CONFIG.DCC_WORLD (loaded during init)
 * This is synchronous because the manifest is pre-loaded
 * @returns {Object} The skills manifest object
 */
function getManifest() {
  return CONFIG.DCC_WORLD?.skillsManifest || { skills: {} };
}

/**
 * Build and cache a skills lookup map (name -> skill object)
 * @returns {Object} Map of skill name to skill object
 */
function buildSkillsMap() {
  if (_cachedSkillsMap) return _cachedSkillsMap;

  const manifest = getManifest();
  _cachedSkillsMap = {};

  // Flatten all categories into a single map by skill name
  for (const category of Object.values(manifest.skills || {})) {
    for (const skill of category) {
      _cachedSkillsMap[skill.name] = skill;
    }
  }

  return _cachedSkillsMap;
}

/**
 * Get all skills from the manifest
 * @returns {Array} Array of all skill objects
 */
export function getAllSkills() {
  const manifest = getManifest();
  const allSkills = [];

  for (const category in manifest.skills) {
    if (Array.isArray(manifest.skills[category])) {
      allSkills.push(...manifest.skills[category]);
    }
  }

  return allSkills;
}

/**
 * Get a skill by name (synchronous lookup)
 * @param {string} name - The skill name to look up
 * @returns {Object|null} The skill object or null if not found
 */
export function getSkillByName(name) {
  const skillsMap = buildSkillsMap();
  return skillsMap[name] || null;
}

/**
 * Get all skills as a map for fast lookup
 * @returns {Object} Map of skill name -> skill object
 */
export function getSkillsMap() {
  return buildSkillsMap();
}

/**
 * Get a skill UUID by name
 * @param {string} name - The skill name to look up
 * @returns {string|null} The skill UUID or null if not found
 */
export function getSkillUuid(name) {
  const skill = getSkillByName(name);
  return skill ? skill.uuid : null;
}

/**
 * Get skills by category
 * @param {string} category - The category to filter by (combat, magic, utility, general)
 * @returns {Array} Array of skills in the category
 */
export function getSkillsByCategory(category) {
  const manifest = getManifest();
  return manifest.skills[category] || [];
}

/**
 * Get all skill names grouped by category
 * @returns {Object} Object with category keys and arrays of skill names
 */
export function getSkillNamesByCategory() {
  const manifest = getManifest();
  const result = {};

  for (const category in manifest.skills) {
    result[category] = (manifest.skills[category] || []).map(s => s.name);
  }

  return result;
}

/**
 * Generate a grantedSkills entry for an item
 * @param {string} skillName - The name of the skill
 * @param {number} level - The level to grant
 * @returns {Object|null} Object with skillUuid and level, or null if skill not found
 */
export function createGrantedSkill(skillName, level = 1) {
  const uuid = getSkillUuid(skillName);
  if (!uuid) {
    console.warn(`DCC World: Skill "${skillName}" not found in manifest`);
    return null;
  }
  return { skillUuid: uuid, level };
}

/**
 * Create multiple grantedSkills entries
 * @param {Array} skills - Array of {name, level} objects
 * @returns {Array} Array of grantedSkills objects
 */
export function createGrantedSkills(skills) {
  return skills
    .map(({ name, level = 1 }) => createGrantedSkill(name, level))
    .filter(entry => entry !== null);
}
