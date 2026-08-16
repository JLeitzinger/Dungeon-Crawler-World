Achievements are GM-granted recognitions for something a crawler did - clearing a dungeon, hitting a milestone, a memorable table moment. They're informational (a name + description) and usually come with a reward.

## Granting One
The GM runs the **Grant Achievement** macro, which ships with the system (auto-created in the world's Macros directory the first time a GM logs in). It lets the GM either pick an existing Achievement or create a new one on the spot, then hand it to one or more player characters at once, or all of them.

Creating one inline saves it as a world Item, the same as authoring one by hand in the Items directory - so it shows up as an "existing" option the next time the macro runs. Unlike skills, features, spells, races, and classes, achievements are **not** DCW-Content compendium items - they're campaign-specific, so they live in the world's Items directory rather than a shared pack.

## What an Achievement Item Holds
- **Description** - what the achievement is for.
- **Reward Type** - `None`, `Lootbox`, or `Specific Item`.
  - **Lootbox** - pick a tier (Bronze through Celestial) from a dropdown. This doesn't need any lootbox content to be authored anywhere - a lootbox only needs a tier to be opened (see [[Lootboxes]]), so the macro builds one on the fly.
  - **Specific Item** - the UUID of any Item to grant instead (an escape hatch for rewards that aren't a lootbox).
  - **None** - purely informational, no auto-granted reward.
- **Reward Quantity** - how many of the reward to grant (only meaningful for stackable rewards like lootboxes).

## What Happens on the Character Sheet
Granting an achievement:
1. Adds an entry to the character's **Achievements** tab - name, description, what reward (if any) came with it, and the date.
2. Creates the reward item directly in the character's inventory, if a reward was set.
3. Posts a chat card announcing it.

The Achievements tab is a log, not a drag-and-drop section - entries only appear via the macro. A GM can remove a mistaken entry from the tab directly (the reward item itself isn't auto-removed, since it may have already been spent/used).
