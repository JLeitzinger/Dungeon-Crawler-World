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

  // Build dice display
  const diceDisplay = dice.map(d => {
    const isSix = d === 6;
    return `<span class="die d6 ${isSix ? 'max' : ''}" data-value="${d}">${d}</span>`;
  }).join(' ');

  // Build the chat message content
  const content = `
    <div class="dcc-world-roll skill-check-roll">
      <div class="roll-header">
        <h3>${skillName}</h3>
        <span class="skill-level">Level ${skillLevel}</span>
      </div>
      <div class="dice-pool">
        <div class="dice-results">
          ${diceDisplay}
        </div>
        <div class="roll-breakdown">
          <div class="dice-total">${diceTotal} (dice)</div>
          ${statModifier !== 0 ? `<div class="stat-bonus">${statModifier > 0 ? '+' : ''}${statModifier} (stat)</div>` : ''}
          <div class="final-total"><strong>Total: ${total}</strong></div>
        </div>
      </div>
      ${allSixes ? '<div class="skill-improvement"><strong>⚡ All 6s! Skill can improve!</strong></div>' : ''}
    </div>
  `;

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
