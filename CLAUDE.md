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

## Important Notes

- Always register new item/actor types in THREE places:
  1. `template.json` (types array)
  2. Data model in `module/data/` and export in `_module.mjs`
  3. `CONFIG.{Actor|Item}.dataModels` in `dungeon-crawler-world.mjs`
- Character resource calculations depend on race and class items being present
- Ability score modifiers use D&D 5e formula: `Math.floor((score - 10) / 2)`
- Data models must call `super.defineSchema()` to inherit parent fields
- Use `toPlainObject()` instead of `toObject()` when you need derived data

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
