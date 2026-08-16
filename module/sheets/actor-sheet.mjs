import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 *
 * TODO: Migrate to ApplicationV2 framework
 * This uses the legacy ActorSheet class. Should be migrated to ApplicationV2 for:
 * - Better performance and reactivity
 * - Modern component architecture
 * - Future compatibility (v1 may be deprecated in Foundry v14+)
 * See: https://foundryvtt.com/article/application-v2-migration/
 */
export class dccworldActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['dungeon-crawler-world', 'sheet', 'actor'],
      width: 600,
      height: 600,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'skills',
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/dungeon-crawler-world/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.document.toPlainObject();

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Adding a pointer to CONFIG.DCC_WORLD
    context.config = CONFIG.DCC_WORLD;

    // Whether the current user is a GM (gates GM-only controls like awarding XP)
    context.isGM = game.user.isGM;

    // Whether enough XP is banked to level up (gates the Level Up button)
    context.canLevelUp = actorData.type === 'character'
      && (actorData.system.attributes.xp.value || 0) >= (actorData.system.attributes.xp.max || 0);


    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Enrich biography info for display
    // Enrichment turns text like `[[/r 1d20]]` into buttons
    context.enrichedBiography = await TextEditor.enrichHTML(
      this.actor.system.biography,
      {
        // Whether to show secret blocks in the finished html
        secrets: this.document.isOwner,
        // Necessary in v11, can be removed in v12
        async: true,
        // Data to fill in for inline rolls
        rollData: this.actor.getRollData(),
        // Relative UUID resolution
        relativeTo: this.actor,
      }
    );

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(
      // A generator that returns all effects stored on the actor
      // as well as any items
      this.actor.allApplicableEffects()
    );

    return context;
  }

  /**
   * Character-specific context modifications
   *
   * @param {object} context The context object to mutate
   */
  _prepareCharacterData(context) {
    // This is where you can enrich character-specific editor fields
    // or setup anything else that's specific to this type
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const features = [];
    const skillItems = [];
    const weapons = [];
    const lootboxItems = [];
    const gods = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
    };

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to weapons
      else if (i.type === 'weapon') {
        weapons.push(i);
      }
      // Append to features (including those aggregated from race)
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to skills (skill items)
      else if (i.type === 'skill') {
        skillItems.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
        }
      }
      // Append to lootboxes.
      else if (i.type === 'lootbox') {
        lootboxItems.push(i);
      }
      // Append to worshipped gods.
      else if (i.type === 'god') {
        gods.push(i);
      }
    }

    // Aggregate lootboxes by tier, weakest to strongest, summing quantity across however
    // many separate item documents of that tier the actor owns (dragging the same lootbox
    // in twice creates two documents rather than merging into one).
    const lootboxes = CONFIG.DCC_WORLD.lootboxTiers
      .map(tier => ({
        tier,
        tierLabel: tier.charAt(0).toUpperCase() + tier.slice(1),
        count: lootboxItems
          .filter(i => i.system.tier === tier)
          .reduce((sum, i) => sum + (i.system.quantity || 0), 0)
      }))
      .filter(entry => entry.count > 0);

    // Assign and return
    context.gear = gear;
    context.weapons = weapons;
    context.features = features;
    context.skillItems = skillItems;
    context.spells = spells;
    context.lootboxes = lootboxes;
    context.gods = gods;

    // Add aggregated skills from system
    context.skills = context.system.aggregatedSkills || {};
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDropItem(event, data) {
    // Get the item from the data first to check its type
    const droppedItem = await Item.implementation.fromDropData(data);

    // Call parent to handle the drop
    const result = await super._onDropItem(event, data);

    // Grant features (race/class) and skills (race/class/feature/weapon)
    // We need to find the newly created item on the actor
    const GRANTS_SKILLS_TYPES = ['race', 'class', 'feature', 'weapon'];
    if (droppedItem && GRANTS_SKILLS_TYPES.includes(droppedItem.type)) {
      const actorItem = this.actor.items.find(i =>
        i.type === droppedItem.type && i.name === droppedItem.name
      );

      if (actorItem) {
        if (droppedItem.type === 'race' || droppedItem.type === 'class') {
          await this._grantFeaturesFromItem(actorItem);
        }
        await this._grantSkillsFromItem(actorItem);
      }
    }

    return result;
  }

  /**
   * Remove features that were granted by a race or class item
   * @param {Item} item - The race or class item being removed
   * @private
   */
  async _removeGrantedFeatures(item) {
    // Find all features on this character that were granted by this item
    const featuresToRemove = this.actor.items.filter(i =>
      i.type === 'feature' &&
      i.flags['dungeon-crawler-world']?.grantedBy === item.uuid
    );

    if (featuresToRemove.length > 0) {
      const itemIds = featuresToRemove.map(f => f.id);
      await this.actor.deleteEmbeddedDocuments('Item', itemIds);
      ui.notifications.info(`Removed ${featuresToRemove.length} feature(s) from ${item.name}`);
    }
  }

  /**
   * Grant features from a race or class item
   * @param {Item} item - The race or class item
   * @private
   */
  async _grantFeaturesFromItem(item) {
    const grantedFeatures = item.system?.grantedFeatures || [];

    if (grantedFeatures.length === 0) return;

    const featuresToCreate = [];

    for (const featureRef of grantedFeatures) {
      const featureUuid = featureRef.featureUuid;

      if (!featureUuid) continue;

      // Check if character already has this feature
      const existingFeature = this.actor.items.find(i =>
        i.type === 'feature' &&
        (i.flags['dungeon-crawler-world']?.sourceUuid === featureUuid ||
         i.name === featureUuid.split('.').pop())
      );

      if (existingFeature) continue;

      try {
        // Load the feature from compendium
        const featureDoc = await fromUuid(featureUuid);

        if (featureDoc) {
          // Prepare the feature data for creation
          const featureData = featureDoc.toObject();
          featureData.flags = featureData.flags || {};
          featureData.flags['dungeon-crawler-world'] = {
            sourceUuid: featureUuid,
            grantedBy: item.uuid,
            grantedAt: featureRef.level || 1
          };

          featuresToCreate.push(featureData);
        } else {
          console.warn(`DCC World: Could not find feature ${featureUuid}`);
        }
      } catch (error) {
        console.warn(`DCC World: Error loading feature ${featureUuid}:`, error);
      }
    }

    // Create all features at once
    if (featuresToCreate.length > 0) {
      await this.actor.createEmbeddedDocuments('Item', featuresToCreate);
      ui.notifications.info(`Granted ${featuresToCreate.length} feature(s) from ${item.name}`);
    }
  }

  /**
   * Grant level-0 skill items from a dropped item's grantedSkills list.
   * Skips skills the actor already owns. Loads full skill data from the compendium.
   * @param {Item} item - The dropped item (race, class, feature, weapon)
   * @private
   */
  async _grantSkillsFromItem(item) {
    const grantedSkills = item.system?.grantedSkills || [];
    if (grantedSkills.length === 0) return;

    const skillsToCreate = [];

    for (const granted of grantedSkills) {
      const skillUuid = granted.skillUuid;
      if (!skillUuid) continue;

      // Extract skill name from UUID (same logic as _aggregateSkills)
      let skillName = skillUuid.split('.').pop();
      skillName = skillName.charAt(0).toUpperCase() + skillName.slice(1);

      // Skip if the actor already owns a skill item with this name
      const existingSkill = this.actor.items.find(i =>
        i.type === 'skill' && i.name === skillName
      );
      if (existingSkill) continue;

      try {
        const skillDoc = await fromUuid(skillUuid);
        if (skillDoc) {
          const skillData = skillDoc.toObject();
          skillData.system.level = 0;
          skillData.flags = skillData.flags || {};
          skillData.flags['dungeon-crawler-world'] = {
            sourceUuid: skillUuid,
            grantedBy: item.uuid
          };
          skillsToCreate.push(skillData);
        } else {
          console.warn(`DCC World: Could not find skill ${skillUuid}`);
        }
      } catch (error) {
        console.warn(`DCC World: Error loading skill ${skillUuid}:`, error);
      }
    }

    if (skillsToCreate.length > 0) {
      await this.actor.createEmbeddedDocuments('Item', skillsToCreate);
      ui.notifications.info(`Granted ${skillsToCreate.length} skill(s) from ${item.name}`);
    }
  }

  /**
   * Remove skill items that were auto-granted by a specific item.
   * Only removes skills that have no other granting source.
   * @param {Item} item - The item being removed
   * @private
   */
  async _removeGrantedSkills(item) {
    const skillsToRemove = this.actor.items.filter(i =>
      i.type === 'skill' &&
      i.flags['dungeon-crawler-world']?.grantedBy === item.uuid
    );

    if (skillsToRemove.length > 0) {
      const itemIds = skillsToRemove.map(s => s.id);
      await this.actor.deleteEmbeddedDocuments('Item', itemIds);
      ui.notifications.info(`Removed ${skillsToRemove.length} skill(s) from ${item.name}`);
    }
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Restore skill filter state
    if (this._activeSkillFilter) {
      const filterButton = html.find(`.skill-filter[data-category="${this._activeSkillFilter}"]`);
      if (filterButton.length) {
        filterButton.siblings('.skill-filter').removeClass('active');
        filterButton.addClass('active');

        // Apply the filter
        const skillsList = filterButton.closest('.skills-container').find('.skills-list');
        const skillItems = skillsList.find('.skill');
        if (this._activeSkillFilter === 'all') {
          skillItems.show();
        } else {
          skillItems.each((i, elem) => {
            const skillCategory = $(elem).data('skill-category');
            if (skillCategory === this._activeSkillFilter) {
              $(elem).show();
            } else {
              $(elem).hide();
            }
          });
        }
      }
    }

    // Restore skill level dropdown selections
    if (this._skillLevelSelections) {
      for (const [skillUuid, level] of Object.entries(this._skillLevelSelections)) {
        const dropdown = html.find(`.skill-level-select[data-skill-uuid="${skillUuid}"]`);
        if (dropdown.length) {
          dropdown.val(level);
        }
      }
    }

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on('click', '.item-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const itemId = $(ev.currentTarget).data('itemId') || li.data('itemId');
      const item = this.actor.items.get(itemId);
      if (item) {
        item.sheet.render(true);
      }
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Delete Inventory Item
    html.on('click', '.item-delete', async (ev) => {
      const button = $(ev.currentTarget);
      const container = button.closest('.item, .equipped-item');
      const itemId = button.data('itemId') || container.data('itemId');
      const item = this.actor.items.get(itemId);
      if (item) {
        // If deleting a race or class, remove granted features
        if (item.type === 'race' || item.type === 'class') {
          await this._removeGrantedFeatures(item);
        }
        // Remove any auto-granted skills from this item
        await this._removeGrantedSkills(item);
        await item.delete();
        container.slideUp(200, () => this.render(false));
      }
    });

    // Active Effect management
    html.on('click', '.effect-control', (ev) => {
      const row = ev.currentTarget.closest('li');
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // Rollable abilities.
    html.on('click', '.rollable', this._onRoll.bind(this));

    // Skill rolls
    html.on('click', '.skill-roll', this._onSkillRoll.bind(this));

    // Spell rolls
    html.on('click', '.spell-roll', this._onSpellRoll.bind(this));

    // Use a consumable item
    html.on('click', '.use-item', this._onUseItem.bind(this));

    // Weapon rolls
    html.on('click', '.weapon-roll', this._onWeaponRoll.bind(this));

    // Weapon equip toggle
    html.on('click', '.weapon-equip-toggle', this._onWeaponEquipToggle.bind(this));

    // Lootbox opening
    html.on('click', '.lootbox-open-one', this._onLootboxOpenOne.bind(this));
    html.on('click', '.lootbox-open-all', this._onLootboxOpenAll.bind(this));

    // Skill category filters
    html.on('click', '.skill-filter', this._onSkillFilter.bind(this));

    // Skill level dropdown changes - save selections
    html.on('change', '.skill-level-select', (ev) => {
      const dropdown = $(ev.currentTarget);
      const skillUuid = dropdown.data('skill-uuid');
      const selectedLevel = parseInt(dropdown.val());

      // Initialize storage if needed
      if (!this._skillLevelSelections) {
        this._skillLevelSelections = {};
      }

      // Save the selection
      this._skillLevelSelections[skillUuid] = selectedLevel;
    });

    // Stat increases
    html.on('click', '.stat-increase-button', this._onStatIncrease.bind(this));

    // Level up
    html.on('click', '.level-up-button', this._onLevelUp.bind(this));

    // Award XP (GM only)
    html.on('click', '.award-xp-button', this._onAwardXP.bind(this));

    // Remove an achievement log entry (GM only - template only renders the control for GMs)
    html.on('click', '.achievement-delete', this._onAchievementDelete.bind(this));

    // Regen HP/Stamina/Mana (start of turn)
    html.on('click', '.regen-button', this._onRegenResources.bind(this));

    // Header collapse toggle
    html.on('click', '.header-collapse-toggle', this._onHeaderCollapseToggle.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains('inventory-header')) return;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      });
    }
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

  /**
   * Handle skill rolls
   * @param {Event} event   The originating click event
   * @private
   */
  async _onSkillRoll(event) {
    event.preventDefault();
    const skillElement = $(event.currentTarget).closest('.skill');
    const skillUuid = skillElement.data('skillUuid');

    if (skillUuid) {
      // Get the selected level from the dropdown
      const levelSelect = skillElement.find('.skill-level-select');
      const selectedLevel = levelSelect.length ? parseInt(levelSelect.val()) : null;

      // Roll with custom level if selected
      if (selectedLevel) {
        await this.actor.rollSkill(skillUuid, { customLevel: selectedLevel });
      } else {
        await this.actor.rollSkill(skillUuid);
      }
    }
  }

  /**
   * Handle spell rolls
   * @param {Event} event   The originating click event
   * @private
   */
  async _onSpellRoll(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('.skill').data('itemId');
    if (itemId) {
      await this.actor.rollSpell(itemId);
    }
  }

  /**
   * Handle using a consumable item
   * @param {Event} event   The originating click event
   * @private
   */
  async _onUseItem(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('.item').data('itemId');
    if (itemId) {
      await this.actor.useItem(itemId);
    }
  }

  /**
   * Handle weapon rolls
   * @param {Event} event   The originating click event
   * @private
   */
  async _onWeaponRoll(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('.item').data('itemId');
    if (itemId) {
      await this.actor.rollWeapon(itemId);
    }
  }

  /**
   * Handle weapon equip/unequip toggle
   * @param {Event} event   The originating click event
   * @private
   */
  async _onWeaponEquipToggle(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const itemId = button.closest('.item').data('itemId');
    const weapon = this.actor.items.get(itemId);

    if (weapon && weapon.type === 'weapon') {
      const newEquippedState = !weapon.system.equipped;
      await weapon.update({ 'system.equipped': newEquippedState });

      if (newEquippedState) {
        ui.notifications.info(`${weapon.name} equipped`);
      } else {
        ui.notifications.info(`${weapon.name} unequipped`);
      }
    }
  }

  /**
   * Handle opening a single lootbox of a given tier
   * @param {Event} event   The originating click event
   * @private
   */
  async _onLootboxOpenOne(event) {
    event.preventDefault();
    const tier = $(event.currentTarget).data('tier');
    await this.actor.openLootboxTier(tier, 1);
  }

  /**
   * Handle opening every owned lootbox of a given tier at once
   * @param {Event} event   The originating click event
   * @private
   */
  async _onLootboxOpenAll(event) {
    event.preventDefault();
    const tier = $(event.currentTarget).data('tier');
    // openLootboxTier clamps to however many are actually owned.
    await this.actor.openLootboxTier(tier, Infinity);
  }

  /**
   * Handle filtering skills by category
   * @param {Event} event   The originating click event
   * @private
   */
  _onSkillFilter(event) {
    event.preventDefault();
    const button = $(event.currentTarget);
    const category = button.data('category');

    // Save the active filter state
    this._activeSkillFilter = category;

    // Update active state on buttons
    button.siblings('.skill-filter').removeClass('active');
    button.addClass('active');

    // Filter skills
    const skillsList = button.closest('.skills-container').find('.skills-list');
    const skillItems = skillsList.find('.skill');

    if (category === 'all') {
      // Show all skills
      skillItems.slideDown(200);
    } else {
      // Show only skills of selected category
      skillItems.each((i, elem) => {
        const skillCategory = $(elem).data('skill-category');
        if (skillCategory === category) {
          $(elem).slideDown(200);
        } else {
          $(elem).slideUp(200);
        }
      });
    }
  }

  /**
   * Handle spending stat increases
   * @param {Event} event   The originating click event
   * @private
   */
  async _onStatIncrease(event) {
    event.preventDefault();
    await this.actor.promptStatIncrease();
  }

  /**
   * Handle leveling up the character
   * @param {Event} event   The originating click event
   * @private
   */
  async _onLevelUp(event) {
    event.preventDefault();
    await this.actor.levelUp();
  }

  /**
   * Handle the GM awarding XP
   * @param {Event} event   The originating click event
   * @private
   */
  async _onAwardXP(event) {
    event.preventDefault();
    await this.actor.promptAwardXP();
  }

  /**
   * Handle removing an achievement log entry
   * @param {Event} event   The originating click event
   * @private
   */
  async _onAchievementDelete(event) {
    event.preventDefault();
    const index = parseInt($(event.currentTarget).data('index'));
    const achievements = foundry.utils.duplicate(this.actor.system.achievements || []);
    achievements.splice(index, 1);
    await this.actor.update({ 'system.achievements': achievements });
  }

  /**
   * Handle regenerating HP/Stamina/Mana at the start of this character's turn
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRegenResources(event) {
    event.preventDefault();
    await this.actor.regenResources();
  }

  /**
   * Handle header collapse toggle
   * @param {Event} event   The originating click event
   * @private
   */
  async _onHeaderCollapseToggle(event) {
    event.preventDefault();
    const currentState = this.actor.flags['dungeon-crawler-world']?.headerCollapsed || false;
    await this.actor.update({
      'flags.dungeon-crawler-world.headerCollapsed': !currentState
    });
    this.render(false);
  }
}
