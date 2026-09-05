Casting a spell is a skill check with a Mana cost attached — nothing more exotic than that. It is not automatically contested against a target; like any general skill check, the AI decides what (if anything) it's contested by (see [[Skill Checks]] and [[Difficulty]]).

## What a Spell Has
- **Dice Pool** — every spell has its own pool, separate from your other skills, that starts at 1d6 and grows the same way a skill does: roll all 6s and it improves by a die (see [[Skill Improvements]]).
- **Cast Stat** — the ability whose modifier gets added to the roll (see [[Ability Modifiers]]), set per spell — typically INT, WIS, or CHA depending on the spell and the caster's tradition.
- **Mana Cost** — a flat amount of [[Mana Points|Mana]] spent the moment you attempt the cast. You need at least that much Mana to attempt the cast at all, and it's spent whether the cast succeeds or not — you're paying to attempt the spell, not to land it.
- **Spell Level** — a 1-15 rating used to place the spell in a class or race's progression and help scale its Mana cost. It isn't a mechanical gate on its own; a crawler simply doesn't have a spell unless it was granted to them, the same way skills are acquired through race, class, items, and feats rather than invented freely (see [[Skill Acquisition]]).

## Casting
Roll the spell's dice pool + cast stat modifier, same as any skill check. If the AI has something contesting it (an enemy resisting, a lock magically warded shut, whatever the fiction calls for), that's resolved the normal way.

Same as a skill check, you can choose to cast at less than the spell's full dice pool ("Cast At" on the sheet) — the Mana cost scales down proportionally with the level chosen (full pool always costs the spell's full authored Mana cost; half the pool costs roughly half). Rolling all 6s only grows the pool when cast at its full level.

## Offensive Spells
A spell that deals damage works like a weapon [[Attack]]: the cast roll is the hit step (contested, same as landing a weapon hit), and a successful cast is followed by a separate damage roll — the spell's own damage formula, set per spell, same shape as a weapon's (dice + relevant modifier), plus half the caster's Level rounded up, same as a weapon's damage.

Not every spell is offensive. A spell with a non-damage effect (a buff, a utility effect, healing) just uses its single cast roll from above — the total itself is the effect's magnitude. Only offensive spells get the extra damage step.

A spell marked Offensive gets a "Damage" button on its cast chat card, same as a weapon attack does — rolling it uses the spell's own dice + modifier formula (e.g. `2d6+@int.mod`) plus half Level, set per spell to match its Cast Stat.

The number of damage dice matches the dice count the spell was cast at, not just its own base — same as a weapon [[Attack]]: casting at a bigger pool (a higher-level spell, or one cast at its full level) rolls that many damage dice instead, never fewer than the spell's own base even at the lowest level cast.

## Improving a Spell
Rolling all 6s on a spell's own dice pool (cast at its full level) grows that spell's pool by one die, permanently — this is the biggest way a spell gets stronger, since it also means bigger damage rolls for offensive spells. Its damage also grows on its own as the caster levels up, same as a weapon's does.
