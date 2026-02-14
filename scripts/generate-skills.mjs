import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const skillsDir = path.join(__dirname, '../src/packs/skills');

// Ensure skills directory exists
if (!fs.existsSync(skillsDir)) {
  fs.mkdirSync(skillsDir, { recursive: true });
}

const skills = [
  // Combat Skills
  {
    _id: "Swing",
    name: "Swing",
    category: "combat",
    relatedStat: "str",
    description: "Melee weapon attacks and close-quarters combat techniques.",
    level: 1,
    effort: 0
  },
  {
    _id: "Shoot",
    name: "Shoot",
    category: "combat",
    relatedStat: "dex",
    description: "Ranged weapon attacks, marksmanship, and accuracy.",
    level: 1,
    effort: 0
  },
  {
    _id: "Defend",
    name: "Defend",
    category: "combat",
    relatedStat: "con",
    description: "Blocking, parrying, dodging, and damage mitigation techniques.",
    level: 1,
    effort: 0
  },

  // Magic Skills
  {
    _id: "Cast",
    name: "Cast",
    category: "magic",
    relatedStat: "int",
    description: "Arcane spellcasting and magical ability manipulation.",
    level: 1,
    effort: 0
  },
  {
    _id: "Channel",
    name: "Channel",
    category: "magic",
    relatedStat: "wis",
    description: "Divine magic, spiritual connection, and channeled energy.",
    level: 1,
    effort: 0
  },

  // Utility Skills
  {
    _id: "Athletics",
    name: "Athletics",
    category: "utility",
    relatedStat: "str",
    description: "Climbing, jumping, swimming, and physical feats of strength.",
    level: 1,
    effort: 0
  },
  {
    _id: "Acrobatics",
    name: "Acrobatics",
    category: "utility",
    relatedStat: "dex",
    description: "Balance, tumbling, flexibility, and gymnastic maneuvers.",
    level: 1,
    effort: 0
  },
  {
    _id: "Stealth",
    name: "Stealth",
    category: "utility",
    relatedStat: "dex",
    description: "Hiding, sneaking, and avoiding detection.",
    level: 1,
    effort: 0
  },
  {
    _id: "Perception",
    name: "Perception",
    category: "utility",
    relatedStat: "wis",
    description: "Noticing details, searching, and general awareness of surroundings.",
    level: 1,
    effort: 0
  },
  {
    _id: "Survival",
    name: "Survival",
    category: "utility",
    relatedStat: "wis",
    description: "Tracking, foraging, navigation, and wilderness knowledge.",
    level: 1,
    effort: 0
  },

  // General Skills
  {
    _id: "Diplomacy",
    name: "Diplomacy",
    category: "general",
    relatedStat: "cha",
    description: "Persuasion, negotiation, and social influence.",
    level: 1,
    effort: 0
  },
  {
    _id: "Intimidation",
    name: "Intimidation",
    category: "general",
    relatedStat: "cha",
    description: "Coercion, threats, and imposing presence.",
    level: 1,
    effort: 0
  },
  {
    _id: "Deception",
    name: "Deception",
    category: "general",
    relatedStat: "cha",
    description: "Lying, disguise, trickery, and misdirection.",
    level: 1,
    effort: 0
  },
  {
    _id: "Lore",
    name: "Lore",
    category: "general",
    relatedStat: "int",
    description: "Academic knowledge, research, history, and scholarship.",
    level: 1,
    effort: 0
  },
  {
    _id: "Medicine",
    name: "Medicine",
    category: "general",
    relatedStat: "int",
    description: "Healing, diagnosis, and medical knowledge.",
    level: 1,
    effort: 0
  }
];

function createSkillItem(skill) {
  return {
    _id: skill._id,
    name: skill.name,
    type: "skill",
    img: "icons/svg/book.svg",
    system: {
      description: skill.description,
      level: skill.level,
      category: skill.category,
      relatedStat: skill.relatedStat,
      effort: skill.effort,
      grantedSkills: []
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: {
      default: 0
    },
    flags: {}
  };
}

// Generate all skill files
console.log('Generating skill item files...\n');

let count = 0;
for (const skill of skills) {
  const item = createSkillItem(skill);
  const filename = `${skill._id.toLowerCase()}.json`;
  const filepath = path.join(skillsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(item, null, 2), 'utf8');
  console.log(`✓ Created: ${filename} (${skill.name})`);
  count++;
}

console.log(`\n✓ Successfully generated ${count} skill item files`);
console.log(`Location: ${skillsDir}`);
