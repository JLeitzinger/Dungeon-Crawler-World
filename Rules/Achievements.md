Achievements are GM-granted recognitions for something a crawler did - clearing a dungeon, hitting a milestone, a memorable table moment. They're informational (a name + description) and usually come with a reward.

## Granting One
The GM runs the **Grant Achievement** macro, which ships with the system (auto-created in the world's Macros directory the first time a GM logs in). It lets the GM pick an Achievement and hand it to one or more player characters at once, or all of them.

Unlike skills, features, spells, races, and classes, achievements are **not** DCW-Content compendium items - they're campaign-specific, so the GM authors them directly as world Items (Items directory, type "Achievement") rather than pulling from a shared pack.

## What an Achievement Item Holds
- **Description** - what the achievement is for.
- **Reward UUID** - the UUID of an Item to automatically grant to each recipient (usually a lootbox, but any Item works). Leave blank for a purely informational achievement.
- **Reward Quantity** - how many of the reward to grant (only meaningful for stackable rewards like lootboxes, which have a quantity field).

## What Happens on the Character Sheet
Granting an achievement:
1. Adds an entry to the character's **Achievements** tab - name, description, what reward (if any) came with it, and the date.
2. Creates the reward item directly in the character's inventory, if a reward was set.
3. Posts a chat card announcing it.

The Achievements tab is a log, not a drag-and-drop section - entries only appear via the macro. A GM can remove a mistaken entry from the tab directly (the reward item itself isn't auto-removed, since it may have already been spent/used).
