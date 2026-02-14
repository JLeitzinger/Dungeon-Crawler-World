/**
 * Skills Manifest Helper
 *
 * Provides access to the skills-manifest.json registry for looking up skill UUIDs
 * and metadata when creating items that grant skill bonuses.
 */

let _manifest = null;

/**
 * Load and cache the skills manifest
 * @returns {Object} The parsed manifest object
 */
function loadManifest() {
  if (_manifest) return _manifest;

  try {
    const manifestPath = 'systems/dungeon-crawler-world/data/skills-manifest.json';
    const response = fetch(manifestPath);

    if (!response.ok) {
      console.warn('DCC World: Skills manifest not found at', manifestPath);
      _manifest = { skills: {} };
      return _manifest;
    }

    _manifest = response.json();
    console.log('DCC World: Skills manifest loaded successfully');
    return _manifest;
  } catch (error) {
    console.error('DCC World: Error loading skills manifest:', error);
    _manifest = { skills: {} };
    return _manifest;
  }
}

/**
 * Get all skills from the manifest
 * @returns {Array} Array of all skill objects
 */
export function getAllSkills() {
  const manifest = loadManifest();
  const allSkills = [];

  for (const category in manifest.skills) {
    if (Array.isArray(manifest.skills[category])) {
      allSkills.push(...manifest.skills[category]);
    }
  }

  return allSkills;
}

/**
 * Get a skill by name
 * @param {string} name - The skill name to look up
 * @returns {Object|null} The skill object or null if not found
 */
export function getSkillByName(name) {
  const allSkills = getAllSkills();
  return allSkills.find(skill => skill.name === name) || null;
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
  const manifest = loadManifest();
  return manifest.skills[category] || [];
}

/**
 * Get all skill names grouped by category
 * @returns {Object} Object with category keys and arrays of skill names
 */
export function getSkillNamesByCategory() {
  const manifest = loadManifest();
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
