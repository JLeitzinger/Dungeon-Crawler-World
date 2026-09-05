/**
 * Roll a d6 dice pool for a skill check
 * @param {Object} options - Roll options
 * @param {number} options.skillLevel - Number of d6 to roll
 * @param {number} options.statModifier - Flat bonus from stat
 * @param {string} options.skillName - Name of the skill being rolled
 * @param {Actor} options.actor - The actor making the roll
 * @returns {Promise<Object>} Roll result with dice, total, and metadata
 */
export async function rollSkillCheck({skillLevel = 1, statModifier = 0, skillName = "Unknown Skill", actor, improvementDice}) {
  // Roll the dice pool
  const numDice = Math.max(1, skillLevel);
  const roll = await new Roll(`${numDice}d6`).evaluate();

  // Get individual die results
  const dice = roll.terms[0].results.map(r => r.result);

  // Calculate total: sum of dice + stat modifier
  const diceTotal = dice.reduce((sum, die) => sum + die, 0);
  const total = diceTotal + statModifier;

  // Check for skill improvement eligibility.
  // Only base skill item dice count — bonus dice from weapons/race/class grants are excluded.
  // improvementDice === 0 (skill level 0): passes if the best die rolled is a 6.
  // improvementDice > 0: all N base-skill dice must be 6s.
  // improvementDice === undefined: all dice checked (backwards compat).
  let allSixes;
  if (improvementDice === 0) {
    allSixes = dice.length > 0 && Math.max(...dice) === 6;
  } else {
    const checkCount = improvementDice !== undefined ? improvementDice : numDice;
    const checkDice = dice.slice(0, checkCount);
    allSixes = checkDice.length > 0 && checkDice.every(die => die === 6);
  }

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
 * @param {boolean} options.isDefensiveSkill - True if this skill is granted by equipped armor
 *   (e.g. Block/Dodge) - purely defensive, never gets its own damage roll (see Actor#rollSkill
 *   and Rules/Combat/Attack.md: damage only follows a *won* attack roll, not a defense roll).
 * @param {string[]} options.attackWeaponIds - IDs of equipped weapons that actually grant the
 *   skill being rolled - only these get a "Roll Damage" button, not every equipped weapon.
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
  // Block/Dodge are the two fixed defensive combat skills in this system (see DCW-Content's
  // Armor design guidelines) - always defensive regardless of how the character has them
  // (equipped armor, race, class, ...), unlike options.isDefensiveSkill which only catches the
  // equipped-armor case.
  const isDefensiveSkill = options.isDefensiveSkill || ['Block', 'Dodge'].includes(skillName);

  // Determine action verb based on skill category
  let actionVerb = 'uses';
  if (isDefensiveSkill) {
    actionVerb = 'defends with';
  } else if (skillCategory === 'combat') {
    actionVerb = 'attacks with';
  } else if (skillCategory === 'magic') {
    actionVerb = 'casts';
  } else if (skillCategory === 'utility') {
    actionVerb = 'performs';
  }

  // Get equipped weapons that actually grant this skill - a damage roll only ever follows a
  // won attack roll (see Rules/Combat/Attack.md), so a defensive skill like Block/Dodge (granted
  // by armor, not a weapon) must never show a "Roll Damage" button, even if the actor also has
  // a weapon equipped.
  const attackWeaponIds = options.attackWeaponIds || [];
  let equippedWeapons = [];
  if (!isDefensiveSkill && attackWeaponIds.length) {
    equippedWeapons = actor.items?.filter(i =>
      i.type === 'weapon' && attackWeaponIds.includes(i.id)
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
    equippedWeapons,
    offensiveSpell: options.offensiveSpell || null
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
 * @param {number} options.level - Dice count the attack was rolled at; scales up the damage
 *   dice on top of the weapon's own base (see dccworldWeapon#getDamageFormula)
 */
export async function rollWeaponDamage(actor, weaponId, options = {}) {
  const weapon = actor.items.get(weaponId);

  if (!weapon || weapon.type !== 'weapon') {
    ui.notifications.error('Weapon not found!');
    return null;
  }

  // Get the damage formula, scaled by the dice count the attack was rolled at
  const { level, ...chatOptions } = options;
  const formula = weapon.system.getDamageFormula(level || 0);
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
    sourceName: weapon.name,
    total: roll.total,
    formula: formula,
    showFormula: chatOptions.showFormula !== false
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
    ...chatOptions
  };

  return ChatMessage.create(chatData);
}

/**
 * Roll offensive spell damage and send to chat. Mirrors rollWeaponDamage - the cast roll
 * (Actor#rollSpell) already determined whether the spell landed; this is just the amount.
 * @param {Actor} actor - The actor rolling damage
 * @param {string} spellId - The ID of the spell to roll damage for
 * @param {Object} options - Additional options
 * @param {number} options.level - Dice count the spell was cast at; scales up the damage
 *   dice on top of the spell's own base (see dccworldSpell#getDamageFormula)
 */
export async function rollSpellDamage(actor, spellId, options = {}) {
  const spell = actor.items.get(spellId);

  if (!spell || spell.type !== 'spell') {
    ui.notifications.error('Spell not found!');
    return null;
  }

  if (!spell.system.offensive) {
    ui.notifications.warn(`${spell.name} is not an offensive spell!`);
    return null;
  }

  // Get the damage formula, scaled by the dice count the spell was cast at
  const { level, ...chatOptions } = options;
  const formula = spell.system.getDamageFormula(level || 0);
  if (!formula) {
    ui.notifications.warn(`${spell.name} has no damage formula!`);
    return null;
  }

  // Roll the damage using actor's roll data
  const rollData = actor.getRollData();
  const roll = await new Roll(formula, rollData).evaluate();

  // Prepare template data
  const templateData = {
    actorName: actor.name,
    sourceName: spell.name,
    total: roll.total,
    formula: formula,
    showFormula: chatOptions.showFormula !== false
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
    ...chatOptions
  };

  return ChatMessage.create(chatData);
}

/**
 * Regenerate missing HP/Stamina/Mana at the start of a character's turn.
 * Each resource rolls 1d6 + its ability modifier (minimum 0) + LUK, capped at the
 * amount missing - see Rules/Resources/{Health,Stamina,Mana} Points.md.
 * @param {Actor} actor - The character regenerating resources
 * @returns {Promise<Array|null>} Regen results per resource, or null if not a character
 */
export async function rollResourceRegen(actor) {
  if (actor.type !== 'character') {
    ui.notifications.warn("Only characters regenerate resources this way.");
    return null;
  }

  const luck = actor.system.luck?.total || 0;
  const resources = [
    { key: 'hp', label: 'HP', abilityKey: 'con' },
    { key: 'stamina', label: 'Stamina', abilityKey: 'str' },
    { key: 'mana', label: 'Mana', abilityKey: 'int' }
  ];

  // Active potion regen boosts (see Actor#useItem in documents/actor.mjs). Every boost
  // decrements one use per Regen regardless of whether that resource was already full -
  // "lasts N regens" is a flat count, not tied to whether it happened to matter.
  const activeBoosts = actor.system.consumables?.regenBoosts || [];
  const boostFor = (key) => activeBoosts
    .filter(b => b.resource === key)
    .reduce((sum, b) => sum + b.amount, 0);
  const remainingBoosts = activeBoosts
    .map(b => ({ ...b, usesRemaining: b.usesRemaining - 1 }))
    .filter(b => b.usesRemaining > 0);

  const results = [];
  for (const { key, label, abilityKey } of resources) {
    const resource = actor.system[key];
    const missing = resource.max - resource.value;
    const boost = boostFor(key);

    if (missing <= 0) {
      results.push({ key, label, roll: null, gained: 0, newValue: resource.value, max: resource.max });
      continue;
    }

    const abilityMod = Math.max(0, actor.system.abilities[abilityKey]?.mod || 0);
    const roll = await new Roll('1d6').evaluate();
    const gained = Math.min(missing, Math.max(0, roll.total + abilityMod + luck + boost));

    results.push({ key, label, roll, abilityMod, boost, gained, newValue: resource.value + gained, max: resource.max });
  }

  await actor.update({
    'system.hp.value': results.find(r => r.key === 'hp').newValue,
    'system.stamina.value': results.find(r => r.key === 'stamina').newValue,
    'system.mana.value': results.find(r => r.key === 'mana').newValue,
    // Reaching a Regen roll is this system's stand-in for "a round has passed" (no real
    // round tracker - combat is card-based and AI-narrated), so this is where the potion
    // cooldown clears.
    'system.consumables.potionOnCooldown': false,
    'system.consumables.regenBoosts': remainingBoosts
  });

  const rows = results.map(r => {
    if (!r.roll) {
      return `<div class="regen-row full"><span class="regen-label">${r.label}</span><span class="regen-detail">Already full (${r.max}/${r.max})</span></div>`;
    }
    const dieResult = r.roll.terms[0].results[0].result;
    const parts = [`${dieResult}`];
    if (r.abilityMod) parts.push(`+${r.abilityMod}`);
    if (luck) parts.push(`${luck >= 0 ? '+' : ''}${luck}`);
    if (r.boost) parts.push(`+${r.boost} (potion)`);
    return `<div class="regen-row">
      <span class="regen-label">${r.label}</span>
      <span class="regen-detail">${parts.join(' ')} = <strong>+${r.gained}</strong> (${r.newValue}/${r.max})</span>
    </div>`;
  }).join('');

  const content = `
    <div class="dcc-world-roll regen-roll">
      <h3><i class="fas fa-heart"></i> ${actor.name} - Start of Turn Regen</h3>
      ${rows}
    </div>
  `;

  const rolls = results.map(r => r.roll).filter(Boolean);

  await ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    sound: CONFIG.sounds.dice,
    rolls
  });

  return results;
}

/**
 * Initialize chat message listeners for damage roll buttons
 * Call this during system initialization
 */
export function initializeChatListeners() {
  Hooks.on('renderChatMessage', (message, html) => {
    // Add click handler for weapon damage roll buttons
    html.find('.damage-roll-button').click(async (event) => {
      event.preventDefault();
      const button = $(event.currentTarget);
      const actorId = button.data('actor-id');
      const weaponId = button.data('weapon-id');
      const level = parseInt(button.data('level')) || 0;

      // Get the actor
      const actor = game.actors.get(actorId);
      if (!actor) {
        ui.notifications.error('Actor not found!');
        return;
      }

      // Roll the damage, scaled by the dice count the attack was rolled at
      await rollWeaponDamage(actor, weaponId, { level });
    });

    // Add click handler for offensive spell damage roll buttons
    html.find('.spell-damage-roll-button').click(async (event) => {
      event.preventDefault();
      const button = $(event.currentTarget);
      const actorId = button.data('actor-id');
      const spellId = button.data('spell-id');
      const level = parseInt(button.data('level')) || 0;

      // Get the actor
      const actor = game.actors.get(actorId);
      if (!actor) {
        ui.notifications.error('Actor not found!');
        return;
      }

      // Roll the damage, scaled by the dice count the spell was cast at
      await rollSpellDamage(actor, spellId, { level });
    });
  });
}
