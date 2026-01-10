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
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.spellLevel != undefined) {
          spells[i.system.spellLevel].push(i);
        }
      }
    }

    // Assign and return
    context.gear = gear;
    context.features = features;
    context.spells = spells;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on('click', '.item-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.on('click', '.item-create', this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.on('click', '.item-delete', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.delete();
      li.slideUp(200, () => this.render(false));
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

    // Skill management
    html.on('click', '.skill-create', this._onSkillCreate.bind(this));
    html.on('click', '.skill-edit', this._onSkillEdit.bind(this));
    html.on('click', '.skill-delete', this._onSkillDelete.bind(this));

    // Skill category filters
    html.on('click', '.skill-filter', this._onSkillFilter.bind(this));

    // Stat increases
    html.on('click', '.stat-increase-button', this._onStatIncrease.bind(this));

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
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system['type'];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
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
    const skillId = $(event.currentTarget).closest('.skill').data('skillId');
    if (skillId) {
      await this.actor.rollSkill(skillId);
    }
  }

  /**
   * Handle creating a new skill
   * @param {Event} event   The originating click event
   * @private
   */
  async _onSkillCreate(event) {
    event.preventDefault();

    // Simple dialog to create a new skill
    new Dialog({
      title: "Create New Skill",
      content: `
        <form>
          <div class="form-group">
            <label>Skill Name:</label>
            <input type="text" name="skillName" placeholder="e.g., Melee Combat" />
          </div>
          <div class="form-group">
            <label>Parent Skill:</label>
            <select name="parentSkill">
              <option value="">None</option>
              ${Object.entries(this.actor.system.skills).map(([id, skill]) =>
                `<option value="${id}">${skill.name}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Category:</label>
            <select name="category">
              <option value="general">General</option>
              <option value="combat">Combat</option>
              <option value="magic">Magic</option>
              <option value="utility">Utility</option>
            </select>
          </div>
          <div class="form-group">
            <label>Related Stat:</label>
            <select name="relatedStat">
              <option value="">None</option>
              <option value="str">STR</option>
              <option value="dex">DEX</option>
              <option value="con">CON</option>
              <option value="int">INT</option>
              <option value="wis">WIS</option>
              <option value="cha">CHA</option>
            </select>
          </div>
          <div class="form-group">
            <label>Starting Level:</label>
            <input type="number" name="level" value="1" min="1" />
          </div>
        </form>
      `,
      buttons: {
        create: {
          label: "Create",
          callback: async (html) => {
            const formData = new FormData(html[0].querySelector('form'));
            const skillName = formData.get('skillName');
            const parentSkill = formData.get('parentSkill') || null;
            const category = formData.get('category');
            const relatedStat = formData.get('relatedStat') || null;
            const level = parseInt(formData.get('level')) || 1;

            if (!skillName) {
              ui.notifications.warn("Skill name is required.");
              return;
            }

            // Generate skill ID from name
            const skillId = skillName.toLowerCase().replace(/\s+/g, '-');

            // Create the skill
            const newSkill = {
              id: skillId,
              name: skillName,
              level,
              parent: parentSkill,
              category,
              relatedStat
            };

            // Update actor with new skill
            const skills = foundry.utils.duplicate(this.actor.system.skills);
            skills[skillId] = newSkill;
            await this.actor.update({ 'system.skills': skills });

            ui.notifications.info(`Created skill: ${skillName}`);
          }
        },
        cancel: {
          label: "Cancel"
        }
      },
      default: "create"
    }).render(true);
  }

  /**
   * Handle editing a skill
   * @param {Event} event   The originating click event
   * @private
   */
  async _onSkillEdit(event) {
    event.preventDefault();
    const skillId = $(event.currentTarget).closest('.skill').data('skillId');
    const skill = this.actor.system.skills[skillId];

    if (!skill) return;

    // Simple dialog to edit the skill
    new Dialog({
      title: `Edit Skill: ${skill.name}`,
      content: `
        <form>
          <div class="form-group">
            <label>Skill Name:</label>
            <input type="text" name="skillName" value="${skill.name}" />
          </div>
          <div class="form-group">
            <label>Level:</label>
            <input type="number" name="level" value="${skill.level}" min="1" />
          </div>
          <div class="form-group">
            <label>Related Stat:</label>
            <select name="relatedStat">
              <option value="" ${!skill.relatedStat ? 'selected' : ''}>None</option>
              <option value="str" ${skill.relatedStat === 'str' ? 'selected' : ''}>STR</option>
              <option value="dex" ${skill.relatedStat === 'dex' ? 'selected' : ''}>DEX</option>
              <option value="con" ${skill.relatedStat === 'con' ? 'selected' : ''}>CON</option>
              <option value="int" ${skill.relatedStat === 'int' ? 'selected' : ''}>INT</option>
              <option value="wis" ${skill.relatedStat === 'wis' ? 'selected' : ''}>WIS</option>
              <option value="cha" ${skill.relatedStat === 'cha' ? 'selected' : ''}>CHA</option>
            </select>
          </div>
        </form>
      `,
      buttons: {
        save: {
          label: "Save",
          callback: async (html) => {
            const formData = new FormData(html[0].querySelector('form'));
            const skillName = formData.get('skillName');
            const level = parseInt(formData.get('level')) || 1;
            const relatedStat = formData.get('relatedStat') || null;

            // Update the skill
            const skills = foundry.utils.duplicate(this.actor.system.skills);
            skills[skillId].name = skillName;
            skills[skillId].level = level;
            skills[skillId].relatedStat = relatedStat;

            await this.actor.update({ 'system.skills': skills });
          }
        },
        cancel: {
          label: "Cancel"
        }
      },
      default: "save"
    }).render(true);
  }

  /**
   * Handle deleting a skill
   * @param {Event} event   The originating click event
   * @private
   */
  async _onSkillDelete(event) {
    event.preventDefault();
    const li = $(event.currentTarget).closest('.skill');
    const skillId = li.data('skillId');
    const skill = this.actor.system.skills[skillId];

    if (!skill) return;

    const confirmed = await Dialog.confirm({
      title: "Delete Skill",
      content: `<p>Are you sure you want to delete the skill "<strong>${skill.name}</strong>"?</p>`,
      defaultYes: false
    });

    if (confirmed) {
      // For Foundry v11 DataModel, we need to set the specific property to null
      // to properly trigger change detection on ObjectFields
      const updateData = {};
      updateData[`system.skills.${skillId}`] = null;

      await this.actor.update(updateData);
      ui.notifications.info(`Deleted skill: ${skill.name}`);

      // Force a complete re-render of the sheet
      this.render(true);
    }
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
}
