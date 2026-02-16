/**
 * Roll a d6 dice pool for a skill check
 * @param {Object} options - Roll options
 * @param {number} options.skillLevel - Number of d6 to roll
 * @param {number} options.statModifier - Flat bonus from stat
 * @param {string} options.skillName - Name of the skill being rolled
 * @param {Actor} options.actor - The actor making the roll
 * @returns {Promise<Object>} Roll result with dice, total, and metadata
 */
export async function rollSkillCheck({skillLevel = 1, statModifier = 0, skillName = "Unknown Skill", actor}) {
  // Roll the dice pool
  const numDice = Math.max(1, skillLevel);
  const roll = await new Roll(`${numDice}d6`).evaluate();

  // Get individual die results
  const dice = roll.terms[0].results.map(r => r.result);

  // Calculate total: sum of dice + stat modifier
  const diceTotal = dice.reduce((sum, die) => sum + die, 0);
  const total = diceTotal + statModifier;

  // Check if all dice are 6s (for skill improvement)
  const allSixes = dice.length > 0 && dice.every(die => die === 6);

  return {
    roll,
    dice,
    diceTotal,
    statModifier,
    total,
    allSixes,
    skillName,
    skillLevel,
    actor
  };
}

/**
 * Perform a contested roll between two actors/skills
 * @param {Object} attacker - Attacker's roll data
 * @param {Object} defender - Defender's roll data
 * @returns {Promise<Object>} Contest result
 */
export async function contestedRoll(attacker, defender) {
  const attackRoll = await rollSkillCheck(attacker);
  const defenseRoll = await rollSkillCheck(defender);

  const attackerWins = attackRoll.total > defenseRoll.total;
  const difference = Math.abs(attackRoll.total - defenseRoll.total);

  return {
    attackRoll,
    defenseRoll,
    attackerWins,
    difference,
    tie: attackRoll.total === defenseRoll.total
  };
}

/**
 * Send a skill check result to chat
 * @param {Object} rollResult - Result from rollSkillCheck
 * @param {Object} options - Chat message options
 * @param {boolean} options.leveledUp - Whether the skill leveled up from this roll
 * @param {number} options.effortCost - Stamina cost for the roll
 */
export async function sendSkillRollToChat(rollResult, options = {}) {
  const {
    roll,
    dice,
    diceTotal,
    statModifier,
    total,
    allSixes,
    skillName,
    skillLevel,
    actor
  } = rollResult;

  // Get the skill to determine category - use getSkill method
  const skill = actor.system.getSkill ? actor.system.getSkill(skillName) : null;
  const skillCategory = skill?.category || 'general';

  // Determine action verb based on skill category
  let actionVerb = 'uses';
  if (skillCategory === 'combat') {
    actionVerb = 'attacks with';
  } else if (skillCategory === 'magic') {
    actionVerb = 'casts';
  } else if (skillCategory === 'utility') {
    actionVerb = 'performs';
  }

  // Get equipped weapons - only show for combat skills
  let equippedWeapons = [];
  if (skillCategory === 'combat') {
    equippedWeapons = actor.items?.filter(i =>
      i.type === 'weapon' && i.system?.equipped === true
    ).map(w => ({
      id: w.id,
      name: w.name,
      rarity: w.system.rarity || 'common',
      effort: w.system.effort || 0
    })) || [];
  }

  // Prepare template data
  const templateData = {
    actorId: actor.id,
    actorName: actor.name,
    actionVerb,
    skillName,
    skillLevel,
    dice,
    diceTotal,
    statModifier,
    total,
    allSixes,
    leveledUp: options.leveledUp || false,
    effortCost: options.effortCost || 0,
    equippedWeapons
  };

  // Render the template
  const content = await renderTemplate(
    'systems/dungeon-crawler-world/templates/chat/skill-roll-card.hbs',
    templateData
  );

  const chatData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    sound: CONFIG.sounds.dice,
    ...options
  };

  return ChatMessage.create(chatData);
}

/**
 * Send a contested roll result to chat
 * @param {Object} contestResult - Result from contestedRoll
 * @param {Object} options - Chat message options
 */
export async function sendContestedRollToChat(contestResult, options = {}) {
  const {
    attackRoll,
    defenseRoll,
    attackerWins,
    difference,
    tie
  } = contestResult;

  // Build dice displays
  const attackDice = attackRoll.dice.map(d =>
    `<span class="die d6 ${d === 6 ? 'max' : ''}">${d}</span>`
  ).join(' ');

  const defenseDice = defenseRoll.dice.map(d =>
    `<span class="die d6 ${d === 6 ? 'max' : ''}">${d}</span>`
  ).join(' ');

  const content = `
    <div class="dcc-world-roll contested-roll">
      <h3>Contested Roll</h3>

      <div class="roll-comparison">
        <div class="attacker-roll">
          <h4>${attackRoll.actor.name} - ${attackRoll.skillName}</h4>
          <div class="dice-display">${attackDice}</div>
          <div class="roll-total">${attackRoll.diceTotal}${attackRoll.statModifier !== 0 ? ` + ${attackRoll.statModifier}` : ''} = <strong>${attackRoll.total}</strong></div>
        </div>

        <div class="vs-divider">VS</div>

        <div class="defender-roll">
          <h4>${defenseRoll.actor.name} - ${defenseRoll.skillName}</h4>
          <div class="dice-display">${defenseDice}</div>
          <div class="roll-total">${defenseRoll.diceTotal}${defenseRoll.statModifier !== 0 ? ` + ${defenseRoll.statModifier}` : ''} = <strong>${defenseRoll.total}</strong></div>
        </div>
      </div>

      <div class="result ${attackerWins ? 'attacker-wins' : (tie ? 'tie' : 'defender-wins')}">
        ${tie ?
          '<strong>Tie!</strong>' :
          `<strong>${attackerWins ? attackRoll.actor.name : defenseRoll.actor.name} wins by ${difference}!</strong>`
        }
        ${attackerWins && !tie ? `<div class="damage">Damage: ${difference}</div>` : ''}
      </div>
    </div>
  `;

  const chatData = {
    user: game.user.id,
    content,
    sound: CONFIG.sounds.dice,
    ...options
  };

  return ChatMessage.create(chatData);
}

/**
 * Roll weapon damage and send to chat
 * @param {Actor} actor - The actor rolling damage
 * @param {string} weaponId - The ID of the weapon to roll damage for
 * @param {Object} options - Additional options
 */
export async function rollWeaponDamage(actor, weaponId, options = {}) {
  const weapon = actor.items.get(weaponId);

  if (!weapon || weapon.type !== 'weapon') {
    ui.notifications.error('Weapon not found!');
    return null;
  }

  // Get the damage formula
  const formula = weapon.system.formula;
  if (!formula) {
    ui.notifications.warn(`${weapon.name} has no damage formula!`);
    return null;
  }

  // Roll the damage using actor's roll data
  const rollData = actor.getRollData();
  const roll = await new Roll(formula, rollData).evaluate();

  // Prepare template data
  const templateData = {
    actorName: actor.name,
    weaponName: weapon.name,
    total: roll.total,
    formula: formula,
    showFormula: options.showFormula !== false
  };

  // Render the template
  const content = await renderTemplate(
    'systems/dungeon-crawler-world/templates/chat/damage-roll-card.hbs',
    templateData
  );

  const chatData = {
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    sound: CONFIG.sounds.dice,
    rolls: [roll],
    ...options
  };

  return ChatMessage.create(chatData);
}

/**
 * Initialize chat message listeners for damage roll buttons
 * Call this during system initialization
 */
export function initializeChatListeners() {
  Hooks.on('renderChatMessage', (message, html) => {
    // Add click handler for damage roll buttons
    html.find('.damage-roll-button').click(async (event) => {
      event.preventDefault();
      const button = $(event.currentTarget);
      const actorId = button.data('actor-id');
      const weaponId = button.data('weapon-id');

      // Get the actor
      const actor = game.actors.get(actorId);
      if (!actor) {
        ui.notifications.error('Actor not found!');
        return;
      }

      // Roll the damage
      await rollWeaponDamage(actor, weaponId);
    });
  });
}
