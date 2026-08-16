/**
 * System-shipped macros. Currently just "Grant Achievement" - see ensureSystemMacros()
 * (called from the ready hook in dungeon-crawler-world.mjs), which auto-creates the world
 * Macro document for GMs so it doesn't need to be built by hand.
 */

/**
 * GM-facing macro for handing out an achievement to one or more player characters.
 * Achievements are authored as world Items of type "achievement" (Items directory, not a
 * compendium - these are campaign-specific homebrew, unlike the shared DCW-Content packs)
 * with a description and an optional reward item UUID (usually a lootbox).
 */
export async function grantAchievementMacro() {
  if (!game.user.isGM) {
    ui.notifications.warn('Only the GM can grant achievements.');
    return;
  }

  const achievements = game.items.filter(i => i.type === 'achievement');
  if (achievements.length === 0) {
    ui.notifications.warn('No Achievement items found. Create one in the Items directory first (type: Achievement).');
    return;
  }

  const targets = game.actors.filter(a => a.type === 'character' && a.hasPlayerOwner);
  if (targets.length === 0) {
    ui.notifications.warn('No player-owned characters found.');
    return;
  }

  const achievementOptions = achievements
    .map(a => `<option value="${a.id}">${a.name}</option>`)
    .join('');
  const targetCheckboxes = targets
    .map(a => `<label class="achv-target-label"><input type="checkbox" class="achv-target" value="${a.id}" /> ${a.name}</label>`)
    .join('<br/>');

  new Dialog({
    title: 'Grant Achievement',
    content: `
      <form>
        <div class="form-group">
          <label>Achievement:</label>
          <select name="achievementId" autofocus>${achievementOptions}</select>
        </div>
        <div class="form-group">
          <label><input type="checkbox" id="achv-select-all" /> All Players</label>
        </div>
        <div class="form-group achv-target-list">
          ${targetCheckboxes}
        </div>
      </form>
      <script>
        document.getElementById('achv-select-all').addEventListener('change', (e) => {
          document.querySelectorAll('.achv-target').forEach(cb => cb.checked = e.target.checked);
        });
      </script>
    `,
    buttons: {
      grant: {
        icon: '<i class="fas fa-award"></i>',
        label: 'Grant',
        callback: async (html) => {
          const form = html[0].querySelector('form');
          const achievementId = form.querySelector('select[name="achievementId"]').value;
          const achievementItem = game.items.get(achievementId);
          if (!achievementItem) {
            ui.notifications.error('Achievement not found.');
            return;
          }

          const targetIds = Array.from(form.querySelectorAll('.achv-target:checked')).map(cb => cb.value);
          if (targetIds.length === 0) {
            ui.notifications.warn('No target players selected.');
            return;
          }

          for (const id of targetIds) {
            const actor = game.actors.get(id);
            if (actor) await actor.grantAchievement(achievementItem);
          }

          ui.notifications.info(`Granted "${achievementItem.name}" to ${targetIds.length} character(s).`);
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: 'Cancel'
      }
    },
    default: 'grant'
  }).render(true);
}

/**
 * Auto-create the "Grant Achievement" world macro for GMs if it doesn't exist yet, so it
 * ships with the system instead of needing to be built by hand. Identified by flag rather
 * than name so a GM renaming it doesn't cause a duplicate to be created later.
 */
export async function ensureSystemMacros() {
  if (!game.user.isGM) return;

  const existing = game.macros.find(m => m.getFlag('dungeon-crawler-world', 'systemMacro') === 'grant-achievement');
  if (existing) return;

  await Macro.create({
    name: 'Grant Achievement',
    type: 'script',
    img: 'icons/skills/trades/academics-merit-award-diploma-gold.webp',
    command: 'game.dungeoncrawlerworld.grantAchievementMacro();',
    flags: { 'dungeon-crawler-world': { systemMacro: 'grant-achievement' } }
  });
}
