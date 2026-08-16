import dccworldItemBase from "./base-item.mjs";

/**
 * God Item Data Model
 *
 * Represents a deity a character worships. Dragged onto a character sheet's Worship
 * section like any other item. Inherits grantedSkills/luckBonus from the base item class,
 * so a god can already bestow a passive skill or luck bonus while worshipped with no
 * extra wiring - full feature-granting (like race/class) is a planned follow-up, not yet
 * built (see Rules/Worship.md).
 *
 * @extends dccworldItemBase
 */
export default class dccworldGod extends dccworldItemBase {}
