/**
 * System-shipped macros. Currently just "Grant Achievement" - see ensureSystemMacros()
 * (called from the ready hook in dungeon-crawler-world.mjs), which auto-creates the world
 * Macro document for GMs so it doesn't need to be built by hand.
 */

const DEFAULT_ACHIEVEMENT_IMG = 'icons/skills/trades/academics-merit-award-diploma-gold.webp';

/**
 * GM-facing macro for handing out an achievement to one or more player characters.
 * Achievements are authored as world Items of type "achievement" (Items directory, not a
 * compendium - these are campaign-specific homebrew, unlike the shared DCW-Content packs).
 * The dialog can grant an existing achievement or create a new one inline - new ones are
 * saved as world Items so they show up as "existing" the next time this runs.
 */
export async function grantAchievementMacro() {
  if (!game.user.isGM) {
    ui.notifications.warn('Only the GM can grant achievements.');
    return;
  }

  const targets = game.actors.filter(a => a.type === 'character' && a.hasPlayerOwner);
  if (targets.length === 0) {
    ui.notifications.warn('No player-owned characters found.');
    return;
  }

  const achievements = game.items.filter(i => i.type === 'achievement');
  const tierOptions = CONFIG.DCC_WORLD.lootboxTiers
    .map(t => `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`)
    .join('');
  const achievementOptions = [
    '<option value="__new__">+ Create New Achievement</option>',
    ...achievements.map(a => `<option value="${a.id}">${a.name}</option>`)
  ].join('');
  const targetCheckboxes = targets
    .map(a => `<label class="achv-target-label"><input type="checkbox" class="achv-target" value="${a.id}" /> ${a.name}</label>`)
    .join('<br/>');

  new Dialog({
    title: 'Grant Achievement',
    content: `
      <form>
        <div class="form-group">
          <label>Achievement:</label>
          <select name="achievementId" id="achv-select" autofocus>${achievementOptions}</select>
        </div>

        <div id="achv-new-fields">
          <div class="form-group">
            <label>Name:</label>
            <input type="text" name="newName" placeholder="Achievement name" />
          </div>
          <div class="form-group">
            <label>Description:</label>
            <textarea name="newDescription" rows="2" placeholder="What did they do?"></textarea>
          </div>
          <div class="form-group">
            <label>Reward:</label>
            <select name="rewardType" id="achv-reward-type">
              <option value="none">No Reward</option>
              <option value="lootbox" selected>Lootbox</option>
              <option value="item">Specific Item (UUID)</option>
            </select>
          </div>
          <div class="form-group" id="achv-reward-tier-group">
            <label>Lootbox Tier:</label>
            <select name="rewardTier">${tierOptions}</select>
          </div>
          <div class="form-group" id="achv-reward-uuid-group" style="display:none;">
            <label>Item UUID:</label>
            <input type="text" name="rewardUuid" placeholder="Item UUID" />
          </div>
          <div class="form-group">
            <label>Reward Quantity:</label>
            <input type="number" name="rewardQuantity" value="1" min="1" />
          </div>
        </div>

        <hr/>

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

        const achvSelect = document.getElementById('achv-select');
        const newFields = document.getElementById('achv-new-fields');
        function toggleNewFields() {
          newFields.style.display = achvSelect.value === '__new__' ? '' : 'none';
        }
        achvSelect.addEventListener('change', toggleNewFields);
        toggleNewFields();

        const rewardTypeSelect = document.getElementById('achv-reward-type');
        const tierGroup = document.getElementById('achv-reward-tier-group');
        const uuidGroup = document.getElementById('achv-reward-uuid-group');
        function toggleRewardFields() {
          tierGroup.style.display = rewardTypeSelect.value === 'lootbox' ? '' : 'none';
          uuidGroup.style.display = rewardTypeSelect.value === 'item' ? '' : 'none';
        }
        rewardTypeSelect.addEventListener('change', toggleRewardFields);
        toggleRewardFields();
      </script>
    `,
    buttons: {
      grant: {
        icon: '<i class="fas fa-award"></i>',
        label: 'Grant',
        callback: async (html) => {
          const form = html[0].querySelector('form');
          let achievementItem;

          const achievementId = form.querySelector('#achv-select').value;
          if (achievementId === '__new__') {
            const name = form.querySelector('[name="newName"]').value.trim();
            if (!name) {
              ui.notifications.warn('Enter a name for the new achievement.');
              return;
            }

            const rewardType = form.querySelector('[name="rewardType"]').value;
            const system = {
              description: form.querySelector('[name="newDescription"]').value,
              rewardType,
              rewardTier: rewardType === 'lootbox' ? form.querySelector('[name="rewardTier"]').value : 'bronze',
              rewardUuid: rewardType === 'item' ? form.querySelector('[name="rewardUuid"]').value.trim() : '',
              rewardQuantity: parseInt(form.querySelector('[name="rewardQuantity"]').value) || 1
            };

            achievementItem = await Item.create({ name, type: 'achievement', img: DEFAULT_ACHIEVEMENT_IMG, system });
            ui.notifications.info(`Created achievement "${name}".`);
          } else {
            achievementItem = game.items.get(achievementId);
          }

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
    img: DEFAULT_ACHIEVEMENT_IMG,
    command: 'game.dungeoncrawlerworld.grantAchievementMacro();',
    flags: { 'dungeon-crawler-world': { systemMacro: 'grant-achievement' } }
  });
}
