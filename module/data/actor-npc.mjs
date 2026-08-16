import dccworldActorBase from "./base-actor.mjs";

export default class dccworldNPC extends dccworldActorBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.cr = new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 });
    schema.xp = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });

    return schema
  }

  /**
   * NPCs have no stamina/mana split - Power is spent as the effort pool for both skill and
   * weapon rolls. See dccworldCharacter#effortResource for the character equivalent.
   * @returns {{field: string, pool: {value: number, max: number}}}
   */
  get effortResource() {
    return { field: 'power', pool: this.power };
  }

  prepareDerivedData() {
    this.xp = this.cr * this.cr * 100;

    // NPCs are authored as direct stat blocks (no race/class items, no leveling) - just
    // compute ability modifiers and aggregate skills/luck from owned and granted items.
    this._computeAbilityMods();
    this._aggregateSkills();
    this._aggregateLuck();
  }

  /**
   * @lvl in roll formulas (e.g. a weapon's `+@str.mod+ceil(@lvl/2)`) maps to Challenge
   * Rating for NPCs, since they have no character level.
   */
  getRollData() {
    return { ...this._baseRollData(), lvl: this.cr };
  }
}