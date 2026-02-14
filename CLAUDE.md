# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Foundry VTT game system called "Dungeon Crawler World" built on the dccworld (dungeon-crawler-world) boilerplate. It implements a custom tabletop RPG system for Foundry VTT v13.

## Development Commands

### CSS Compilation
```bash
# One-time build
npm run build

# Watch mode (auto-recompile on changes)
npm run watch
```

The system uses SCSS for styling. Source files are in `src/scss/` and compile to `css/dungeon-crawler-world.css`.

## Architecture Overview

### Data Model System

This system uses Foundry's **DataModel** pattern (not template.json-based dynamic data). All data structures are defined in code via `defineSchema()` methods.

**Base Classes:**
- `dccworldDataModel` (module/data/base-model.mjs) - Extends `foundry.abstract.TypeDataModel`, provides `toPlainObject()` helper
- `dccworldActorBase` (module/data/base-actor.mjs) - Base schema for all actors (health, power, biography)
- `dccworldItemBase` (module/data/base-item.mjs) - Base schema for all items

**Actor Types:**
- `character` - Uses `dccworldCharacter` data model with abilities (STR/DEX/CON/INT/WIS/CHA), HP/Stamina/Mana resources, level/XP, and derived stats
- `npc` - Uses `dccworldNPC` data model

**Item Types:**
- `item` - Standard gear items (`dccworldItem`)
- `feature` - Character features/abilities (`dccworldFeature`)
- `spell` - Magic spells with levels 0-9 (`dccworldSpell`)
- `class` - Character classes with hit dice, resource scaling, saves (`dccworldClass`)
- `race` - Character races with ability bonuses, size, senses, traits, resource bonuses (`dccworldRace`)

### Document Classes

**Actors** (module/documents/actor.mjs):
- `dccworldActor` extends Foundry's `Actor`
- Implements `prepareData()`, `prepareBaseData()`, `prepareDerivedData()`, `getRollData()`, `toPlainObject()`

**Items** (module/documents/item.mjs):
- `dccworldItem` extends Foundry's `Item`
- Similar preparation lifecycle methods

### Sheet Classes

**Actor Sheets** (module/sheets/actor-sheet.mjs):
- `dccworldActorSheet` - Handles both character and NPC sheets
- Template routing: `templates/actor/actor-${type}-sheet.hbs`
- `_prepareItems()` organizes items into gear, features, and spells by level
- `_prepareCharacterData()` for character-specific context

**Item Sheets** (module/sheets/item-sheet.mjs):
- `dccworldItemSheet` - Handles all item type sheets
- Template routing: `templates/item/item-${type}-sheet.hbs`

### Character Stat Calculations

The `dccworldCharacter` data model (module/data/actor-character.mjs) implements complex `prepareDerivedData()` logic:

1. **Ability Scores**: Finds race/class items, applies racial ability bonuses, calculates modifiers
2. **Derived Resources**:
   - HP = baseHP (from class) + (hpPerLevel × (level - 1)) + racial HP bonus
   - Stamina = 10 + (staminaPerLevel × (level - 1)) + racial stamina bonus
   - Mana = 10 + (manaPerLevel × (level - 1)) + racial mana bonus
3. **Resource Scaling**: Class items define `hpPerLevel`, `staminaPerLevel`, `manaPerLevel`
4. **XP Progression**: XP to next level = 300 × current level

Race and class items are found via `this.parent.items.find()` and their data is applied during character data preparation.

### Configuration

**System Config** (module/helpers/config.mjs):
- `DCC_WORLD.abilities` - Ability score definitions (str, dex, con, int, wis, cha)
- Registered to `CONFIG.DCC_WORLD` in init hook

**Combat Initiative**: `1d20 + @abilities.dex.mod` (defined in dungeon-crawler-world.mjs:34)

**Token Attributes**:
- Primary: `hp`
- Secondary: `stamina`

### Entry Point

**module/dungeon-crawler-world.mjs** - Main system initialization:
- Registers document classes (`CONFIG.Actor.documentClass`, `CONFIG.Item.documentClass`)
- Registers data models (`CONFIG.Actor.dataModels`, `CONFIG.Item.dataModels`)
- Registers sheet classes (actor-sheet, item-sheet)
- Sets up Handlebars helpers (`toLowerCase`, `eq`)
- Configures `CONFIG.ActiveEffect.legacyTransferral = false`

### Template System

Handlebars templates in `templates/`:
- Actor sheets: `actor/actor-character-sheet.hbs`, `actor/actor-npc-sheet.hbs`
- Item sheets: `item/item-{type}-sheet.hbs` (item, feature, spell, class, race)
- Partials: `actor/parts/` for items, features, effects, spells

Template preloading handled by `module/helpers/templates.mjs`

## Item Type Design Guidelines

When creating new items, follow these requirements and best practices for each item type:

### **Race** Items
Races define hereditary characteristics and base abilities.

**Required Fields:**
- `abilityBonuses` - Object with stat bonuses (e.g., `{str: 2, dex: 1}`)
- `bonuses.hp` - Hit point bonus (number, can be 0)
- `bonuses.stamina` - Stamina bonus (number, can be 0)
- `bonuses.mana` - Mana bonus (number, can be 0)
- `size` - String: "tiny", "small", "medium", "large", "huge"
- `speed` - Number: base movement speed in feet

**Ability Score Rules:**
- **Total ability bonuses must equal exactly 3**
- Can distribute as: +3 to one stat, +2/+1 to two stats, or +1/+1/+1 to three stats
- No stat can exceed +3 bonus

**Skill Requirements:**
- **Must have exactly 2 skills from general or utility categories**
- **Must have exactly 1 skill from magic or combat categories**
- Recommended skill levels: 1-2

**Optional Fields:**
- `senses` - Array of special senses (e.g., ["darkvision", "low-light"])
- `traits` - Array of racial feature descriptions (text descriptions, not feature items)

**Example: Human**
```json
{
  "abilityBonuses": {"str": 1, "dex": 1, "con": 1, "int": 0, "wis": 0, "cha": 0},
  "bonuses": {"hp": 0, "stamina": 0, "mana": 0},
  "size": "medium",
  "speed": 30,
  "senses": [],
  "traits": ["Versatile: Humans can learn any skill more quickly."],
  "grantedSkills": [
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Diplomacy", "level": 1},
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Lore", "level": 1},
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Slash", "level": 1}
  ]
}
```

---

### **Class** Items
Classes define profession-based abilities, resource scaling, stat boosts, skills, and features.

**Required Fields:**
- `baseHP` - Base hit points at level 1 (typically 8-12)
- `hpPerLevel` - HP gained per level (formula: stat modifier + value, typically 2-4)
- `staminaPerLevel` - Stamina gained per level (typically 1-3)
- `manaPerLevel` - Mana gained per level (typically 1-3)
- `abilityBonuses` - Stat boosts per level (e.g., `{str: 0.5, con: 0.5}`)
- `levelAcquired` - Level when class was acquired (default: 1, used for multiclassing)

**Stat Boost Mechanics:**
Classes grant ongoing stat boosts that scale with level. The stat boost calculation is:
```
Stat Boost = (current_level - (level_acquired - 1)) × abilityBonuses[stat]
```

**Example:** If a Fighter with `{str: 0.5, con: 0.5}` is acquired at level 3, and the character is now level 7:
- STR boost = (7 - (3 - 1)) × 0.5 = (7 - 2) × 0.5 = 5 × 0.5 = 2.5 → 2 (rounded down)
- CON boost = (7 - 2) × 0.5 = 2.5 → 2

**Ability Bonus Guidelines:**
- Total ability bonuses should equal 0.5 to 1.5 per level
- Martial classes: 0.5-1.0 total (focused on STR/DEX/CON)
- Magic classes: 0.5-1.0 total (focused on INT/WIS/CHA)
- Hybrid classes: 1.0-1.5 total (split across multiple stats)
- Single stat focus: 1.0 per level max
- Two stat focus: 0.5 each (most common)
- Three stat focus: 0.33 each (rare, for versatile classes)

**Skill Requirements:**
- **Must have 3-5 skills from appropriate category for the class**
  - Martial classes: combat + utility skills
  - Magic classes: magic + general/utility skills
  - Rogue classes: utility + combat skills
- Recommended skill levels: 1-3

**Feature Requirements:**
- **Classes should grant 1-3 features at creation**
- Features define special abilities, class mechanics, or passive bonuses
- Use existing features from compendium or create new ones
- Features are referenced via UUID (e.g., `Compendium.dungeon-crawler-world.features.Item.SecondWind`)

**Optional Fields:**
- `saveProficiency` - Array of abilities the class is proficient in (e.g., ["str", "con"])
- `grantedFeatures` - Array of feature UUIDs the class provides

**Example: Fighter**
```json
{
  "baseHP": 10,
  "hpPerLevel": 4,
  "staminaPerLevel": 2,
  "manaPerLevel": 1,
  "abilityBonuses": {"str": 0.5, "con": 0.5},
  "levelAcquired": 1,
  "saveProficiency": ["str", "con"],
  "grantedSkills": [
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Slash", "level": 2},
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Defend", "level": 2},
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Athletics", "level": 1}
  ],
  "grantedFeatures": [
    "Compendium.dungeon-crawler-world.features.Item.SecondWind",
    "Compendium.dungeon-crawler-world.features.Item.ActionSurge"
  ]
}
```

---

### **Item** (Equipment) Items
Weapons, armor, gear, and consumables.

**Required Fields:**
- `quantity` - Number of items (default: 1)
- `weight` - Weight in pounds (number)

**For Weapons:**
- `roll.diceNum` - Number of dice (typically 1)
- `roll.diceSize` - Die size ("d4", "d6", "d8", "d10", "d12")
- `roll.diceBonus` - Bonus to damage (formula like "+@str.mod+ceil(@lvl/2)")
- **Should grant 1-2 relevant combat skills** at level 1-2
- **Higher quality/masterwork items can grant skill +2 or +3**

**For Armor:**
- `acBonus` - Armor class bonus (number)
- Could grant defensive skills like Defend

**For Tools/Gear:**
- **Should grant 1 relevant utility or general skill** (e.g., thieves' tools → Thievery +1)

**Example: Longsword**
```json
{
  "quantity": 1,
  "weight": 3,
  "roll": {"diceNum": 1, "diceSize": "d8", "diceBonus": "+@str.mod+ceil(@lvl/2)"},
  "grantedSkills": [
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Slash", "level": 1}
  ]
}
```

---

### **Feature** Items
Abilities, feats, and special powers.

**Skill Guidelines:**
- **Should grant 0-2 skills** relevant to the feature
- Combat features → combat skill
- Magic features → magic skill
- Skill feats → specific skill at level 1-2

**Example: Power Attack**
```json
{
  "description": "Sacrifice accuracy for damage.",
  "grantedSkills": [
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Slash", "level": 1}
  ]
}
```

---

### **Spell** Items
Magical spells and rituals.

**Required Fields:**
- `spellLevel` - 0-9 (0 = cantrip, 1+ = leveled spells)
- `diceCount` - Number of dice for the spell (usually equals spell level, minimum 1)
- `castStat` - Related stat: "int" (arcane) or "wis" (divine)
- `prowess` - Mana cost (typically 0 for cantrips, spellLevel × 2 for leveled spells)

**Do NOT add skills to spells** - they use the Cast/Channel skills from the character.

**Example: Fireball**
```json
{
  "spellLevel": 3,
  "diceCount": 3,
  "castStat": "int",
  "prowess": 6,
  "description": "Hurls an explosive fireball."
}
```

---

### **Skill** Items
Base skills from the compendium (skills-manifest.json).

**Required Fields:**
- `level` - Starting level (0 = untrained, can go up to 15)
- `category` - "combat", "magic", "utility", or "general"
- `relatedStat` - Primary stat: "str", "dex", "con", "int", "wis", "cha", or null
- `effort` - Stamina cost to use (0 for most skills, 1-3 for special techniques)

**Skill Creation Rules:**
- Add entry to `data/skills-manifest.json` first
- Run `npm run generate:skills` to create JSON
- Run `npm run pack:skills` to update compendium
- Skills in compendium should start at **level 0**

---

## Item Creation Workflow

When asked to create new items (class, race, equipment, feature) that grant skills:

### Step 1: Plan Skills Needed
- Identify which skills the item should grant based on its type/theme
- Check if each skill exists in `data/skills-manifest.json`

### Step 2: Create Missing Skills (If Any)
**If a skill doesn't exist in the manifest, you MUST create it first:**

1. **Add to manifest** - Edit `data/skills-manifest.json`:
   ```json
   {
     "name": "YourSkillName",
     "uuid": "Compendium.dungeon-crawler-world.skills.Item.YourSkillName",
     "category": "combat|magic|utility|general",
     "relatedStat": "str|dex|con|int|wis|cha|null",
     "description": "Brief description of what this skill does."
   }
   ```
   - Add to the appropriate category array (combat, magic, utility, or general)
   - Keep UUID format: `Compendium.dungeon-crawler-world.skills.Item.<SkillName>`

2. **Generate skill JSON files**:
   ```bash
   npm run generate:skills
   ```

3. **Pack skills to compendium**:
   ```bash
   npm run pack:skills
   ```

4. **Update documentation** (if adding a new category):
   - Update `data/skills/README.md` with the new skill

### Step 3: Create the Item
1. **Use skill lookup tool** - Run `node scripts/skill-lookup.mjs granted "SkillName" <level>` to get proper UUID format
2. **Follow skill limits** - Adhere to the category and count requirements above
3. **Create item file** - Add JSON to appropriate directory (`src/packs/items/`, etc.)

### Step 4: Test and Verify
1. **Pack the compendium** - `npm run pack:items` (or pack:classes, pack:races, etc.)
2. **Test in Foundry** - Create item, add to character, verify skills aggregate correctly
3. **Check skill display** - Ensure proper category, related stat, and level show on character sheet

### Step 5: Commit All Changes
1. **Stage files** - Include:
   - `data/skills-manifest.json` (if new skills added)
   - `src/packs/skills/*.json` (generated skill files)
   - `packs/skills/*` (compendium files)
   - Item source file
   - `system.json` (version bump)

2. **Commit with descriptive message**:
   ```
   Add [Item Type]: [Name] with new skill: [Skill Name]

   - Created [Human] race with [Diplomacy, Insight] skills
   - Added new [Insight] skill to manifest (wisdom, general)
   - Regenerated and packed skills compendium
   ```

---

## Skill Creation Checklist

Use this checklist whenever adding a new skill to the manifest:

- [ ] Added entry to `data/skills-manifest.json` in appropriate category
- [ ] Set category: "combat", "magic", "utility", or "general"
- [ ] Set relatedStat: "str", "dex", "con", "int", "wis", "cha", or null
- [ ] Wrote clear description (1-2 sentences)
- [ ] UUID follows format: `Compendium.dungeon-crawler-world.skills.Item.<Name>`
- [ ] Ran `npm run generate:skills` (created JSON in `src/packs/skills/`)
- [ ] Ran `npm run pack:skills` (updated compendium)
- [ ] Updated `data/skills/README.md` if needed
- [ ] Tested in Foundry: drag skill to character, verify it appears correctly

---

## Example: Creating a Race with New Skills

**Task:** Create an Elf race that grants "Bow Mastery" skill.

**Step 1: Check manifest**
```bash
node scripts/skill-lookup.mjs list | grep -i bow
# No results - skill doesn't exist
```

**Step 2: Add skill to manifest**
Edit `data/skills-manifest.json`, add to "combat" array:
```json
{
  "name": "BowMastery",
  "uuid": "Compendium.dungeon-crawler-world.skills.Item.BowMastery",
  "category": "combat",
  "relatedStat": "dex",
  "description": "Expertise with bows and ranged weapons. Advanced archery techniques."
}
```

**Step 3: Generate and pack**
```bash
npm run generate:skills  # Creates bowmastery.json
npm run pack:skills      # Updates compendium
```

**Step 4: Create race with skill lookup**
```bash
node scripts/skill-lookup.mjs granted "BowMastery" 2
# Output: {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.BowMastery", "level": 2}
```

**Step 5: Create Elf race JSON**
```json
{
  "_id": "elf",
  "name": "Elf",
  "type": "race",
  "system": {
    "abilityBonuses": {"dex": 2, "int": 1},
    "bonuses": {"hp": 0, "stamina": 0, "mana": 0},
    "size": "medium",
    "speed": 30,
    "grantedSkills": [
      {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.BowMastery", "level": 2},
      {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Perception", "level": 1}
    ]
  }
}
```

**Step 6: Pack, test, commit**
```bash
npm run pack:races
git add data/skills-manifest.json src/packs/skills/bowmastery.json packs/skills/* src/packs/races/elf.json system.json
git commit -m "Add Elf race with new BowMastery skill"
```

---

## Class Generation Workflow

When creating a new class, follow this comprehensive workflow to ensure all components (skills, features, stat boosts) are properly configured.

### Step 1: Plan Class Design

Determine the following for your class:

1. **Class Identity**: What role does this class fill? (tank, damage dealer, healer, support, etc.)
2. **Primary Stats**: Which 1-2 stats define this class?
3. **Stat Boost Rate**: How much should each stat grow per level? (0.5-1.0 total recommended)
4. **Resource Focus**: High HP (martial), high Mana (caster), or balanced?
5. **Skills Needed**: 3-5 skills from appropriate categories
6. **Features Needed**: 1-3 signature class abilities

### Step 2: Calculate Stat Boosts

Classes grant ongoing stat boosts using the formula:
```
Stat Boost = (current_level - (level_acquired - 1)) × abilityBonuses[stat]
```

**Guidelines:**
- Total stat boosts should be 0.5-1.5 per level
- Most classes use 0.5 in two stats (e.g., `{str: 0.5, con: 0.5}`)
- Pure casters might use 1.0 in one stat (e.g., `{int: 1.0}`)
- Hybrid classes can spread across 3 stats (e.g., `{str: 0.33, dex: 0.33, wis: 0.34}`)

**Examples:**
- **Fighter** (martial, STR/CON focus): `{str: 0.5, con: 0.5}`
- **Wizard** (pure caster, INT focus): `{int: 1.0}`
- **Ranger** (hybrid, DEX/WIS): `{dex: 0.5, wis: 0.5}`
- **Paladin** (hybrid, STR/CHA/WIS): `{str: 0.4, cha: 0.3, wis: 0.3}`

### Step 3: Determine Resource Scaling

Set the following resource values:

- **baseHP**: Starting HP at level 1 (8-12)
  - High: 12 (barbarian, fighter)
  - Medium: 10 (ranger, paladin, cleric)
  - Low: 8 (wizard, sorcerer)
- **hpPerLevel**: HP gain per level (2-4)
  - High: 4 (barbarian, fighter)
  - Medium: 3 (ranger, rogue)
  - Low: 2 (wizard, sorcerer)
- **staminaPerLevel**: Stamina gain per level (1-3)
  - High: 3 (monk, fighter, rogue)
  - Medium: 2 (ranger, cleric)
  - Low: 1 (wizard, sorcerer)
- **manaPerLevel**: Mana gain per level (1-3)
  - High: 3 (wizard, sorcerer, cleric)
  - Medium: 2 (druid, bard, paladin)
  - Low: 1 (fighter, barbarian)

### Step 4: Select or Create Skills

1. **Identify required skills** (3-5 total):
   - Martial classes: 2-3 combat, 1-2 utility
   - Magic classes: 2-3 magic, 1-2 general/utility
   - Hybrid classes: 2 combat, 2 magic, 1 utility
2. **Check if skills exist**: `node scripts/skill-lookup.mjs list`
3. **Create missing skills** (if needed):
   ```bash
   # Add to data/skills-manifest.json
   npm run generate:skills
   npm run pack:skills
   ```
4. **Get skill UUIDs**: `node scripts/skill-lookup.mjs granted "SkillName" <level>`

### Step 5: Select or Create Features

1. **Identify class features** (1-3 recommended):
   - Signature abilities that define the class
   - Passive bonuses or active abilities
   - Examples: Second Wind (Fighter), Rage (Barbarian), Spellcasting (Wizard)
2. **Check existing features**: Look in `src/packs/features/` or Foundry compendium
3. **Create new features if needed**:
   - Create feature JSON file in `src/packs/features/`
   - Pack features: `npm run pack:features`
4. **Get feature UUIDs**: Features use format `Compendium.dungeon-crawler-world.features.Item.<FeatureName>`

### Step 6: Create Class JSON File

Create a JSON file in `src/packs/classes/<classname>.json`:

```json
{
  "_id": "fighter",
  "name": "Fighter",
  "type": "class",
  "img": "icons/svg/sword.svg",
  "system": {
    "description": "A master of martial combat, skilled with weapons and armor.",
    "baseHP": 12,
    "hpPerLevel": 4,
    "staminaPerLevel": 3,
    "manaPerLevel": 1,
    "abilityBonuses": {
      "str": 0.5,
      "con": 0.5
    },
    "levelAcquired": 1,
    "saveProficiency": ["str", "con"],
    "grantedSkills": [
      {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Slash", "level": 2},
      {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Defend", "level": 2},
      {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Athletics", "level": 1}
    ],
    "grantedFeatures": [
      "Compendium.dungeon-crawler-world.features.Item.SecondWind",
      "Compendium.dungeon-crawler-world.features.Item.ActionSurge"
    ]
  }
}
```

### Step 7: Pack and Test

1. **Pack the class to compendium**:
   ```bash
   npm run pack:classes
   ```
2. **Test in Foundry**:
   - Create a new character
   - Add the class item to the character
   - Verify skills appear in skill list
   - Verify features appear in features tab
   - Level up the character and confirm stat boosts apply correctly
3. **Verify stat boost calculation** at different levels:
   - Level 1: (1 - (1 - 1)) × 0.5 = 0 (no boost yet)
   - Level 2: (2 - 0) × 0.5 = 1.0 → 1 stat point
   - Level 5: (5 - 0) × 0.5 = 2.5 → 2 stat points
   - Level 10: (10 - 0) × 0.5 = 5.0 → 5 stat points

### Step 8: Commit Changes

Stage and commit all modified files:

```bash
git add src/packs/classes/<classname>.json \
        src/packs/skills/*.json \
        src/packs/features/*.json \
        data/skills-manifest.json \
        packs/classes/* \
        packs/skills/* \
        packs/features/* \
        system.json

git commit -m "Add <ClassName> class with stat boosts and features

- Created <ClassName> with <stat1/stat2> focus
- Stat boosts: <details>
- Skills: <skill list>
- Features: <feature list>
- Resource scaling: <HP/Stamina/Mana details>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Example: Creating a Barbarian Class

**Step 1: Design**
- Role: Tank/Damage dealer
- Primary stats: STR, CON
- Stat boost: 0.6 STR, 0.4 CON (higher STR emphasis)
- Resources: Very high HP, high Stamina, low Mana
- Skills: Slash (3), Athletics (2), Intimidation (1)
- Features: Rage, Reckless Attack

**Step 2: Stat Boosts**
```json
"abilityBonuses": {
  "str": 0.6,
  "con": 0.4
}
```
At level 10: STR +6, CON +4

**Step 3: Resources**
```json
"baseHP": 12,
"hpPerLevel": 4,
"staminaPerLevel": 3,
"manaPerLevel": 1
```

**Step 4-5: Skills & Features**
- Verify Slash, Athletics, Intimidation exist
- Create Rage and Reckless Attack features

**Step 6: Create JSON**
```json
{
  "_id": "barbarian",
  "name": "Barbarian",
  "type": "class",
  "system": {
    "description": "A fierce warrior who can enter a battle rage.",
    "baseHP": 12,
    "hpPerLevel": 4,
    "staminaPerLevel": 3,
    "manaPerLevel": 1,
    "abilityBonuses": {"str": 0.6, "con": 0.4},
    "levelAcquired": 1,
    "saveProficiency": ["str", "con"],
    "grantedSkills": [
      {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Slash", "level": 3},
      {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Athletics", "level": 2},
      {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Intimidation", "level": 1}
    ],
    "grantedFeatures": [
      "Compendium.dungeon-crawler-world.features.Item.Rage",
      "Compendium.dungeon-crawler-world.features.Item.RecklessAttack"
    ]
  }
}
```

**Step 7-8: Pack, test, commit**
```bash
npm run pack:classes
# Test in Foundry
git add <files> && git commit
```

---

## Important Notes

- Always register new item/actor types in THREE places:
  1. `template.json` (types array)
  2. Data model in `module/data/` and export in `_module.mjs`
  3. `CONFIG.{Actor|Item}.dataModels` in `dungeon-crawler-world.mjs`
- Character resource calculations depend on race and class items being present
- Ability score modifiers use D&D 5e formula: `Math.floor((score - 10) / 2)`
- Data models must call `super.defineSchema()` to inherit parent fields
- Use `toPlainObject()` instead of `toObject()` when you need derived data

## Version Management

**"Bump version"** means incrementing the version number in `system.json`.

### Version Number Format
- Uses semantic versioning: `MAJOR.MINOR.PATCH` (e.g., `0.2.1`)
- Increment PATCH for bugfixes
- Increment MINOR for new features
- Increment MAJOR for breaking changes

### When to Bump Version
**CRITICAL: ALWAYS bump the version for EVERY commit**, no matter how small the change. This is a hard rule.

Every commit should include:
- Bug fixes
- New features
- UI/UX improvements
- Data model changes
- Configuration changes
- Documentation changes
- Anything else that gets committed

### Version Bump + Commit/Push Workflow
When asked to "bump version and commit/push" or making any commit:
1. **ALWAYS increment the version in `system.json` first** (this is mandatory)
2. Stage all modified files: `git add <files>`
3. Create a commit with descriptive message
4. Push to remote: `git push`

**Commit message format:**
```
Brief description of changes

- Detail 1
- Detail 2
- Detail 3

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Future Improvements

### ⚠️ ApplicationV2 Migration (High Priority)
This system currently uses the legacy ActorSheet and ItemSheet classes. Foundry VTT has a newer **ApplicationV2** framework that should be migrated to:

**Why migrate:**
- Better performance and reactivity
- Modern component-based architecture
- Improved accessibility
- Future-proof (v1 sheets may be deprecated)

**Files that need updating:**
- `module/sheets/actor-sheet.mjs` - Extend ApplicationV2 instead of ActorSheet
- `module/sheets/item-sheet.mjs` - Extend ApplicationV2 instead of ItemSheet
- Templates may need restructuring for v2's template parts system

**Resources:**
- [ApplicationV2 Documentation](https://foundryvtt.com/article/v2-applications/)
- [Migration Guide](https://foundryvtt.com/article/application-v2-migration/)

**Priority:** Medium - Current implementation works, but plan migration before Foundry v14+
