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

**Skill Requirements:**
- **Must have exactly 2-3 skills from general or utility categories**
- **Can have 0-2 skills from magic or combat categories**
- Recommended skill levels: 1-2

**Optional Fields:**
- `senses` - Array of special senses (e.g., ["darkvision", "low-light"])
- `traits` - Array of racial feature descriptions

**Example: Human**
```json
{
  "abilityBonuses": {"str": 1, "dex": 1, "con": 1, "int": 1, "wis": 1, "cha": 1},
  "bonuses": {"hp": 0, "stamina": 0, "mana": 0},
  "size": "medium",
  "speed": 30,
  "grantedSkills": [
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Diplomacy", "level": 1},
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Lore", "level": 1}
  ]
}
```

---

### **Class** Items
Classes define profession-based abilities and resource scaling.

**Required Fields:**
- `baseHP` - Base hit points at level 1 (typically 8-12)
- `hpPerLevel` - HP gained per level (formula: stat modifier + value, typically 2-4)
- `staminaPerLevel` - Stamina gained per level (typically 1-3)
- `manaPerLevel` - Mana gained per level (typically 1-3)

**Skill Requirements:**
- **Must have 3-5 skills from appropriate category for the class**
  - Martial classes: combat + utility skills
  - Magic classes: magic + general/utility skills
  - Rogue classes: utility + combat skills
- Recommended skill levels: 1-3

**Optional Fields:**
- `saveProficiency` - Array of abilities the class is proficient in (e.g., ["str", "con"])

**Example: Fighter**
```json
{
  "baseHP": 10,
  "hpPerLevel": 4,
  "staminaPerLevel": 2,
  "manaPerLevel": 1,
  "saveProficiency": ["str", "con"],
  "grantedSkills": [
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Slash", "level": 2},
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Defend", "level": 2},
    {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Athletics", "level": 1}
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

When asked to create new items:

1. **Check the manifest** - For skills, verify the skill exists in `data/skills-manifest.json`
2. **Use the skill lookup tool** - Run `node scripts/skill-lookup.mjs granted "SkillName" <level>` to get proper UUID format
3. **Follow skill limits** - Adhere to the category and count requirements above
4. **Test in Foundry** - Create item, add to character, verify skills aggregate correctly
5. **Commit with version bump** - Always increment `system.json` version

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
