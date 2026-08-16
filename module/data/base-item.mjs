import dccworldDataModel from "./base-model.mjs";

/**
 * Base Item Data Model
 *
 * All item types (item, feature, spell, class, race, skill) extend this base class.
 * Provides common fields including description and granted skills.
 *
 * **grantedSkills Field:**
 * All items can grant skill bonuses to characters.
 * Format: Array of {skillUuid: string, level: number}
 *
 * Example:
 * ```json
 * "grantedSkills": [
 *   {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Slash", "level": 1}
 * ]
 * ```
 *
 * Use `node scripts/skill-lookup.mjs granted "SkillName" <level>` to generate entries.
 *
 * @extends dccworldDataModel
 */
export default class dccworldItemBase extends dccworldDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.description = new fields.StringField({ required: true, blank: true });

    /**
     * Skills granted by this item
     *
     * When a character has this item, the granted skills will:
     * 1. Add to the skill's total level (stacks with other sources)
     * 2. Show up in the skills list with source attribution
     * 3. If the character doesn't have the skill item, create a placeholder entry
     *
     * **IMPORTANT:** Any skill referenced here MUST exist in the skills compendium.
     * If a skill doesn't exist in `data/skills-manifest.json`, you must create it first:
     * 1. Add skill entry to `data/skills-manifest.json`
     * 2. Run `npm run generate:skills` to create skill JSON
     * 3. Run `npm run pack:skills` to update compendium
     *
     * Use `node scripts/skill-lookup.mjs granted "SkillName" <level>` to generate entries.
     *
     * @type {Array<{skillUuid: string, level: number}>}
     *
     * @example
     * // Weapons typically grant 1-2 combat skills
     * "grantedSkills": [
     *   {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Slash", "level": 1}
     * ]
     *
     * @example
     * // Races grant 2-3 general/utility skills, optionally 0-2 magic/combat
     * "grantedSkills": [
     *   {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Diplomacy", "level": 1},
     *   {"skillUuid": "Compendium.dungeon-crawler-world.skills.Item.Lore", "level": 1}
     * ]
     */
    schema.grantedSkills = new fields.ArrayField(
      new fields.ObjectField({
        required: true,
        nullable: false,
        initial: {}
      }),
      {
        required: true,
        initial: []
      }
    );

    /**
     * Flat LUK bonus granted while this item applies.
     *
     * Unlike ability scores, LUK is added directly to every roll a character makes with
     * no modifier formula - see dccworldCharacter's luck aggregation. Weapons only apply
     * this while equipped (matching grantedSkills); every other item type applies it
     * unconditionally whenever owned. Most items should use -2 to +2; reserve larger
     * swings for rare/mythic items or curses.
     */
    schema.luckBonus = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 });

    return schema;
  }

}